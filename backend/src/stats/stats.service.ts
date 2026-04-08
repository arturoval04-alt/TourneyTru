import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HIT_RESULTS = ['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'];
const NON_AB_RESULTS = ['BB', 'IBB', 'HBP', 'SAC', 'WP', 'PB', 'SF', 'SH', 'SB', 'CS', 'ADV', 'WP_RUN', 'PB_RUN', 'BK_RUN', 'RUN_SCORED', 'RUNNER_OUT'];
const NON_PA_RESULTS = ['SB', 'CS', 'ADV', 'WP_RUN', 'PB_RUN', 'BK_RUN', 'RUN_SCORED', 'RUNNER_OUT'];

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService) {}

    async getStatsConfig(tournamentId: string): Promise<{ minAB: number; minIPOuts: number }> {
        const t = await (this.prisma.tournament.findUnique as any)({
            where: { id: tournamentId },
            select: { minAB: true, minIPOuts: true },
        });
        return { minAB: t?.minAB ?? 0, minIPOuts: t?.minIPOuts ?? 0 };
    }

    async getBattingLeaderboard(tournamentId: string) {
        const { minAB } = await this.getStatsConfig(tournamentId);

        const plays = await this.prisma.play.findMany({
            where: {
                game: { tournamentId, status: 'finished' },
                result: { not: { in: ['WP_RUN', 'RUN_SCORED'] } },
            },
            include: {
                batter: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        photoUrl: true,
                        rosterEntries: {
                            where: { tournamentId, isActive: true },
                            select: { team: { select: { id: true, name: true, shortName: true } } },
                            take: 1,
                        },
                    },
                },
            },
        } as any);

        const map: Record<string, {
            playerId: string; firstName: string; lastName: string; photoUrl: string | null;
            teamId: string; teamName: string; teamShortName: string;
            ab: number; h: number; h2: number; h3: number; hr: number;
            r: number; rbi: number; bb: number; ibb: number; so: number; hbp: number; sf: number; sh: number;
            sb: number; cs: number; roe: number; gp: Set<string>; gs: number;
        }> = {};

        const lineups = await this.prisma.lineup.findMany({
            where: { game: { tournamentId, status: 'finished' }, isStarter: true },
            select: { playerId: true }
        });
        const gsMap: Record<string, number> = {};
        for (const l of lineups) gsMap[l.playerId] = (gsMap[l.playerId] || 0) + 1;

        for (const play of (plays as any[])) {
            const b = play.batter;
            if (!b) continue;
            const team = b.rosterEntries?.[0]?.team;
            if (!map[b.id]) {
                map[b.id] = {
                    playerId: b.id,
                    firstName: b.firstName,
                    lastName: b.lastName,
                    photoUrl: b.photoUrl ?? null,
                    teamId: team?.id ?? '',
                    teamName: team?.name ?? '',
                    teamShortName: team?.shortName || (team?.name ?? '').substring(0, 2).toUpperCase(),
                    ab: 0, h: 0, h2: 0, h3: 0, hr: 0,
                    r: 0, rbi: 0, bb: 0, ibb: 0, so: 0, hbp: 0, sf: 0, sh: 0,
                    sb: 0, cs: 0, roe: 0, gp: new Set(), gs: gsMap[b.id] || 0,
                };
            }
            const s = map[b.id];
            s.gp.add(play.gameId);

            const res = play.result.split('|')[0].toUpperCase();
            if (!NON_AB_RESULTS.includes(res)) s.ab += 1;
            if (HIT_RESULTS.includes(res)) s.h += 1;
            if (res === 'H2' || res === '2B') s.h2 += 1;
            if (res === 'H3' || res === '3B') s.h3 += 1;
            if (res === 'HR') s.hr += 1;
            if (res === 'BB') s.bb += 1;
            if (res === 'IBB') { s.bb += 1; s.ibb += 1; }
            if (res === 'HBP') s.hbp += 1;
            if (res === 'SF') s.sf += 1;
            if (res === 'SH') s.sh += 1;
            if (res === 'SB') s.sb += 1;
            if (res === 'CS') s.cs += 1;
            if (res.startsWith('K')) s.so += 1;
            if (res.match(/^E\d$/)) s.roe += 1;
            s.rbi += play.rbi;
            s.r += play.runsScored;
        }

        return Object.values(map)
            .map(s => {
                const gp = s.gp.size;
                const singles = s.h - s.h2 - s.h3 - s.hr;
                const tb = singles + s.h2 * 2 + s.h3 * 3 + s.hr * 4;
                const pa = s.ab + s.bb + s.hbp + s.sf + s.sh;
                const avg = s.ab > 0 ? (s.h / s.ab).toFixed(3) : '.000';
                const obp = pa > 0 ? ((s.h + s.bb + s.hbp) / (s.ab + s.bb + s.hbp + s.sf)).toFixed(3) : '.000';
                const slg = s.ab > 0 ? (tb / s.ab).toFixed(3) : '.000';
                const ops = (parseFloat(obp) + parseFloat(slg)).toFixed(3);
                return {
                    ...s,
                    gp, pa, tb,
                    avg, obp, slg, ops,
                    qualified: minAB === 0 || s.ab >= minAB,
                };
            })
            .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg) || b.h - a.h);
    }

    async getPitchingLeaderboard(tournamentId: string) {
        const { minIPOuts } = await this.getStatsConfig(tournamentId);

        const plays = await this.prisma.play.findMany({
            where: {
                game: { tournamentId, status: 'finished' },
            },
            include: {
                pitcher: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        photoUrl: true,
                        rosterEntries: {
                            where: { tournamentId, isActive: true },
                            select: { team: { select: { id: true, name: true, shortName: true } } },
                            take: 1,
                        },
                    },
                },
            },
        } as any);

        const map: Record<string, {
            playerId: string; firstName: string; lastName: string; photoUrl: string | null;
            teamId: string; teamName: string; teamShortName: string;
            outs: number; h: number; r: number; er: number; bb: number; so: number; hr: number;
            hbp: number; bf: number; wp: number; bk: number; gp: Set<string>; gs: number;
        }> = {};

        const lineups = await this.prisma.lineup.findMany({
            where: { game: { tournamentId, status: 'finished' }, isStarter: true, position: 'P' },
            select: { playerId: true }
        });
        const gsMap: Record<string, number> = {};
        for (const l of lineups) gsMap[l.playerId] = (gsMap[l.playerId] || 0) + 1;

        for (const play of (plays as any[])) {
            const p = play.pitcher;
            if (!p) continue;
            const team = p.rosterEntries?.[0]?.team;
            if (!map[p.id]) {
                map[p.id] = {
                    playerId: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    photoUrl: p.photoUrl ?? null,
                    teamId: team?.id ?? '',
                    teamName: team?.name ?? '',
                    teamShortName: team?.shortName || (team?.name ?? '').substring(0, 2).toUpperCase(),
                    outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0, hbp: 0, bf: 0, wp: 0, bk: 0, gp: new Set(), gs: gsMap[p.id] || 0,
                };
            }
            const s = map[p.id];
            s.gp.add(play.gameId);
            const res = play.result.split('|')[0].toUpperCase();
            s.outs += play.outsRecorded;
            // Only count plate-appearance results toward BF
            if (!NON_PA_RESULTS.includes(res)) s.bf += 1;
            if (HIT_RESULTS.includes(res)) s.h += 1;
            if (res === 'HR') s.hr += 1;
            s.r += play.runsScored;
            // Earned runs: only count runs NOT flagged as unearned (PB, errors, etc.)
            const isUnearned = play.result.toUpperCase().includes('UNEARNED') || res === 'PB_RUN';
            if (!isUnearned) s.er += play.runsScored;
            if (res === 'BB' || res === 'IBB') s.bb += 1;
            if (res === 'HBP') s.hbp += 1;
            if (res.startsWith('K')) s.so += 1;
            if (res === 'WP' || res === 'WP_RUN') s.wp += 1;
            if (res === 'BK' || res === 'BK_RUN') s.bk += 1;
        }

        // Compute QS / CG / SHO from per-game pitcher performance
        // perGame[gameId][half][pitcherId] = { outs, er, r }
        const perGame: Record<string, Record<string, Record<string, { outs: number; er: number; r: number }>>> = {};
        for (const play of plays as any[]) {
            const gid = play.gameId;
            const half = play.half as string;
            const pid = play.pitcher.id;
            if (!perGame[gid]) perGame[gid] = {};
            if (!perGame[gid][half]) perGame[gid][half] = {};
            if (!perGame[gid][half][pid]) perGame[gid][half][pid] = { outs: 0, er: 0, r: 0 };
            const res = play.result.split('|')[0].toUpperCase();
            const isUnearned = play.result.toUpperCase().includes('UNEARNED') || res === 'PB_RUN';
            perGame[gid][half][pid].outs += play.outsRecorded;
            perGame[gid][half][pid].r += play.runsScored;
            if (!isUnearned) perGame[gid][half][pid].er += play.runsScored;
        }

        const qsCounts: Record<string, number> = {};
        const cgCounts: Record<string, number> = {};
        const shoCounts: Record<string, number> = {};
        for (const halfMap of Object.values(perGame)) {
            for (const pitcherMap of Object.values(halfMap)) {
                const pitcherGameIds = Object.keys(pitcherMap);
                // CG: only one pitcher threw all innings from one side
                if (pitcherGameIds.length === 1) {
                    const pid = pitcherGameIds[0];
                    const { outs, er, r } = pitcherMap[pid];
                    if (outs >= 18) { // at least 6 complete innings
                        cgCounts[pid] = (cgCounts[pid] || 0) + 1;
                        if (r === 0) shoCounts[pid] = (shoCounts[pid] || 0) + 1;
                    }
                    // QS: ≥18 outs AND ≤3 ER
                    if (outs >= 18 && er <= 3) qsCounts[pid] = (qsCounts[pid] || 0) + 1;
                } else {
                    // Multiple pitchers — still check individual QS
                    for (const [pid, stats] of Object.entries(pitcherMap)) {
                        if (stats.outs >= 18 && stats.er <= 3) qsCounts[pid] = (qsCounts[pid] || 0) + 1;
                    }
                }
            }
        }

        // Compute wins and losses per pitcher from game decision fields
        const winCounts: Record<string, number> = {};
        const lossCounts: Record<string, number> = {};
        const saveCounts: Record<string, number> = {};
        const pitcherIds = Object.keys(map);
        if (pitcherIds.length > 0) {
            const decidedGames = await this.prisma.game.findMany({
                where: {
                    tournamentId,
                    status: 'finished',
                    OR: [
                        { winningPitcherId: { in: pitcherIds } },
                        { losingPitcherId: { in: pitcherIds } } as any,
                        { savePitcherId: { in: pitcherIds } } as any,
                    ],
                },
                select: { winningPitcherId: true, losingPitcherId: true, savePitcherId: true } as any,
            });
            for (const g of decidedGames as any[]) {
                if (g.winningPitcherId) winCounts[g.winningPitcherId] = (winCounts[g.winningPitcherId] || 0) + 1;
                if (g.losingPitcherId) lossCounts[g.losingPitcherId] = (lossCounts[g.losingPitcherId] || 0) + 1;
                if (g.savePitcherId) saveCounts[g.savePitcherId] = (saveCounts[g.savePitcherId] || 0) + 1;
            }
        }

        return Object.values(map)
            .map(s => {
                const ip = Math.floor(s.outs / 3) + (s.outs % 3) / 10;
                const ipFull = s.outs / 3;
                const era = ipFull > 0 ? ((s.er / ipFull) * 9).toFixed(2) : '-.--';
                const w = winCounts[s.playerId] || 0;
                const l = lossCounts[s.playerId] || 0;
                const sv = saveCounts[s.playerId] || 0;
                const gp = s.gp.size;
                // Advanced metrics
                const whip = ipFull > 0 ? ((s.bb + s.h) / ipFull).toFixed(2) : '-.--';
                const k9 = ipFull > 0 ? ((s.so / ipFull) * 9).toFixed(1) : '0.0';
                const bb9 = ipFull > 0 ? ((s.bb / ipFull) * 9).toFixed(1) : '0.0';
                const kbb = s.bb > 0 ? (s.so / s.bb).toFixed(2) : '-.--';
                const hr9 = ipFull > 0 ? ((s.hr / ipFull) * 9).toFixed(1) : '0.0';
                const baa = (s.bf - s.bb - s.hbp) > 0 ? (s.h / (s.bf - s.bb - s.hbp)).toFixed(3) : '.000';
                return {
                    ...s,
                    gp,
                    ipOuts: s.outs,
                    ip: ip.toFixed(1),
                    era, whip, k9, bb9, kbb, hr9, baa,
                    w, l, sv,
                    qs: qsCounts[s.playerId] || 0,
                    cg: cgCounts[s.playerId] || 0,
                    sho: shoCounts[s.playerId] || 0,
                    qualified: minIPOuts === 0 || s.outs >= minIPOuts,
                };
            })
            .sort((a, b) => parseFloat(a.era) - parseFloat(b.era));
    }

    async getPlayerStats(playerId: string, tournamentId?: string) {
        const where: any = {
            batterId: playerId,
            result: { not: { in: ['WP_RUN', 'RUN_SCORED'] } },
        };
        if (tournamentId) {
            where.game = { tournamentId, status: 'finished' };
        }

        const plays = await this.prisma.play.findMany({ where });

        let ab = 0, h = 0, doubles = 0, triples = 0, hr = 0, r = 0, rbi = 0, bb = 0, so = 0, hbp = 0, sf = 0, sb = 0, cs = 0;
        const gameSet = new Set<string>();

        for (const play of plays) {
            gameSet.add(play.gameId);
            const res = play.result.split('|')[0].toUpperCase();
            if (!NON_AB_RESULTS.includes(res)) ab += 1;
            if (HIT_RESULTS.includes(res)) h += 1;
            if (res === 'H2' || res === '2B') doubles += 1;
            if (res === 'H3' || res === '3B') triples += 1;
            if (res === 'HR') hr += 1;
            if (res === 'BB' || res === 'IBB') bb += 1;
            if (res === 'HBP') hbp += 1;
            if (res === 'SF') sf += 1;
            if (res === 'SB') sb += 1;
            if (res === 'CS') cs += 1;
            if (res.startsWith('K') || res === 'KWP') so += 1;
            rbi += play.rbi;
            r += play.runsScored;
        }

        const singles = h - doubles - triples - hr;
        const tb = singles + doubles * 2 + triples * 3 + hr * 4;
        const pa = ab + bb + hbp + sf;
        const avg = ab > 0 ? (h / ab).toFixed(3) : '.000';
        const obp = pa > 0 ? ((h + bb + hbp) / (ab + bb + hbp + sf)).toFixed(3) : '.000';
        const slg = ab > 0 ? (tb / ab).toFixed(3) : '.000';
        const ops = (parseFloat(obp) + parseFloat(slg)).toFixed(3);

        return {
            playerId,
            gp: gameSet.size,
            ab, h, doubles, triples, hr, r, rbi, bb, so, hbp, sf, sb, cs,
            pa, tb,
            avg, obp, slg, ops,
        };
    }

    // ─── STANDINGS ──────────────────────────────────────────────────────────────

    async getStandings(tournamentId: string) {
        const standings = await this.prisma.standing.findMany({
            where: { tournamentId },
            include: { team: { select: { id: true, name: true, shortName: true, logoUrl: true } } },
            orderBy: [{ wins: 'desc' }, { losses: 'asc' }, { runsFor: 'desc' }],
        });

        if (!standings.length) return [];

        const leaderWins = standings[0].wins;
        const leaderLosses = standings[0].losses;

        return standings.map(s => {
            const gp = s.wins + s.losses + s.ties;
            const pct = gp > 0 ? (s.wins / gp).toFixed(3).replace(/^0/, '') : '.000';
            const gb = ((leaderWins - s.wins) + (s.losses - leaderLosses)) / 2;
            return {
                teamId: s.teamId,
                name: s.team.name,
                shortName: s.team.shortName,
                logoUrl: s.team.logoUrl,
                w: s.wins,
                l: s.losses,
                t: s.ties,
                gp, 
                pct,
                gb: gb === 0 ? '-' : gb.toString(),
                rs: s.runsFor,
                ra: s.runsAgainst,
                streak: s.streak,
            };
        });
    }

    async recalculateStandings(tournamentId: string) {
        // Get all finished games for this tournament
        const games = await this.prisma.game.findMany({
            where: { tournamentId, status: 'finished' },
            select: {
                homeTeamId: true,
                awayTeamId: true,
                homeScore: true,
                awayScore: true,
            },
        });

        // Get all teams in the tournament
        const teams = await this.prisma.team.findMany({
            where: { tournamentId },
            select: { id: true },
        });

        // Build standings map
        const standings: Record<string, { wins: number; losses: number; ties: number; runsFor: number; runsAgainst: number; results: string[] }> = {};
        for (const team of teams) {
            standings[team.id] = { wins: 0, losses: 0, ties: 0, runsFor: 0, runsAgainst: 0, results: [] };
        }

        for (const game of games) {
            const home = standings[game.homeTeamId];
            const away = standings[game.awayTeamId];
            if (!home || !away) continue;

            home.runsFor += game.homeScore;
            home.runsAgainst += game.awayScore;
            away.runsFor += game.awayScore;
            away.runsAgainst += game.homeScore;

            if (game.homeScore > game.awayScore) {
                home.wins += 1; home.results.push('W');
                away.losses += 1; away.results.push('L');
            } else if (game.awayScore > game.homeScore) {
                away.wins += 1; away.results.push('W');
                home.losses += 1; home.results.push('L');
            } else {
                home.ties += 1; home.results.push('T');
                away.ties += 1; away.results.push('T');
            }
        }

        // Calculate streak from last N results
        const calcStreak = (results: string[]): string => {
            if (results.length === 0) return '-';
            const last = results[results.length - 1];
            let count = 0;
            for (let i = results.length - 1; i >= 0; i--) {
                if (results[i] === last) count++;
                else break;
            }
            return `${last}${count}`;
        };

        // Upsert standings for each team
        const upserts = Object.entries(standings).map(([teamId, s]) =>
            this.prisma.standing.upsert({
                where: { teamId_tournamentId: { teamId, tournamentId } },
                create: {
                    teamId,
                    tournamentId,
                    wins: s.wins,
                    losses: s.losses,
                    ties: s.ties,
                    runsFor: s.runsFor,
                    runsAgainst: s.runsAgainst,
                    streak: calcStreak(s.results),
                },
                update: {
                    wins: s.wins,
                    losses: s.losses,
                    ties: s.ties,
                    runsFor: s.runsFor,
                    runsAgainst: s.runsAgainst,
                    streak: calcStreak(s.results),
                    lastUpdated: new Date(),
                },
            }),
        );

        await this.prisma.$transaction(upserts);
        return this.getStandings(tournamentId);
    }
}
