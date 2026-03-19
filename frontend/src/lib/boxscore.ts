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
    const sortedPlays = [...plays].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const play of sortedPlays) {
        const isTop = play.half === 'top';
        const battingBox = isTop ? awayBox : homeBox;
        
        // Update runs by inning
        const inn = play.inning;
        if (!battingBox.runsByInning[inn]) battingBox.runsByInning[inn] = 0;
        battingBox.runsByInning[inn] += play.runs_scored;
        battingBox.totalRuns += play.runs_scored;

        // Find batter
        const batter = battingBox.lineup.find(b => b.playerId === play.batter_id);
        if (batter) {
            const isRunOnly = play.result === 'WP_RUN' || play.result === 'RUN_SCORED';
            if (isRunOnly) {
                batter.runs += 1;
                // Add to previous play if exists (simplified)
                continue;
            }

            const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH'].includes(play.result);
            if (isAtBat) batter.atBats++;

            if (['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'].includes(play.result)) {
                batter.hits++;
                battingBox.totalHits++;
            }
            if (play.result === 'BB') batter.bb++;
            if (play.result.startsWith('K')) batter.so++;
            batter.rbi += play.rbi || 0;
            batter.runs += play.runs_scored || 0;

            if (!batter.plays[inn]) batter.plays[inn] = [];
            batter.plays[inn].push({
                inning: inn,
                result: play.result,
                outsRecorded: play.outs_recorded || 0,
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
