import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayersService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreatePlayerDto) {
        // Quota check: maxPlayersPerTeam
        if (data.teamId) {
            const team = await (this.prisma.team as any).findUnique({
                where: { id: data.teamId },
                include: { tournament: { include: { league: true } } },
            });
            const adminId = team?.tournament?.league?.adminId ?? team?.tournament?.adminId;
            if (adminId) {
                const admin = await this.prisma.user.findUnique({ where: { id: adminId } }) as any;
                if (admin && admin.maxPlayersPerTeam > 0) {
                    const count = await this.prisma.player.count({ where: { teamId: data.teamId } });
                    if (count >= admin.maxPlayersPerTeam) {
                        throw new ForbiddenException({
                            code: 'QUOTA_EXCEEDED',
                            resource: 'players',
                            message: `Alcanzaste el límite de jugadores por equipo de tu plan (${admin.maxPlayersPerTeam}).`,
                            limit: admin.maxPlayersPerTeam,
                            current: count,
                        });
                    }
                }
            }
        }
        return this.prisma.player.create({ data });
    }

    async findAll(filters?: { teamId?: string }) {
        const where: any = {};
        if (filters?.teamId) {
            where.teamId = filters.teamId;
        } else {
            where.team = {
                tournament: {
                    isPrivate: false,
                    league: { isPrivate: false }
                }
            };
        }
        return this.prisma.player.findMany({ where, include: { team: true }, orderBy: { lastName: 'asc' } });
    }

    async search(query: string) {
        if (!query || query.trim().length < 2) return [];
        const q = query.trim();
        return this.prisma.player.findMany({
            where: {
                team: {
                    tournament: {
                        isPrivate: false,
                        league: { isPrivate: false }
                    }
                },
                OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                ],
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                number: true,
                position: true,
                photoUrl: true,
                bats: true,
                throws: true,
                isVerified: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        tournament: { select: { id: true, name: true, season: true } },
                    },
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 20,
        });
    }

    async searchVerified(query?: string, excludeTeamId?: string) {
        const where: any = { isVerified: true };
        if (query && query.trim().length >= 2) {
            const q = query.trim();
            where.OR = [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
            ];
        }
        if (excludeTeamId) {
            where.teamId = { not: excludeTeamId };
        }
        return this.prisma.player.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                number: true,
                position: true,
                photoUrl: true,
                isVerified: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        tournament: { select: { id: true, name: true, season: true } },
                    },
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 30,
        });
    }

    async findOne(id: string) {
        const player = await (this.prisma.player.findUnique as any)({
            where: { id },
            include: {
                team: {
                    include: {
                        tournament: { select: { id: true, name: true, season: true } },
                    },
                },
                playerStats: {
                    include: {
                        tournament: { select: { id: true, name: true, season: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                lineupEntries: {
                    distinct: ['gameId'],
                    include: {
                        game: {
                            select: {
                                id: true,
                                scheduledDate: true,
                                status: true,
                                homeScore: true,
                                awayScore: true,
                                homeTeamId: true,
                                awayTeamId: true,
                                homeTeam: { select: { id: true, name: true, shortName: true } },
                                awayTeam: { select: { id: true, name: true, shortName: true } },
                                tournament: { select: { id: true, name: true } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                gamesMvp1: {
                    select: {
                        id: true, scheduledDate: true, homeScore: true, awayScore: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                    },
                },
                gamesMvp2: {
                    select: {
                        id: true, scheduledDate: true, homeScore: true, awayScore: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                    },
                },
                gamesWonAsPitcher: {
                    select: {
                        id: true, scheduledDate: true, homeScore: true, awayScore: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                    },
                },
                rosterEntries: {
                    include: {
                        team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
                        tournament: { select: { id: true, name: true, season: true, logoUrl: true } },
                    },
                    orderBy: { joinedAt: 'desc' },
                },
            },
        });

        if (!player) {
            throw new NotFoundException(`Player with id ${id} not found`);
        }

        return player;
    }

    async update(id: string, updateData: UpdatePlayerDto) {
        await this.findOne(id);
        return this.prisma.player.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.player.delete({
            where: { id },
        });
    }
}
