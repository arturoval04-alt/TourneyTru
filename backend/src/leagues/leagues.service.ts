import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';

import { Requestor } from '../common/types';

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
            // Si piden las ligas de un admin específico, eso manda
            where.adminId = adminId;
        } else if (!isSystemAdmin) {
            // Usuario público o con rol: puede ver las públicas + las suyas propias
            const orConditions: any[] = [{ isPrivate: false }];
            
            if (requestor?.userId) {
                // Ligas donde es administrador
                orConditions.push({ adminId: requestor.userId });
            }
            if (requestor?.scorekeeperLeagueId) {
                // Liga adonde está asignado (presi o scorekeeper)
                orConditions.push({ id: requestor.scorekeeperLeagueId });
            }

            where.OR = orConditions;
        }

        const results = await this.prisma.league.findMany({
            where: Object.keys(where).length > 0 ? where : undefined,
            include: {
                admin: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { tournaments: true, umpires: true } },
            },
            orderBy: { name: 'asc' },
        }) as any[];

        return results;
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
        const league = await this.findOne(id, requestor);
        if (requestor?.role !== 'admin' && requestor?.userId !== (league as any).adminId) {
            throw new ForbiddenException('No tienes permiso para modificar esta liga.');
        }
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

    private async resolveLeagueUsersForCleanup(
        tx: any,
        leagueId: string,
        tournamentIds: string[],
    ): Promise<{ deleteUserIds: string[]; detachUserIds: string[] }> {
        const candidateIds = new Set<string>();

        const leagueStaff = await tx.user.findMany({
            where: {
                scorekeeperLeagueId: leagueId,
                role: { name: { in: ['scorekeeper', 'presi'] } },
            },
            select: { id: true },
        });
        leagueStaff.forEach((user: { id: string }) => candidateIds.add(user.id));

        const tournamentDelegates = await (tx.teamDelegate as any).findMany({
            where: { tournamentId: { in: tournamentIds } },
            select: { userId: true },
        });
        tournamentDelegates.forEach((delegate: { userId: string }) => candidateIds.add(delegate.userId));

        const tournamentOrganizers = await tx.tournamentOrganizer.findMany({
            where: { tournamentId: { in: tournamentIds } },
            select: { userId: true },
        });
        tournamentOrganizers.forEach((organizer: { userId: string }) => candidateIds.add(organizer.userId));

        const tournamentScorekeepers = await (tx.scorekeeperTournament as any).findMany({
            where: { tournamentId: { in: tournamentIds } },
            select: { userId: true },
        });
        tournamentScorekeepers.forEach((assignment: { userId: string }) => candidateIds.add(assignment.userId));

        if (candidateIds.size === 0) {
            return { deleteUserIds: [], detachUserIds: [] };
        }

        const users = await tx.user.findMany({
            where: { id: { in: Array.from(candidateIds) } },
            include: { role: true },
        }) as any[];

        const deleteUserIds: string[] = [];
        const detachUserIds: string[] = [];

        for (const user of users) {
            const roleName = user.role?.name;
            if (!['scorekeeper', 'presi', 'delegado'].includes(roleName)) {
                continue;
            }

            const tournamentExclusion = tournamentIds.length > 0
                ? { notIn: tournamentIds }
                : { not: '__none__' };

            const [
                otherLeaguesOwned,
                otherTournamentsAdministered,
                otherOrganizerAssignments,
                otherDelegateAssignments,
                otherDelegateCreations,
                otherScorekeeperAssignments,
                otherDocumentsUploaded,
            ] = await Promise.all([
                tx.league.count({
                    where: {
                        adminId: user.id,
                        id: { not: leagueId },
                    },
                }),
                tx.tournament.count({
                    where: {
                        adminId: user.id,
                        id: tournamentExclusion,
                    },
                }),
                tx.tournamentOrganizer.count({
                    where: {
                        userId: user.id,
                        tournamentId: tournamentExclusion,
                    },
                }),
                (tx.teamDelegate as any).count({
                    where: {
                        userId: user.id,
                        tournamentId: tournamentExclusion,
                    },
                }),
                (tx.teamDelegate as any).count({
                    where: {
                        createdById: user.id,
                        tournamentId: tournamentExclusion,
                    },
                }),
                (tx.scorekeeperTournament as any).count({
                    where: {
                        userId: user.id,
                        tournamentId: tournamentExclusion,
                    },
                }),
                (tx.tournamentDocument as any).count({
                    where: {
                        uploadedById: user.id,
                        tournamentId: tournamentExclusion,
                    },
                }),
            ]);

            const canDeleteUser =
                otherLeaguesOwned === 0 &&
                otherTournamentsAdministered === 0 &&
                otherOrganizerAssignments === 0 &&
                otherDelegateAssignments === 0 &&
                otherDelegateCreations === 0 &&
                otherScorekeeperAssignments === 0 &&
                otherDocumentsUploaded === 0;

            if (canDeleteUser) {
                deleteUserIds.push(user.id);
            } else {
                detachUserIds.push(user.id);
            }
        }

        return { deleteUserIds, detachUserIds };
    }

    // Cascade delete manual — SQL Server no propaga todos los FK automáticamente
    async cascadeDeleteLeague(leagueId: string) {
        await this.prisma.$transaction(async (tx: any) => {
            const tournaments = await tx.tournament.findMany({
                where: { leagueId },
                select: { id: true },
            });
            const tournamentIds = tournaments.map((t: { id: string }) => t.id);

            const teams = tournamentIds.length > 0
                ? await tx.team.findMany({
                    where: { tournamentId: { in: tournamentIds } },
                    select: { id: true },
                })
                : [];
            const teamIds = teams.map((team: { id: string }) => team.id);

            const { deleteUserIds, detachUserIds } = await this.resolveLeagueUsersForCleanup(
                tx,
                leagueId,
                tournamentIds,
            );

            if (tournamentIds.length > 0) {
                await (tx.scorekeeperTournament as any).deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await (tx.teamDelegate as any).deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await tx.tournamentOrganizer.deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await tx.game.updateMany({
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
                    await tx.team.updateMany({
                        where: {
                            id: { in: teamIds },
                            homeFieldId: { not: null },
                        },
                        data: { homeFieldId: null },
                    });
                }

                // Primero juegos para que Play, Lineup y LineupChange caigan por cascade.
                await tx.game.deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await tx.playerStat.deleteMany({
                    where: {
                        OR: [
                            { tournamentId: { in: tournamentIds } },
                            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
                        ],
                    },
                });

                await tx.standing.deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await tx.rosterEntry.deleteMany({
                    where: {
                        OR: [
                            { tournamentId: { in: tournamentIds } },
                            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
                        ],
                    },
                });

                await (tx.tournamentDocument as any).deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await tx.tournamentNews.deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                if (teamIds.length > 0) {
                    await tx.team.deleteMany({
                        where: { id: { in: teamIds } },
                    });
                }

                await tx.field.deleteMany({
                    where: { tournamentId: { in: tournamentIds } },
                });

                await tx.tournament.deleteMany({
                    where: { id: { in: tournamentIds } },
                });
            }

            if (detachUserIds.length > 0) {
                await tx.user.updateMany({
                    where: {
                        id: { in: detachUserIds },
                        scorekeeperLeagueId: leagueId,
                    },
                    data: { scorekeeperLeagueId: null },
                });
            }

            if (deleteUserIds.length > 0) {
                await (tx.scorekeeperTournament as any).deleteMany({
                    where: { userId: { in: deleteUserIds } },
                });

                await (tx.teamDelegate as any).deleteMany({
                    where: {
                        OR: [
                            { userId: { in: deleteUserIds } },
                            { createdById: { in: deleteUserIds } },
                        ],
                    },
                });

                await tx.tournamentOrganizer.deleteMany({
                    where: { userId: { in: deleteUserIds } },
                });

                await tx.game.updateMany({
                    where: { createdById: { in: deleteUserIds } },
                    data: { createdById: null },
                });

                await tx.tournamentNews.updateMany({
                    where: { authorId: { in: deleteUserIds } },
                    data: { authorId: null },
                });

                await tx.user.deleteMany({
                    where: { id: { in: deleteUserIds } },
                });
            }

            await tx.league.delete({ where: { id: leagueId } });
        });
    }

    /** Obtiene el plan del admin de la liga para validar cuotas */
    async getPlanForLeague(leagueId: string) {
        const league = await this.prisma.league.findUnique({
            where: { id: leagueId },
            select: {
                admin: {
                    select: {
                        planLabel: true,
                        maxLeagues: true,
                        maxTournamentsPerLeague: true,
                        maxTeamsPerTournament: true,
                        maxPlayersPerTeam: true,
                    }
                }
            }
        });
        return league?.admin;
    }
}
