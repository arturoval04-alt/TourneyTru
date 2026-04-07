import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto, CreateTeamBulkDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateTeamDto) {
        // Quota check: maxTeamsPerTournament
        if (data.tournamentId) {
            const tournament = await (this.prisma.tournament as any).findUnique({
                where: { id: data.tournamentId },
                include: { league: true },
            });
            const adminId = tournament?.league?.adminId ?? tournament?.adminId;
            if (adminId) {
                const admin = await this.prisma.user.findUnique({ where: { id: adminId } }) as any;
                if (admin && admin.maxTeamsPerTournament > 0) {
                    const count = await this.prisma.team.count({ where: { tournamentId: data.tournamentId } });
                    if (count >= admin.maxTeamsPerTournament) {
                        throw new ForbiddenException({
                            code: 'QUOTA_EXCEEDED',
                            resource: 'teams',
                            message: `Alcanzaste el límite de equipos por torneo de tu plan (${admin.maxTeamsPerTournament}).`,
                            limit: admin.maxTeamsPerTournament,
                            current: count,
                        });
                    }
                }
            }
        }
        return this.prisma.team.create({ data });
    }

    async createBulk(data: CreateTeamBulkDto) {
        const { players, ...teamData } = data;

        // Use Prisma transaction or nested create
        return this.prisma.team.create({
            data: {
                ...teamData,
                players: {
                    create: players,
                },
            },
            include: {
                players: true,
                homeField: true,
                tournament: true
            }
        });
    }

    async findAll(filters?: { tournamentId?: string; includePlayers?: boolean }) {
        const where: any = {};
        if (filters?.tournamentId) {
            where.tournamentId = filters.tournamentId;
        } else {
            where.tournament = {
                isPrivate: false,
                league: { isPrivate: false }
            };
        }

        return this.prisma.team.findMany({
            where,
            include: {
                tournament: true,
                _count: { select: { players: true } },
                ...(filters?.includePlayers ? { players: true } : {}),
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const team = await (this.prisma.team.findUnique as any)({
            where: { id },
            include: {
                tournament: true,
                players: {
                    include: {
                        playsAsBatter: true,
                        playsAsPitcher: true,
                        lineupEntries: {
                            where: { isStarter: true }
                        }
                    }
                },
                rosterEntries: {
                    where: { isActive: true },
                    include: {
                        player: {
                            select: {
                                id: true, firstName: true, lastName: true,
                                number: true, position: true, photoUrl: true,
                                bats: true, throws: true, isVerified: true,
                                teamId: true,
                                team: { select: { id: true, name: true, shortName: true } },
                            },
                        },
                    },
                    orderBy: { joinedAt: 'asc' },
                },
                gamesAsHome: {
                    include: { homeTeam: true, awayTeam: true, winningPitcher: true, mvpBatter1: true, mvpBatter2: true },
                },
                gamesAsAway: {
                    include: { homeTeam: true, awayTeam: true, winningPitcher: true, mvpBatter1: true, mvpBatter2: true },
                },
            },
        });

        if (!team) {
            throw new NotFoundException(`Team with id ${id} not found`);
        }

        // Compute W/L record and stats
        let wins = 0;
        let losses = 0;

        for (const g of team.gamesAsHome) {
            if (g.status === 'finished') {
                if (g.homeScore > g.awayScore) wins++;
                else losses++;
            }
        }
        for (const g of team.gamesAsAway) {
            if (g.status === 'finished') {
                if (g.awayScore > g.homeScore) wins++;
                else losses++;
            }
        }

        // Calculate Stats for each player
        const playersWithStats = team.players.map(player => {
            const batting = this.calculateBattingStats(player.playsAsBatter);
            const pitching = this.calculatePitchingStats(player.playsAsPitcher);
            const gs = player.lineupEntries.length;
            const gsPitching = player.lineupEntries.filter(l => l.position === 'P' || l.dhForPosition === 'P').length;
            
            return {
                ...player,
                stats: { batting: { ...batting, gs }, pitching: { ...pitching, gs: gsPitching } }
            };
        });

        // Team Totals
        const teamBatting = this.calculateBattingStats(team.players.flatMap(p => p.playsAsBatter));
        const teamPitching = this.calculatePitchingStats(team.players.flatMap(p => p.playsAsPitcher));
        const teamGs = team.players.reduce((sum, p) => sum + p.lineupEntries.length, 0);
        const teamGsPitching = team.players.reduce((sum, p) => sum + p.lineupEntries.filter(l => l.position === 'P' || l.dhForPosition === 'P').length, 0);

        return { 
            ...team, 
            players: playersWithStats,
            wins, 
            losses, 
            gamesPlayed: wins + losses,
            stats: {
                batting: { ...teamBatting, gs: teamGs },
                pitching: { ...teamPitching, gs: teamGsPitching }
            }
        };
    }

    private calculateBattingStats(plays: any[]) {
        const stats = {
            atBats: 0, runs: 0, hits: 0, h2: 0, h3: 0, hr: 0, rbi: 0, bb: 0, so: 0, hbp: 0, sac: 0,
            avg: '.000', obp: '.000', slg: '.000', ops: '.000'
        };

        if (!plays.length) return stats;

        for (const p of plays) {
            const res = p.result;
            const isAtBat = !['BB', 'IBB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'CI'].includes(res) && !res.includes('WP_RUN') && !res.includes('RUN_SCORED');
            if (isAtBat) stats.atBats++;
            
            if (['H1', '1B'].includes(res)) { stats.hits++; }
            else if (['H2', '2B'].includes(res)) { stats.hits++; stats.h2++; }
            else if (['H3', '3B'].includes(res)) { stats.hits++; stats.h3++; }
            else if (['HR'].includes(res)) { stats.hits++; stats.hr++; }
            
            if (res === 'BB') stats.bb++;
            if (res === 'HBP') stats.hbp++;
            if (res.startsWith('K')) stats.so++;
            if (['SAC', 'SF', 'SH'].includes(res)) stats.sac++;
            
            stats.rbi += p.rbi || 0;
            stats.runs += p.runsScored || 0;
        }

        const { atBats, hits, h2, h3, hr, bb, hbp, sac } = stats;
        const h1 = hits - h2 - h3 - hr;
        const tb = (h1 * 1) + (h2 * 2) + (h3 * 3) + (hr * 4);
        
        if (atBats > 0) stats.avg = (hits / atBats).toFixed(3);
        const obpDenom = atBats + bb + hbp + sac;
        const obpVal = obpDenom > 0 ? (hits + bb + hbp) / obpDenom : 0;
        stats.obp = obpVal.toFixed(3).replace(/^0/, '');
        const slgVal = atBats > 0 ? tb / atBats : 0;
        stats.slg = slgVal.toFixed(3).replace(/^0/, '');
        stats.ops = (obpVal + slgVal).toFixed(3).replace(/^0/, '');
        stats.avg = stats.avg.replace(/^0/, '');

        return { ...stats, pa: obpDenom };
    }

    private calculatePitchingStats(plays: any[]) {
        const stats = {
            games: 0, wins: 0, losses: 0, ip: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, era: '0.00', whip: '0.00'
        };

        if (!plays.length) return stats;

        // Basic aggregation
        let totalOuts = 0;
        for (const p of plays) {
            totalOuts += p.outsRecorded || 0;
            if (['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'].includes(p.result)) stats.h++;
            if (p.result === 'BB') stats.bb++;
            if (p.result.startsWith('K')) stats.so++;
            stats.r += p.runsScored || 0;
            // Note: ER (Earned Runs) requires complex logic, defaulting to R for now
            stats.er += p.runsScored || 0;
        }

        const innings = Math.floor(totalOuts / 3) + (totalOuts % 3) / 10;
        stats.ip = innings;
        
        const ipVal = totalOuts / 3;
        const extStats = { k9: '0.00', bb9: '0.00' };
        if (ipVal > 0) {
            stats.era = ((stats.er * 9) / ipVal).toFixed(2);
            stats.whip = ((stats.bb + stats.h) / ipVal).toFixed(2);
            extStats.k9 = ((stats.so / ipVal) * 9).toFixed(2);
            extStats.bb9 = ((stats.bb / ipVal) * 9).toFixed(2);
        }

        return { ...stats, ...extStats };
    }

    async update(id: string, updateData: UpdateTeamDto) {
        await this.findOne(id);
        return this.prisma.team.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        const team = await this.prisma.team.findUnique({ where: { id } });
        if (!team) throw new NotFoundException(`Team ${id} not found`);
        return this.prisma.$transaction(async (tx: any) => {
            // Nullify game MVP/pitcher references to players on this team (NoAction FKs)
            await tx.$executeRaw`UPDATE games SET mvp_batter1_id = NULL WHERE mvp_batter1_id IN (SELECT id FROM players WHERE team_id = ${id})`;
            await tx.$executeRaw`UPDATE games SET mvp_batter2_id = NULL WHERE mvp_batter2_id IN (SELECT id FROM players WHERE team_id = ${id})`;
            await tx.$executeRaw`UPDATE games SET winning_pitcher_id = NULL WHERE winning_pitcher_id IN (SELECT id FROM players WHERE team_id = ${id})`;
            await tx.$executeRaw`UPDATE games SET losing_pitcher_id = NULL WHERE losing_pitcher_id IN (SELECT id FROM players WHERE team_id = ${id})`;
            await tx.$executeRaw`UPDATE games SET save_pitcher_id = NULL WHERE save_pitcher_id IN (SELECT id FROM players WHERE team_id = ${id})`;
            // Delete games involving this team (cascades plays, lineups, lineup_changes, game_umpires)
            await tx.$executeRaw`DELETE FROM games WHERE home_team_id = ${id} OR away_team_id = ${id}`;
            // Delete roster entries and player stats (NoAction FKs on team)
            await tx.$executeRaw`DELETE FROM roster_entries WHERE team_id = ${id}`;
            await tx.$executeRaw`DELETE FROM player_stats WHERE team_id = ${id}`;
            // Delete team — players cascade automatically
            return tx.team.delete({ where: { id } });
        });
    }
}
