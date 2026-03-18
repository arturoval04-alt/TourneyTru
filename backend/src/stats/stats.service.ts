import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HIT_RESULTS = ['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'];
const NON_AB_RESULTS = ['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH'];

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService) {}

    async getBattingLeaderboard(tournamentId: string) {
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
                        team: { select: { id: true, name: true, shortName: true } },
                    },
                },
            },
        });

        const map: Record<string, {
            playerId: string; firstName: string; lastName: string;
            teamId: string; teamName: string; teamShortName: string;
            ab: number; h: number; doubles: number; triples: number; hr: number;
            r: number; rbi: number; bb: number; so: number; gp: Set<string>;
        }> = {};

        for (const play of plays) {
            const b = play.batter;
            if (!map[b.id]) {
                map[b.id] = {
                    playerId: b.id,
                    firstName: b.firstName,
                    lastName: b.lastName,
                    teamId: b.team.id,
                    teamName: b.team.name,
                    teamShortName: b.team.shortName || b.team.name.substring(0, 2).toUpperCase(),
                    ab: 0, h: 0, doubles: 0, triples: 0, hr: 0,
                    r: 0, rbi: 0, bb: 0, so: 0, gp: new Set(),
                };
            }
            const s = map[b.id];
            s.gp.add(play.gameId);

            if (!NON_AB_RESULTS.includes(play.result)) s.ab += 1;
            if (HIT_RESULTS.includes(play.result)) s.h += 1;
            if (play.result === 'H2' || play.result === '2B') s.doubles += 1;
            if (play.result === 'H3' || play.result === '3B') s.triples += 1;
            if (play.result === 'HR') s.hr += 1;
            if (play.result === 'BB') s.bb += 1;
            if (play.result.startsWith('K')) s.so += 1;
            s.rbi += play.rbi;
            s.r += play.runsScored;
        }

        return Object.values(map)
            .map(s => ({
                ...s,
                gp: s.gp.size,
                avg: s.ab > 0 ? (s.h / s.ab).toFixed(3) : '.000',
            }))
            .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg) || b.h - a.h);
    }

    async getPitchingLeaderboard(tournamentId: string) {
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
                        team: { select: { id: true, name: true, shortName: true } },
                    },
                },
            },
        });

        const map: Record<string, {
            playerId: string; firstName: string; lastName: string;
            teamId: string; teamName: string; teamShortName: string;
            outs: number; h: number; r: number; bb: number; so: number; gp: Set<string>;
        }> = {};

        for (const play of plays) {
            const p = play.pitcher;
            if (!map[p.id]) {
                map[p.id] = {
                    playerId: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    teamId: p.team.id,
                    teamName: p.team.name,
                    teamShortName: p.team.shortName || p.team.name.substring(0, 2).toUpperCase(),
                    outs: 0, h: 0, r: 0, bb: 0, so: 0, gp: new Set(),
                };
            }
            const s = map[p.id];
            s.gp.add(play.gameId);
            s.outs += play.outsRecorded;
            if (HIT_RESULTS.includes(play.result)) s.h += 1;
            s.r += play.runsScored;
            if (play.result === 'BB') s.bb += 1;
            if (play.result.startsWith('K')) s.so += 1;
        }

        return Object.values(map)
            .map(s => {
                const ip = Math.floor(s.outs / 3) + (s.outs % 3) / 10;
                const ipFull = s.outs / 3;
                const era = ipFull > 0 ? ((s.r / ipFull) * 9).toFixed(2) : '-.--';
                return { ...s, gp: s.gp.size, ip: ip.toFixed(1), era };
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

        let ab = 0, h = 0, doubles = 0, triples = 0, hr = 0, r = 0, rbi = 0, bb = 0, so = 0;
        const gameSet = new Set<string>();

        for (const play of plays) {
            gameSet.add(play.gameId);
            if (!NON_AB_RESULTS.includes(play.result)) ab += 1;
            if (HIT_RESULTS.includes(play.result)) h += 1;
            if (play.result === 'H2' || play.result === '2B') doubles += 1;
            if (play.result === 'H3' || play.result === '3B') triples += 1;
            if (play.result === 'HR') hr += 1;
            if (play.result === 'BB') bb += 1;
            if (play.result.startsWith('K')) so += 1;
            rbi += play.rbi;
            r += play.runsScored;
        }

        return {
            playerId,
            gp: gameSet.size,
            ab, h, doubles, triples, hr, r, rbi, bb, so,
            avg: ab > 0 ? (h / ab).toFixed(3) : '.000',
        };
    }
}
