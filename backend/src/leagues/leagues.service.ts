import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';

type Requestor = { userId?: string; role?: string; scorekeeperLeagueId?: string | null };

@Injectable()
export class LeaguesService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateLeagueDto) {
        const { isPrivate, ...rest } = data as any;
        if (data.adminId) {
            const user = await this.prisma.user.findUnique({ where: { id: data.adminId } }) as any;
            if (user && user.maxLeagues < 999) {
                const count = await this.prisma.league.count({ where: { adminId: data.adminId } });
                if (count >= user.maxLeagues) {
                    throw new ForbiddenException({
                        code: 'QUOTA_EXCEEDED',
                        resource: 'leagues',
                        message: `Alcanzaste el límite de ligas de tu plan (${user.maxLeagues}).`,
                        limit: user.maxLeagues,
                        current: count,
                    });
                }
            }
        }
        
        const league = await this.prisma.league.create({ data: rest as any });

        // isPrivate not in Prisma client type (not exported correctly) — update via raw SQL
        if (isPrivate !== undefined) {
            await this.prisma.$executeRaw`UPDATE leagues SET is_private = ${isPrivate ? 1 : 0} WHERE id = ${league.id}`;
        }
        
        return { ...league, isPrivate };
    }

    async findAll(adminId?: string, requestor?: Requestor) {
        const isSystemAdmin = requestor?.role === 'admin';
        const where: any = {};

        if (adminId) {
            where.adminId = adminId;
        } else if (!isSystemAdmin) {
            where.isPrivate = false;
        }

        const results = await this.prisma.league.findMany({
            where: Object.keys(where).length > 0 ? where : undefined,
            include: {
                admin: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { tournaments: true, umpires: true } },
            },
            orderBy: { name: 'asc' },
        }) as any[];

        // If scoped to a user's own leagues or system admin — no privacy filter
        if (adminId || isSystemAdmin) return results;

        // Public listing: filter private leagues in-memory (Prisma client not regenerated)
        return results.filter((l: any) => {
            if (!(l.isPrivate ?? false)) return true;
            return requestor?.userId === l.adminId;
        });
    }

    async findOne(id: string, requestor?: Requestor) {
        const league = await this.prisma.league.findUnique({
            where: { id },
            include: {
                admin: { select: { id: true, firstName: true, lastName: true, email: true } },
                tournaments: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: { select: { teams: true, games: true } },
                    },
                },
                umpires: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { tournaments: true, umpires: true } },
            },
        }) as any;

        if (!league) {
            throw new NotFoundException(`League with id ${id} not found`);
        }

        // Privacy check
        if (league.isPrivate) {
            const isSystemAdmin = requestor?.role === 'admin';
            const isOwner = requestor?.userId === league.adminId;
            const isAssignedScorekeeper = requestor?.role === 'scorekeeper' &&
                requestor?.scorekeeperLeagueId === league.id;
            if (!isSystemAdmin && !isOwner && !isAssignedScorekeeper) {
                throw new ForbiddenException({
                    code: 'PRIVATE',
                    message: 'Esta liga es privada.',
                });
            }
        }

        return league;
    }

    async update(id: string, updateData: UpdateLeagueDto, requestor?: Requestor) {
        await this.findOne(id, requestor);
        const { isPrivate, ...rest } = updateData as any;

        const result = await this.prisma.league.update({
            where: { id },
            data: rest as any,
        });

        // isPrivate not in Prisma client type (not regenerated) — update via raw SQL
        if (isPrivate !== undefined) {
            await this.prisma.$executeRaw`UPDATE leagues SET is_private = ${isPrivate ? 1 : 0} WHERE id = ${id}`;
        }

        return result;
    }

    async remove(id: string, requestor?: Requestor) {
        const league = await this.prisma.league.findUnique({ where: { id } }) as any;
        if (!league) throw new NotFoundException(`Liga no encontrada`);

        const isSystemAdmin = requestor?.role === 'admin';
        const isOwner = requestor?.userId === league.adminId;
        if (!isSystemAdmin && !isOwner) {
            throw new ForbiddenException('No tienes permiso para eliminar esta liga.');
        }

        await this.cascadeDeleteLeague(id);
        return { message: 'Liga eliminada correctamente.' };
    }

    // Cascade delete manual — SQL Server no propaga todos los FK automáticamente
    async cascadeDeleteLeague(leagueId: string) {
        const tournaments = await this.prisma.tournament.findMany({
            where: { leagueId },
            select: { id: true },
        });
        const tournamentIds = tournaments.map(t => t.id);

        if (tournamentIds.length > 0) {
            const teams = await this.prisma.team.findMany({
                where: { tournamentId: { in: tournamentIds } },
                select: { id: true },
            });
            const teamIds = teams.map(t => t.id);

            // 1. Limpiar FKs de jugadores en juegos (onDelete: NoAction en el schema)
            await this.prisma.game.updateMany({
                where: { tournamentId: { in: tournamentIds } },
                data: {
                    mvpBatter1Id: null,
                    mvpBatter2Id: null,
                    winningPitcherId: null,
                    losingPitcherId: null,
                    savePitcherId: null,
                },
            });

            if (teamIds.length > 0) {
                // 2. PlayerStats y RosterEntries referencian Team con NoAction
                await this.prisma.playerStat.deleteMany({ where: { teamId: { in: teamIds } } });
                await this.prisma.rosterEntry.deleteMany({ where: { teamId: { in: teamIds } } });
            }

            // 3. TournamentOrganizer no tiene Cascade desde Tournament
            await this.prisma.tournamentOrganizer.deleteMany({
                where: { tournamentId: { in: tournamentIds } },
            });

            // 4. Juegos — cascadea automáticamente: Lineup, LineupChange, Play, GameUmpire
            await this.prisma.game.deleteMany({ where: { tournamentId: { in: tournamentIds } } });
        }

        // 5. Liga — cascadea: Tournament → Field, Team → Player, TournamentNews, Standing, Umpire, Subscription
        await this.prisma.league.delete({ where: { id: leagueId } });
    }
}
