import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateStats() {
    console.log("Starting player_stats migration for finished games...");

    // 1. Get all finished games
    const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'finished');

    if (gamesError) {
        console.error("Error fetching games:", gamesError);
        return;
    }

    if (!games || games.length === 0) {
        console.log("No finished games found to migrate.");
        return;
    }

    console.log(`Found ${games.length} finished game(s). Fetching plays...`);

    // 2. Fetch all plays for these games
    const gameIds = games.map(g => g.id);
    const { data: plays, error: playsError } = await supabase
        .from('plays')
        .select('*')
        .in('game_id', gameIds);

    if (playsError) {
        console.error("Error fetching plays:", playsError);
        return;
    }

    console.log(`Found ${plays?.length || 0} plays. Processing stats...`);

    // We will accumulate ALL stats for this backfill in memory since it handles everything at once
    const statsMap = {}; // key: "playerId_teamId_tournamentId"

    const initStat = (playerId, teamId, tournamentId) => {
        const key = `${playerId}_${teamId}_${tournamentId}`;
        if (!statsMap[key]) {
            statsMap[key] = {
                player_id: playerId,
                team_id: teamId,
                tournament_id: tournamentId,
                at_bats: 0, runs: 0, hits: 0, h2: 0, h3: 0, hr: 0, rbi: 0, bb: 0, so: 0, hbp: 0, sac: 0,
                wins: 0, losses: 0, ip_outs: 0, h_allowed: 0, er_allowed: 0, bb_allowed: 0, so_pitching: 0
            };
        }
        return statsMap[key];
    };

    // Dictionary for fast game lookup
    const gamesDict = {};
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
                const result = play.result;
                const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'INT'].includes(result);
                if (isAtBat) batter.at_bats++;
                
                if (['H1', '1B'].includes(result)) batter.hits++;
                else if (['H2', '2B'].includes(result)) { batter.hits++; batter.h2++; }
                else if (['H3', '3B'].includes(result)) { batter.hits++; batter.h3++; }
                else if (['HR'].includes(result)) { batter.hits++; batter.hr++; }
                
                if (result === 'BB') batter.bb++;
                if (result === 'HBP') batter.hbp++;
                if (['SAC', 'SF', 'SH'].includes(result)) batter.sac++;
                if (result?.startsWith('K')) batter.so++;
                batter.rbi += (play.rbi || 0);
                batter.runs += (play.runs_scored || 0);
            }

            // Pitching
            if (play.pitcher_id) {
                const pitcher = initStat(play.pitcher_id, pitchingTeamId, tournamentId);
                pitcher.ip_outs += (play.outs_recorded || 0);
                const result = play.result;
                if (['H1', '1B', 'H2', '2B', 'H3', '3B', 'HR'].includes(result)) pitcher.h_allowed++;
                if (result === 'BB') pitcher.bb_allowed++;
                if (result?.startsWith('K')) pitcher.so_pitching++;
                pitcher.er_allowed += (play.runs_scored || 0);
            }
        });
    }

    // Process Wins
    games.forEach(g => {
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
        const { data, error: upsertError } = await supabase
            .from('player_stats')
            .upsert(finalStatsArray, { onConflict: 'player_id, team_id, tournament_id' });
        
        if (upsertError) {
            console.error("Error upserting stats:", upsertError);
        } else {
            console.log("Migration completed successfully!");
        }
    }
}

migrateStats();
