import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    console.log("Starting player_stats migration from API Route...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: "Missing Env" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all finished games
    const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'finished');

    if (gamesError) {
        return NextResponse.json({ error: gamesError }, { status: 500 });
    }

    if (!games || games.length === 0) {
        return NextResponse.json({ message: "No finished games found." });
    }

    console.log(`Found ${games.length} finished game(s). Fetching plays...`);

    // 2. Fetch all plays for these games
    const gameIds = games.map(g => g.id);
    const { data: plays, error: playsError } = await supabase
        .from('plays')
        .select('*')
        .in('game_id', gameIds);

    if (playsError) {
        return NextResponse.json({ error: playsError }, { status: 500 });
    }

    console.log(`Found ${plays?.length || 0} plays. Processing stats...`);

    const statsMap: Record<string, any> = {};

    const initStat = (playerId: string, teamId: string, tournamentId: string) => {
        const key = `${playerId}_${teamId}_${tournamentId}`;
        if (!statsMap[key]) {
            statsMap[key] = {
                player_id: playerId,
                team_id: teamId,
                tournament_id: tournamentId,
                games_played: 0,
                at_bats: 0, runs: 0, hits: 0, h2: 0, h3: 0, hr: 0, rbi: 0, bb: 0, so: 0, hbp: 0, sac: 0,
                wins: 0, losses: 0, ip_outs: 0, h_allowed: 0, er_allowed: 0, bb_allowed: 0, so_pitching: 0
            };
        }
        return statsMap[key];
    };

    const gamesDict: Record<string, any> = {};
    games.forEach(g => gamesDict[g.id] = g);

    if (plays) {
        plays.forEach((play) => {
            const game = gamesDict[play.game_id];
            if (!game) return;

            const isTop = play.half === 'top';
            const battingTeamId = isTop ? game.away_team_id : game.home_team_id;
            const pitchingTeamId = isTop ? game.home_team_id : game.away_team_id;
            const tournamentId = game.tournament_id;

            // Batting
            if (play.batter_id) {
                const batter = initStat(play.batter_id, battingTeamId, tournamentId);
                const result = (play.result || '').toUpperCase();
                const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'INT'].includes(result);
                if (isAtBat) batter.at_bats++;
                
                if (['H1', '1B'].includes(result)) batter.hits++;
                else if (['H2', '2B'].includes(result)) { batter.hits++; batter.h2++; }
                else if (['H3', '3B'].includes(result)) { batter.hits++; batter.h3++; }
                else if (['HR', 'H4'].includes(result)) { batter.hits++; batter.hr++; }
                
                if (result === 'BB') batter.bb++;
                if (result === 'HBP') batter.hbp++;
                if (['SAC', 'SF', 'SH'].includes(result)) batter.sac++;
                if (result.startsWith('K')) batter.so++;
                batter.rbi += (play.rbi || 0);
                batter.runs += (play.runs_scored || 0);
            }

            // Pitching
            if (play.pitcher_id) {
                const pitcher = initStat(play.pitcher_id, pitchingTeamId, tournamentId);
                pitcher.ip_outs += (play.outs_recorded || 0);
                const result = (play.result || '').toUpperCase();
                if (['H1', '1B', 'H2', '2B', 'H3', '3B', 'HR', 'H4'].includes(result)) pitcher.h_allowed++;
                if (result === 'BB') pitcher.bb_allowed++;
                if (result.startsWith('K')) pitcher.so_pitching++;
                pitcher.er_allowed += (play.runs_scored || 0);
            }
        });
    }

    // Process Wins & Games Played
    games.forEach(g => {
        // Any player who was in a play for this game gets +1 game played
        const gamePlayers = new Set<string>();
        plays?.filter(p => p.game_id === g.id).forEach(p => {
            if (p.batter_id) gamePlayers.add(`${p.batter_id}_${p.half === 'top' ? g.away_team_id : g.home_team_id}`);
            if (p.pitcher_id) gamePlayers.add(`${p.pitcher_id}_${p.half === 'top' ? g.home_team_id : g.away_team_id}`);
        });

        gamePlayers.forEach(composite => {
            const [pid, tid] = composite.split('_');
            const stat = initStat(pid, tid, g.tournament_id);
            stat.games_played++;
        });

        if (g.winning_pitcher_id) {
            const isHomeWin = g.home_score > g.away_score;
            const winningTeamId = isHomeWin ? g.home_team_id : g.away_team_id;
            const winningPitcher = initStat(g.winning_pitcher_id, winningTeamId, g.tournament_id);
            winningPitcher.wins++;
        }
    });

    const finalStatsArray = Object.values(statsMap);
    console.log(`Prepared ${finalStatsArray.length} aggregated player stat rows for UPSERT.`);

    if (finalStatsArray.length > 0) {
        const { error: upsertError } = await supabase
            .from('player_stats')
            .upsert(finalStatsArray, { onConflict: 'player_id, team_id, tournament_id' });
        
        if (upsertError) {
            return NextResponse.json({ error: upsertError }, { status: 500 });
        }
    }

    return NextResponse.json({ message: "Migration completed successfully!", count: finalStatsArray.length });
}
