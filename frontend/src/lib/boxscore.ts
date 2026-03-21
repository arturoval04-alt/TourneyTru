import { GameBoxscoreDto, BoxscoreTeam, BoxscoreBatterProps } from '@/types/boxscore';

export function calculateBoxscore(gameId: string, homeTeam: any, awayTeam: any, lineups: any[], plays: any[]): GameBoxscoreDto {
    const homeLp = lineups.filter(l => l.team_id === homeTeam.id).sort((a,b) => a.batting_order - b.batting_order);
    const awayLp = lineups.filter(l => l.team_id === awayTeam.id).sort((a,b) => a.batting_order - b.batting_order);

    const initTeam = (team: any, lineup: any[]): BoxscoreTeam => ({
        teamId: team.id,
        teamName: team.name,
        lineup: lineup.map(l => ({
            playerId: l.player_id,
            firstName: l.player?.first_name || 'Desconocido',
            lastName: l.player?.last_name || '',
            position: l.position,
            battingOrder: l.batting_order,
            atBats: 0,
            runs: 0,
            hits: 0,
            rbi: 0,
            bb: 0,
            so: 0,
            pitchingHits: 0,
            pitchingRuns: 0,
            pitchingBB: 0,
            pitchingSO: 0,
            pitchingIPOuts: 0,
            plays: {}
        })),
        runsByInning: {},
        totalRuns: 0,
        totalHits: 0,
        totalErrors: 0
    });

    const homeBox = initTeam(homeTeam, homeLp);
    const awayBox = initTeam(awayTeam, awayLp);

    // Sort plays by time
    const sortedPlays = [...plays].sort((a,b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime());

    for (const play of sortedPlays) {
        const rawResult = (play.result || '').toUpperCase();
        // Support code|description format
        const resCode = rawResult.includes('|') ? rawResult.split('|')[0] : rawResult;
        
        const isTop = play.half === 'top';
        const battingBox = isTop ? awayBox : homeBox;
        const fieldingBox = isTop ? homeBox : awayBox;
        
        // Update runs by inning
        const inn = play.inning;
        if (!battingBox.runsByInning[inn]) battingBox.runsByInning[inn] = 0;
        battingBox.runsByInning[inn] += play.runs_scored;
        battingBox.totalRuns += play.runs_scored;

        // Find pitcher and update stats
        const pitcher = fieldingBox.lineup.find(p => p.playerId === play.pitcher_id);
        if (pitcher) {
            if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(resCode)) {
                pitcher.pitchingHits = (pitcher.pitchingHits || 0) + 1;
            }
            if (resCode === 'BB') pitcher.pitchingBB = (pitcher.pitchingBB || 0) + 1;
            if (resCode.startsWith('K')) pitcher.pitchingSO = (pitcher.pitchingSO || 0) + 1;
            pitcher.pitchingRuns = (pitcher.pitchingRuns || 0) + (play.runs_scored || 0);
            pitcher.pitchingIPOuts = (pitcher.pitchingIPOuts || 0) + (play.outs_recorded || 0);
        }

        // Find batter
        const batter = battingBox.lineup.find(b => b.playerId === play.batter_id);
        if (batter) {
            const isRunOnly = resCode === 'WP_RUN' || resCode === 'RUN_SCORED';
            if (isRunOnly) {
                batter.runs += 1;
                // Add to previous play if exists (simplified)
                continue;
            }

            const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'INT'].includes(resCode);
            if (isAtBat) batter.atBats++;

            if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(resCode)) {
                batter.hits++;
                battingBox.totalHits++;
            }
            if (resCode === 'BB') batter.bb++;
            if (resCode.startsWith('K')) batter.so++;
            batter.rbi += play.rbi || 0;
            batter.runs += play.runs_scored || 0;

            if (!batter.plays[inn]) batter.plays[inn] = [];
            batter.plays[inn].push({
                inning: inn,
                result: resCode, // Usamos el código para el boxscore
                outsRecorded: play.outs_recorded || 0,
                outsBeforePlay: play.outs_before_play,
                runsScored: play.runs_scored || 0,
                rbi: play.rbi || 0
            });
        }
    }

    return {
        gameId,
        status: 'in_progress',
        homeTeam: homeBox,
        awayTeam: awayBox
    };
}
