import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayersService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreatePlayerDto) {
        return this.prisma.player.create({ data });
    }

    async findAll(filters?: { teamId?: string }) {
        const where: any = {};
        if (filters?.teamId) where.teamId = filters.teamId;
        return this.prisma.player.findMany({ where, include: { team: true }, orderBy: { lastName: 'asc' } });
    }

    async search(query: string) {
        if (!query || query.trim().length < 2) return [];
        const q = query.trim();
        return this.prisma.player.findMany({
            where: {
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

    async findOne(id: string) {
        const player = await this.prisma.player.findUnique({
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
