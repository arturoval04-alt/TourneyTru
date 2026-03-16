import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';

@Injectable()
export class TournamentsService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateTournamentDto) {
        return this.prisma.tournament.create({ data });
    }

    async findAll() {
        return this.prisma.tournament.findMany({
            include: {
                league: true,
                _count: { select: { teams: true, games: true } },
                games: {
                    select: { status: true },
                },
            },
        });
    }

    async findOne(id: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id },
            include: {
                league: true,
                teams: {
                    include: {
                        players: true,
                        _count: { select: { players: true } },
                    },
                },
                games: {
                    include: {
                        homeTeam: true,
                        awayTeam: true,
                    },
                    orderBy: { scheduledDate: 'asc' },
                },
                fields: true,
                organizers: {
                    include: {
                        user: true
                    }
                }
            },
        });

        if (!tournament) {
            throw new NotFoundException(`Tournament with id ${id} not found`);
        }

        return tournament;
    }

    async update(id: string, updateData: UpdateTournamentDto) {
        await this.findOne(id); // Valida existencia
        return this.prisma.tournament.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.tournament.delete({
            where: { id },
        });
    }

    async getTeams(id: string) {
        await this.findOne(id); // Para asegurar que existe
        return this.prisma.team.findMany({
            where: { tournamentId: id }
        });
    }

    async addOrganizer(tournamentId: string, email: string) {
        await this.findOne(tournamentId);

        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        return this.prisma.tournamentOrganizer.create({
            data: {
                tournamentId,
                userId: user.id
            }
        });
    }

    async removeOrganizer(tournamentId: string, organizerId: string) {
        await this.findOne(tournamentId);
        return this.prisma.tournamentOrganizer.delete({
            where: { id: organizerId }
        });
    }

    async addField(tournamentId: string, name: string, location?: string) {
        await this.findOne(tournamentId);

        return this.prisma.field.create({
            data: {
                name,
                location,
                tournamentId
            }
        });
    }

    async removeField(tournamentId: string, fieldId: string) {
        await this.findOne(tournamentId);
        return this.prisma.field.delete({
            where: { id: fieldId }
        });
    }
}
