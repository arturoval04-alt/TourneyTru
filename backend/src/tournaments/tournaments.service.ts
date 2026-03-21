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
                },
                news: {
                    orderBy: { createdAt: 'desc' }
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
            where: { tournamentId: id },
            include: { _count: { select: { players: true } } },
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

    async addField(tournamentId: string, name: string, location?: string, mapsUrl?: string) {
        await this.findOne(tournamentId);

        return this.prisma.field.create({
            data: {
                name,
                // If a Maps URL is provided, store it as location (used as href in UI)
                location: mapsUrl || location,
                tournamentId
            }
        });
    }

    async createNews(tournamentId: string, data: {
        title: string;
        description?: string;
        coverUrl?: string;
        facebookUrl?: string;
        type?: string;
        hasVideo?: boolean;
        authorId?: string;
    }) {
        await this.findOne(tournamentId);

        return this.prisma.tournamentNews.create({
            data: {
                tournamentId,
                title: data.title,
                description: data.description,
                coverUrl: data.coverUrl,
                facebookUrl: data.facebookUrl,
                type: data.type || 'Noticia',
                hasVideo: data.hasVideo ?? false,
                authorId: data.authorId || null,
            }
        });
    }

    async removeField(tournamentId: string, fieldId: string) {
        await this.findOne(tournamentId);
        return this.prisma.field.delete({
            where: { id: fieldId }
        });
    }

    async getStandings(id: string) {
        const tournament = await this.findOne(id);

        const finishedGames = await this.prisma.game.findMany({
            where: { tournamentId: id, status: 'finished' },
            select: {
                homeTeamId: true,
                awayTeamId: true,
                homeScore: true,
                awayScore: true,
            },
        });

        // Initialize record map for each team
        const map: Record<string, { teamId: string; name: string; shortName: string; logoUrl: string | null; w: number; l: number; t: number; rs: number; ra: number }> = {};
        for (const team of tournament.teams) {
            map[team.id] = {
                teamId: team.id,
                name: team.name,
                shortName: team.shortName || team.name.substring(0, 2).toUpperCase(),
                logoUrl: team.logoUrl ?? null,
                w: 0, l: 0, t: 0, rs: 0, ra: 0,
            };
        }

        for (const g of finishedGames) {
            const home = map[g.homeTeamId];
            const away = map[g.awayTeamId];
            if (!home || !away) continue;

            home.rs += g.homeScore;
            home.ra += g.awayScore;
            away.rs += g.awayScore;
            away.ra += g.homeScore;

            if (g.homeScore > g.awayScore) {
                home.w += 1;
                away.l += 1;
            } else if (g.awayScore > g.homeScore) {
                away.w += 1;
                home.l += 1;
            } else {
                home.t += 1;
                away.t += 1;
            }
        }

        const rows = Object.values(map).sort((a, b) => {
            const gA = a.w + a.l + a.t;
            const gB = b.w + b.l + b.t;
            const pctA = gA > 0 ? a.w / gA : 0;
            const pctB = gB > 0 ? b.w / gB : 0;
            if (pctB !== pctA) return pctB - pctA;
            return (b.rs - b.ra) - (a.rs - a.ra);
        });

        // Compute PCT and GB relative to first place
        const leader = rows[0];
        return rows.map((r, i) => {
            const g = r.w + r.l + r.t;
            const pct = g > 0 ? (r.w / g).toFixed(3) : '.000';
            let gb: string | number = '-';
            if (i > 0 && leader) {
                const diff = ((leader.w - r.w) + (r.l - leader.l)) / 2;
                gb = diff > 0 ? diff : 0;
            }
            return { ...r, pct, gb, gp: g };
        });
    }
}
