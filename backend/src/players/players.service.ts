import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto, BulkCreatePlayersDto, ConfirmImportDto } from './dto/player.dto';
import { Requestor } from '../common/types';

// ─── Tipos internos ───────────────────────────────────────────────────────────

export type DuplicateLevel = 'none' | 'team' | 'tournament' | 'global';

export interface DuplicateResult {
    level: DuplicateLevel;
    existing?: {
        id: string;
        firstName: string;
        lastName: string;
        secondLastName?: string | null;
        isVerified: boolean;
        team?: { id: string; name: string; shortName?: string | null; tournament: { id: string; name: string; season: string } } | null;
        rosterEntries: {
            teamId: string;
            tournamentId: string;
            team: { id: string; name: string; shortName?: string | null; tournament: { id: string; name: string; season: string } };
        }[];
    };
}

export type ImportRowStatus = 'pending_confirm' | 'duplicate_global' | 'duplicate_tournament' | 'duplicate_team';

export interface ImportRowResult {
    row: number;
    status: ImportRowStatus;
    firstName: string;
    lastName: string;
    secondLastName?: string | null;
    existing?: {
        id: string;
        firstName: string;
        lastName: string;
        secondLastName?: string | null;
        isVerified: boolean;
        team: { id: string; name: string; shortName?: string | null; tournament: { id: string; name: string; season: string } };
    };
}

import { DelegatesService } from '../delegates/delegates.service';
import { LeaguesService } from '../leagues/leagues.service';

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable()
export class PlayersService {
    constructor(
        private prisma: PrismaService,
        private delegatesService: DelegatesService,
        private leaguesService: LeaguesService,
    ) { }

    private async assertDelegateRosterAccess(
        requestingUser: { id: string; role: string },
        teamId: string,
        tournamentId: string,
        message: string,
    ) {
        if (requestingUser.role !== 'delegado') return;
        const hasAccess = await this.delegatesService.hasActiveDelegateAccess(requestingUser.id, teamId, tournamentId);
        if (!hasAccess) {
            throw new ForbiddenException(message);
        }
    }

    private async getDelegateAssignmentsForUser(userId: string) {
        return this.delegatesService.getActiveDelegatesForUser(userId);
    }


    private canAccessTournament(tournament: any, requestor?: Requestor): boolean {
        if (!tournament) return false;
        if (requestor?.role === 'admin') return true;

        const requestorId = requestor?.id ?? requestor?.userId;
        const isLeagueAdmin = requestorId === tournament.league?.adminId;
        const isTournamentAdmin = requestorId === tournament.adminId;
        const isOrganizer = tournament.organizers?.some((o: any) => o.userId === requestorId);
        const isAssignedScorekeeper = requestor?.role === 'scorekeeper' && requestor.scorekeeperTournamentIds?.includes(tournament.id);
        const isAssignedDelegate = requestor?.role === 'delegado'
            && !!requestor.isDelegateActive
            && (
                requestor.delegateTournamentIds?.includes(tournament.id)
                || requestor.delegateAssignments?.some((assignment) => assignment.tournamentId === tournament.id)
                || requestor.delegateTournamentId === tournament.id
            );

        if (tournament.league?.isPrivate && !isLeagueAdmin && !isTournamentAdmin && !isAssignedScorekeeper) {
            return false;
        }

        if (tournament.isPrivate && !isLeagueAdmin && !isTournamentAdmin && !isOrganizer && !isAssignedScorekeeper && !isAssignedDelegate) {
            return false;
        }

        return true;
    }

    // ── DUPLICATE DETECTION ──────────────────────────────────────────────────

    public async detectDuplicate(
        firstName: string,
        lastName: string,
        secondLastName: string | undefined | null,
        targetTeamId: string,
        targetTournamentId: string,
    ): Promise<DuplicateResult> {
        const fn = firstName.trim();
        const ln = lastName.trim();
        const sln = secondLastName?.trim();

        const candidates = await (this.prisma.player as any).findMany({
            where: {
                isStreamerCreated: false,
                firstName: { equals: fn },
                lastName: { equals: ln },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                secondLastName: true,
                photoUrl: true,
                birthPlace: true,
                isVerified: true,
                rosterEntries: {
                    where: { isActive: true },
                    select: {
                        teamId: true,
                        tournamentId: true,
                        team: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                tournament: {
                                    select: {
                                        id: true,
                                        name: true,
                                        season: true,
                                        isPrivate: true,
                                        adminId: true,
                                        league: { select: { id: true, adminId: true, isPrivate: true } },
                                        organizers: { select: { userId: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (candidates.length === 0) return { level: 'none' };

        let bestLevel: DuplicateLevel = 'none';
        let bestExisting: any = null;

        for (const candidate of candidates) {
            // Si ambos tienen apellido materno, deben coincidir
            if (sln && candidate.secondLastName) {
                if (candidate.secondLastName.trim().toLowerCase() !== sln.toLowerCase()) continue;
            }

            // Determinar nivel de duplicado por sus membresías activas
            let level: DuplicateLevel = 'global';
            let matchEntry = candidate.rosterEntries[0];

            for (const entry of candidate.rosterEntries) {
                if (entry.teamId === targetTeamId) { level = 'team'; matchEntry = entry; break; }
                if (entry.tournamentId === targetTournamentId) { level = 'tournament'; matchEntry = entry; }
            }

            const existing = {
                id: candidate.id,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                secondLastName: candidate.secondLastName,
                photoUrl: candidate.photoUrl,
                birthPlace: candidate.birthPlace,
                isVerified: candidate.isVerified,
                team: matchEntry?.team ?? null,
                rosterEntries: candidate.rosterEntries,
            };

            if (level === 'team') {
                return { level, existing }; // El peor caso, retornamos de inmediato
            }

            if (level === 'tournament') {
                bestLevel = 'tournament';
                bestExisting = existing;
            } else if (level === 'global' && bestLevel !== 'tournament') {
                bestLevel = 'global';
                bestExisting = existing;
            }
        }

        return { level: bestLevel, existing: bestExisting };
    }

    // ── QUOTA CHECK ──────────────────────────────────────────────────────────

    private async checkQuota(teamId: string, tournamentId: string, adding = 1) {
        const tournament = await (this.prisma.tournament as any).findUnique({
            where: { id: tournamentId },
            include: { league: { select: { id: true } } },
        });
        if (!tournament?.leagueId) return;

        const plan = await this.leaguesService.getPlanForLeague(tournament.leagueId);
        if (!plan || plan.maxPlayersPerTeam <= 0) return;

        const count = await (this.prisma.rosterEntry as any).count({
            where: { teamId, tournamentId, isActive: true },
        });
        if (count + adding > plan.maxPlayersPerTeam) {
            throw new ForbiddenException({
                code: 'QUOTA_EXCEEDED',
                resource: 'players',
                message: `El límite de tu plan es ${plan.maxPlayersPerTeam} jugadores por equipo. Ya tienes ${count} y estás intentando agregar ${adding}.`,
                limit: plan.maxPlayersPerTeam,
                current: count,
            });
        }
    }

    // ── CREATE (manual, un jugador) ──────────────────────────────────────────

    async create(data: CreatePlayerDto, requestingUser: { role: string }) {
        // Streamer bypass: crea Player + RosterEntry sin validación
        if (requestingUser.role === 'streamer') {
            return this.prisma.$transaction(async (tx) => {
                const player = await (tx.player as any).create({
                    data: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        secondLastName: data.secondLastName ?? null,
                        position: data.position ?? null,
                        bats: data.bats ?? 'R',
                        throws: data.throws ?? 'R',
                        isStreamerCreated: true,
                        isVerified: false,
                    },
                });
                await (tx.rosterEntry as any).create({
                    data: {
                        playerId: player.id,
                        teamId: data.teamId,
                        tournamentId: data.tournamentId,
                        number: data.number ?? null,
                        position: data.position ?? null,
                        isActive: true,
                    },
                });
                return player;
            });
        }

        // Delegado: solo permite si está asignado a ese equipo y torneo
        await this.assertDelegateRosterAccess(
            requestingUser as any,
            data.teamId,
            data.tournamentId,
            'No tienes permisos para agregar jugadores a este equipo o torneo.',
        );

        // Quota check
        await this.checkQuota(data.teamId, data.tournamentId);

        // Duplicate detection
        const dup = await this.detectDuplicate(
            data.firstName, data.lastName, data.secondLastName,
            data.teamId, data.tournamentId,
        );

        if (dup.level === 'team' || dup.level === 'tournament') {
            const ref = dup.existing?.rosterEntries[0]?.team;
            throw new HttpException({
                code: 'DUPLICATE_PLAYER',
                level: dup.level,
                existing: dup.existing,
                message: `Este jugador ya está registrado en: ${ref?.name} (${ref?.tournament?.name})`,
            }, HttpStatus.CONFLICT);
        }

        if (dup.level === 'global' && !data.forceCreate) {
            const ref = dup.existing?.rosterEntries[0]?.team;
            throw new HttpException({
                code: 'DUPLICATE_PLAYER',
                level: 'global',
                existing: dup.existing,
                message: `Este jugador ya está dado de alta en: ${ref?.name} (${ref?.tournament?.name})`,
            }, HttpStatus.CONFLICT);
        }

        // Crear Player + RosterEntry en transacción
        return this.prisma.$transaction(async (tx) => {
            const player = await (tx.player as any).create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    secondLastName: data.secondLastName ?? null,
                    curp: data.curp ?? null,
                    birthDate: data.birthDate ? new Date(data.birthDate) : null,
                    sex: data.sex ?? null,
                    birthPlace: data.birthPlace ?? null,
                    position: data.position ?? null,
                    bats: data.bats ?? 'R',
                    throws: data.throws ?? 'R',
                    photoUrl: data.photoUrl ?? null,
                },
            });
            await (tx.rosterEntry as any).create({
                data: {
                    playerId: player.id,
                    teamId: data.teamId,
                    tournamentId: data.tournamentId,
                    number: data.number ?? null,
                    position: data.position ?? null,
                    isActive: true,
                },
            });
            return player;
        });
    }

    // ── FIND ALL ─────────────────────────────────────────────────────────────

    async findAll(filters?: { teamId?: string }) {
        if (filters?.teamId) {
            // Jugadores del equipo via RosterEntry
            const entries = await (this.prisma.rosterEntry as any).findMany({
                where: { teamId: filters.teamId, isActive: true },
                include: {
                    player: {
                        include: {
                            _count: { select: { rosterEntries: { where: { isActive: true } } } },
                        },
                    },
                },
                orderBy: { player: { lastName: 'asc' } },
            });
            return entries.map((e: any) => ({
                ...e.player,
                number: e.number,
                rosterEntryId: e.id,
            }));
        }

        // Búsqueda global (sin filtro de equipo)
        return (this.prisma.player as any).findMany({
            where: {
                isStreamerCreated: false,
                rosterEntries: {
                    some: {
                        isActive: true,
                        team: {
                            tournament: { isPrivate: false, league: { isPrivate: false } },
                        },
                    },
                },
            },
            include: {
                _count: { select: { rosterEntries: { where: { isActive: true } } } },
            },
            orderBy: { lastName: 'asc' },
        });
    }

    // ── DIRECTORY ────────────────────────────────────────────────────────────

    async getDirectory(params: {
        page?: number;
        limit?: number;
        search?: string;
        leagueId?: string;
        tournamentId?: string;
        teamId?: string;
        requestingUser?: { id: string; role: string };
    }) {
        const page = params.page ? Number(params.page) : 1;
        const limit = params.limit ? Number(params.limit) : 24;
        const skip = (page - 1) * limit;

        const where: any = {
            isStreamerCreated: false,
        };

        if (params.search && params.search.trim().length >= 2) {
            const q = params.search.trim();
            where.OR = [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
            ];
        }

        // Filtros jerárquicos
        if (params.teamId) {
            where.rosterEntries = { some: { teamId: params.teamId, isActive: true } };
        } else if (params.tournamentId) {
            where.rosterEntries = { some: { tournamentId: params.tournamentId, isActive: true } };
        } else if (params.leagueId) {
            where.rosterEntries = { some: { team: { tournament: { leagueId: params.leagueId } }, isActive: true } };
        }

        // Configuración de visibilidad (Permisos Públicos y Privados)
        const publicScope = {
            some: {
                isActive: true,
                team: { tournament: { isPrivate: false, league: { isPrivate: false } } }
            }
        };

        const visibilityConditions: any[] = [];

        if (!params.requestingUser) {
            visibilityConditions.push({ rosterEntries: publicScope });
        } else if (params.requestingUser.role !== 'admin') {
            const reqUser = params.requestingUser as any;
            
            visibilityConditions.push({ rosterEntries: publicScope });

            if (reqUser.role === 'delegado' && reqUser.delegateTeamIds?.length) {
                visibilityConditions.push({ rosterEntries: { some: { teamId: { in: reqUser.delegateTeamIds }, isActive: true } } });
            } else if (reqUser.role === 'scorekeeper' && reqUser.scorekeeperTournamentIds?.length) {
                visibilityConditions.push({ rosterEntries: { some: { tournamentId: { in: reqUser.scorekeeperTournamentIds }, isActive: true } } });
            } else if (reqUser.role === 'presi') {
                visibilityConditions.push({ rosterEntries: { some: { team: { tournament: { organizers: { some: { userId: reqUser.id } } } }, isActive: true } } });
            } else if (reqUser.role === 'organizer') {
                visibilityConditions.push({ rosterEntries: { some: { team: { tournament: { league: { adminId: reqUser.id } } }, isActive: true } } });
            }
        }

        if (visibilityConditions.length > 0) {
            const visFilter = visibilityConditions.length === 1 
                ? visibilityConditions[0] 
                : { OR: visibilityConditions };

            if (!where.AND) where.AND = [];
            
            if (where.rosterEntries) {
                where.AND.push({ rosterEntries: where.rosterEntries });
                delete where.rosterEntries;
            }
            
            where.AND.push(visFilter);
        }

        const [total, data] = await Promise.all([
            (this.prisma.player as any).count({ where }),
            (this.prisma.player as any).findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    secondLastName: true,
                    position: true,
                    photoUrl: true,
                    birthPlace: true,
                    bats: true,
                    throws: true,
                    isVerified: true,
                    _count: { select: { rosterEntries: { where: { isActive: true } } } },
                    rosterEntries: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            number: true,
                            team: {
                                select: {
                                    id: true,
                                    name: true,
                                    shortName: true,
                                    tournament: {
                                    select: {
                                        id: true,
                                        name: true,
                                        season: true,
                                        isPrivate: true,
                                        adminId: true,
                                        league: { select: { id: true, adminId: true, isPrivate: true } },
                                        organizers: { select: { userId: true } },
                                    },
                                },
                                },
                            },
                        },
                        orderBy: { joinedAt: 'desc' },
                        take: 1, // Para sacar la referencia de su último equipo
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            })
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }


    // ── SEARCH ───────────────────────────────────────────────────────────────

    async search(query: string) {
        if (!query || query.trim().length < 2) return [];
        const q = query.trim();
        return (this.prisma.player as any).findMany({
            where: {
                isStreamerCreated: false,
                OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                ],
                rosterEntries: {
                    some: {
                        isActive: true,
                        team: {
                            tournament: { isPrivate: false, league: { isPrivate: false } },
                        },
                    },
                },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                secondLastName: true,
                position: true,
                photoUrl: true,
                bats: true,
                throws: true,
                isVerified: true,
                rosterEntries: {
                    where: { isActive: true },
                    select: {
                        number: true,
                        team: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                tournament: {
                            select: {
                                id: true,
                                name: true,
                                season: true,
                                isPrivate: true,
                                adminId: true,
                                league: { select: { id: true, adminId: true, isPrivate: true } },
                                organizers: { select: { userId: true } },
                            },
                        },
                            },
                        },
                    },
                    take: 1,
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 20,
        });
    }

    // ── SEARCH VERIFIED ──────────────────────────────────────────────────────

    async searchVerified(query?: string, excludeTeamId?: string) {
        const where: any = {
            isVerified: true,
            isStreamerCreated: false,
        };
        if (query && query.trim().length >= 2) {
            const q = query.trim();
            where.OR = [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
            ];
        }
        if (excludeTeamId) {
            where.rosterEntries = {
                none: { teamId: excludeTeamId, isActive: true },
            };
        }
        return (this.prisma.player as any).findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                secondLastName: true,
                position: true,
                photoUrl: true,
                isVerified: true,
                rosterEntries: {
                    where: { isActive: true },
                    select: {
                        number: true,
                        team: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                tournament: { select: { id: true, name: true, season: true } },
                            },
                        },
                    },
                    orderBy: { joinedAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            take: 30,
        });
    }

    // ── FIND ONE ─────────────────────────────────────────────────────────────

    async findOne(id: string, requestor?: Requestor) {
        const player = await (this.prisma.player as any).findUnique({
            where: { id },
            include: {
                rosterEntries: {
                    include: {
                        team: {
                            include: {
                                tournament: { select: { id: true, name: true, season: true } },
                            },
                        },
                        tournament: { select: { id: true, name: true, season: true } },
                    },
                    orderBy: { joinedAt: 'desc' },
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
                                tournament: {
                                    select: {
                                        id: true,
                                        name: true,
                                        isPrivate: true,
                                        adminId: true,
                                        league: { select: { id: true, adminId: true, isPrivate: true } },
                                        organizers: { select: { userId: true } },
                                    },
                                },
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
                        tournamentId: true,
                        tournament: {
                            select: {
                                id: true,
                                isPrivate: true,
                                adminId: true,
                                league: { select: { id: true, adminId: true, isPrivate: true } },
                                organizers: { select: { userId: true } },
                            },
                        },
                    },
                },
                gamesMvp2: {
                    select: {
                        id: true, scheduledDate: true, homeScore: true, awayScore: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        tournamentId: true,
                        tournament: {
                            select: {
                                id: true,
                                isPrivate: true,
                                adminId: true,
                                league: { select: { id: true, adminId: true, isPrivate: true } },
                                organizers: { select: { userId: true } },
                            },
                        },
                    },
                },
                gamesWonAsPitcher: {
                    select: {
                        id: true, scheduledDate: true, homeScore: true, awayScore: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        tournamentId: true,
                        tournament: {
                            select: {
                                id: true,
                                isPrivate: true,
                                adminId: true,
                                league: { select: { id: true, adminId: true, isPrivate: true } },
                                organizers: { select: { userId: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!player) throw new NotFoundException(`Player with id ${id} not found`);
        const accessibleTournamentIds = new Set<string>();
        const collectTournament = (tournament: any) => {
            if (tournament?.id && this.canAccessTournament(tournament, requestor)) {
                accessibleTournamentIds.add(tournament.id);
            }
        };

        player.rosterEntries?.forEach((entry: any) => collectTournament(entry.tournament ?? entry.team?.tournament));
        player.playerStats?.forEach((stat: any) => collectTournament(stat.tournament));
        player.lineupEntries?.forEach((entry: any) => collectTournament(entry.game?.tournament));
        player.gamesMvp1?.forEach((game: any) => collectTournament(game.tournament));
        player.gamesMvp2?.forEach((game: any) => collectTournament(game.tournament));
        player.gamesWonAsPitcher?.forEach((game: any) => collectTournament(game.tournament));

        const totalTournaments = (player.rosterEntries?.length || 0) + 
                                 (player.playerStats?.length || 0) +
                                 (player.lineupEntries?.length || 0) +
                                 (player.gamesMvp1?.length || 0) +
                                 (player.gamesMvp2?.length || 0) +
                                 (player.gamesWonAsPitcher?.length || 0);

        if (totalTournaments > 0 && accessibleTournamentIds.size === 0) {
            throw new ForbiddenException({ code: 'PRIVATE', message: 'Este jugador pertenece a un torneo privado.' });
        }

        player.rosterEntries = (player.rosterEntries ?? []).filter((entry: any) => {
            const tournamentId = entry.tournament?.id ?? entry.team?.tournament?.id;
            return tournamentId ? accessibleTournamentIds.has(tournamentId) : false;
        });
        player.playerStats = (player.playerStats ?? []).filter((stat: any) => stat.tournament?.id && accessibleTournamentIds.has(stat.tournament.id));
        player.lineupEntries = (player.lineupEntries ?? []).filter((entry: any) => entry.game?.tournament?.id && accessibleTournamentIds.has(entry.game.tournament.id));
        player.gamesMvp1 = (player.gamesMvp1 ?? []).filter((game: any) => game.tournamentId && accessibleTournamentIds.has(game.tournamentId));
        player.gamesMvp2 = (player.gamesMvp2 ?? []).filter((game: any) => game.tournamentId && accessibleTournamentIds.has(game.tournamentId));
        player.gamesWonAsPitcher = (player.gamesWonAsPitcher ?? []).filter((game: any) => game.tournamentId && accessibleTournamentIds.has(game.tournamentId));

        return player;
    }

    // ── IMPORT (preview por fila) ────────────────────────────────────────────

    async importPlayers(data: BulkCreatePlayersDto, requestingUser: { id: string; role: string }) {
        const { teamId, tournamentId, players } = data;

        // Delegado check
        await this.assertDelegateRosterAccess(
            requestingUser,
            teamId,
            tournamentId,
            'No tienes permisos para importar jugadores a este equipo o torneo.',
        );

        if (requestingUser.role === 'streamer') {
            const created = await this.prisma.$transaction(async (tx) => {
                let count = 0;
                for (const p of players) {
                    const player = await (tx.player as any).create({
                        data: {
                            firstName: p.firstName,
                            lastName: p.lastName,
                            secondLastName: p.secondLastName ?? null,
                            position: p.position ?? null,
                            bats: p.bats ?? 'R',
                            throws: p.throws ?? 'R',
                            isStreamerCreated: true,
                            isVerified: false,
                        },
                    });
                    await (tx.rosterEntry as any).create({
                        data: { playerId: player.id, teamId, tournamentId, number: p.number ?? null, position: p.position ?? null, isActive: true },
                    });
                    count++;
                }
                return count;
            });
            return { streamer: true, created };
        }

        const results: ImportRowResult[] = [];
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const dup = await this.detectDuplicate(p.firstName, p.lastName, p.secondLastName, teamId, tournamentId);
            results.push({
                row: i + 1,
                status: dup.level === 'none' ? 'pending_confirm' : `duplicate_${dup.level}` as ImportRowStatus,
                firstName: p.firstName,
                lastName: p.lastName,
                secondLastName: p.secondLastName ?? null,
                existing: dup.existing as any,
            });
        }

        const summary = {
            pendingConfirm: results.filter(r => r.status === 'pending_confirm').length,
            globalWarnings: results.filter(r => r.status === 'duplicate_global').length,
            blocked: results.filter(r => r.status === 'duplicate_tournament' || r.status === 'duplicate_team').length,
        };

        return { preview: true, results, summary };
    }

    // ── CONFIRM IMPORT ───────────────────────────────────────────────────────

    async confirmImport(data: ConfirmImportDto, requestingUser: { id: string; role: string }) {
        const { teamId, tournamentId, toCreate, toRoster } = data;

        // Delegado check
        await this.assertDelegateRosterAccess(
            requestingUser,
            teamId,
            tournamentId,
            'No tienes permisos para confirmar importaciones en este equipo o torneo.',
        );
        await this.checkQuota(teamId, tournamentId, toCreate.length);

        return this.prisma.$transaction(async (tx) => {
            const created: any[] = [];
            const rostered: any[] = [];

            for (const p of toCreate) {
                const player = await (tx.player as any).create({
                    data: {
                        firstName: p.firstName,
                        lastName: p.lastName,
                        secondLastName: p.secondLastName ?? null,
                        curp: p.curp ?? null,
                        birthDate: p.birthDate ? new Date(p.birthDate) : null,
                        sex: p.sex ?? null,
                        birthPlace: (p as any).birthPlace ?? null,
                        position: p.position ?? null,
                        bats: p.bats ?? 'R',
                        throws: p.throws ?? 'R',
                    },
                });
                await (tx.rosterEntry as any).create({
                    data: { playerId: player.id, teamId, tournamentId, number: p.number ?? null, position: p.position ?? null, isActive: true },
                });
                created.push(player);
            }

            for (const r of toRoster) {
                const existing = await (tx.rosterEntry as any).findUnique({
                    where: { playerId_teamId_tournamentId: { playerId: r.playerId, teamId, tournamentId } },
                });
                if (existing) {
                    await (tx.rosterEntry as any).update({
                        where: { id: existing.id },
                        data: { isActive: true, leftAt: null, number: r.number ?? existing.number },
                    });
                } else {
                    const entry = await (tx.rosterEntry as any).create({
                        data: { playerId: r.playerId, teamId, tournamentId, number: r.number ?? null, position: r.position ?? null, isActive: true },
                    });
                    rostered.push(entry);
                }
            }

            return { created: created.length, rostered: rostered.length };
        });
    }

    // ── CREATE BULK (legacy) ─────────────────────────────────────────────────

    async createBulk(data: BulkCreatePlayersDto) {
        // Redirigir a importPlayers con rol dummy para no romper integraciones antiguas
        return this.importPlayers(data, { id: 'legacy-system', role: 'organizer' });
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────

    async update(id: string, updateData: UpdatePlayerDto, requestingUser?: { id: string; role: string }) {
        const player = await this.findOne(id, requestingUser as Requestor | undefined);
        
        const { teamId, tournamentId, number, ...playerData } = updateData;

        // VALIDACIÓN DE SEGURIDAD PARA DELEGADO
        if (requestingUser?.role === 'delegado') {
            const assignments = await this.getDelegateAssignmentsForUser(requestingUser.id);
            if (assignments.length === 0) throw new ForbiddenException('Tu cuenta de delegado no está activa.');

            // Si se está actualizando un RosterEntry específico (teamId + tournamentId), debe ser el suyo
            if (teamId && tournamentId) {
                const hasAccess = assignments.some((assignment) => assignment.teamId === teamId && assignment.tournamentId === tournamentId);
                if (!hasAccess) {
                    throw new ForbiddenException('No tienes permisos para editar jugadores de otros equipos.');
                }
            } else {
                // Si no se pasó contexto, verificar que el jugador pertenezca a su equipo en algún lado
                const belongsToMe = player.rosterEntries.some((entry: any) =>
                    entry.isActive && assignments.some((assignment) =>
                        assignment.teamId === entry.teamId && assignment.tournamentId === entry.tournamentId,
                    ),
                );
                if (!belongsToMe) {
                    throw new ForbiddenException('Este jugador no pertenece a tu plantilla activa.');
                }
            }
        }

        return (this.prisma.player as any).update({
            where: { id },
            data: {
                ...playerData,
                birthDate: playerData.birthDate ? new Date(playerData.birthDate) : undefined,
            },
        });
    }

    // ── MERGE ────────────────────────────────────────────────────────────────
    
    async merge(primaryId: string, duplicateId: string, reqUser: any) {
        if (reqUser && reqUser.role === 'delegado') {
            throw new ForbiddenException('Los delegados no tienen permisos para fusionar jugadores.');
        }
        if (primaryId === duplicateId) {
            throw new HttpException('No puedes fusionar a un jugador consigo mismo.', HttpStatus.BAD_REQUEST);
        }

        const primaryPlayer = await this.prisma.player.findUnique({ where: { id: primaryId } });
        const duplicatePlayer = await this.prisma.player.findUnique({
            where: { id: duplicateId },
            include: {
                rosterEntries: {
                    include: { team: { include: { tournament: { include: { league: true } } } } }
                }
            }
        });

        if (!primaryPlayer || !duplicatePlayer) {
            throw new NotFoundException('Uno de los jugadores especificados no existe.');
        }

        // VALIDACIÓN DE SEGURIDAD (Mismas reglas que DELETE)
        if (reqUser && reqUser.role !== 'admin') {
            for (const entry of duplicatePlayer.rosterEntries) {
                const trn = entry.team?.tournament;
                const isAdmin = trn?.adminId === reqUser.id || trn?.league?.adminId === reqUser.id;
                if (!isAdmin) {
                    throw new ForbiddenException('No puedes fusionar a este jugador porque el duplicado pertenece a o ha jugado en ligas/torneos que tú no administras.');
                }
            }
        }

        // PROCEDER CON FUSIÓN TRANSACCIONAL
        return this.prisma.$transaction(async (tx: any) => {
            // 1. Simple Updates for Games, Plays, Lineups
            await tx.$executeRaw`UPDATE games SET mvp_batter1_id = ${primaryId} WHERE mvp_batter1_id = ${duplicateId}`;
            await tx.$executeRaw`UPDATE games SET mvp_batter2_id = ${primaryId} WHERE mvp_batter2_id = ${duplicateId}`;
            await tx.$executeRaw`UPDATE games SET winning_pitcher_id = ${primaryId} WHERE winning_pitcher_id = ${duplicateId}`;
            await tx.$executeRaw`UPDATE games SET losing_pitcher_id = ${primaryId} WHERE losing_pitcher_id = ${duplicateId}`;
            await tx.$executeRaw`UPDATE games SET save_pitcher_id = ${primaryId} WHERE save_pitcher_id = ${duplicateId}`;

            await tx.$executeRaw`UPDATE plays SET batter_id = ${primaryId} WHERE batter_id = ${duplicateId}`;
            await tx.$executeRaw`UPDATE plays SET pitcher_id = ${primaryId} WHERE pitcher_id = ${duplicateId}`;

            await tx.$executeRaw`UPDATE lineups SET player_id = ${primaryId} WHERE player_id = ${duplicateId}`;
            
            await tx.$executeRaw`UPDATE lineup_changes SET player_in_id = ${primaryId} WHERE player_in_id = ${duplicateId}`;
            await tx.$executeRaw`UPDATE lineup_changes SET player_out_id = ${primaryId} WHERE player_out_id = ${duplicateId}`;

            // 2. Resolver colisiones de RosterEntry
            const primaryRosters = await tx.rosterEntry.findMany({ where: { playerId: primaryId } });
            for (const dupEntry of duplicatePlayer.rosterEntries) {
                const collision = primaryRosters.find((p: any) => p.teamId === dupEntry.teamId && p.tournamentId === dupEntry.tournamentId);
                if (collision) {
                    // El primario ya está en este equipo, destruimos el entry del duplicado para evitar UNIQUE constraint error
                    await tx.rosterEntry.delete({ where: { id: dupEntry.id } });
                } else {
                    // El primario no estaba aquí, le pasamos la propiedad del entry
                    await tx.rosterEntry.update({
                        where: { id: dupEntry.id },
                        data: { playerId: primaryId }
                    });
                }
            }

            // 3. Resolver colisiones de Estadísticas (PlayerStat)
            const duplicateStats = await tx.playerStat.findMany({ where: { playerId: duplicateId } });
            const primaryStats = await tx.playerStat.findMany({ where: { playerId: primaryId } });

            for (const dupStat of duplicateStats) {
                // Buscamos si hay estadisticas del primario en el MISMO torneo y equipo
                const collision = primaryStats.find((p: any) => 
                    p.teamId === dupStat.teamId && p.tournamentId === dupStat.tournamentId
                );

                if (collision) {
                    // Hay colisión! Sumamos todo matemáticamente al primario y borramos el dupStat.
                    await tx.playerStat.update({
                        where: { id: collision.id },
                        data: {
                            atBats: collision.atBats + dupStat.atBats,
                            runs: collision.runs + dupStat.runs,
                            hits: collision.hits + dupStat.hits,
                            h2: collision.h2 + dupStat.h2,
                            h3: collision.h3 + dupStat.h3,
                            hr: collision.hr + dupStat.hr,
                            rbi: collision.rbi + dupStat.rbi,
                            bb: collision.bb + dupStat.bb,
                            so: collision.so + dupStat.so,
                            hbp: collision.hbp + dupStat.hbp,
                            sac: collision.sac + dupStat.sac,
                            gamesPlayed: collision.gamesPlayed + dupStat.gamesPlayed,
                            gamesStarted: collision.gamesStarted + dupStat.gamesStarted,
                            plateAppearances: collision.plateAppearances + dupStat.plateAppearances,
                            sacFlies: collision.sacFlies + dupStat.sacFlies,
                            sacBunts: collision.sacBunts + dupStat.sacBunts,
                            stolenBases: collision.stolenBases + dupStat.stolenBases,
                            caughtStealing: collision.caughtStealing + dupStat.caughtStealing,
                            groundDP: collision.groundDP + dupStat.groundDP,
                            totalBases: collision.totalBases + dupStat.totalBases,
                            ibb: collision.ibb + dupStat.ibb,
                            // Pitching
                            wins: collision.wins + dupStat.wins,
                            losses: collision.losses + dupStat.losses,
                            ipOuts: collision.ipOuts + dupStat.ipOuts,
                            hAllowed: collision.hAllowed + dupStat.hAllowed,
                            erAllowed: collision.erAllowed + dupStat.erAllowed,
                            bbAllowed: collision.bbAllowed + dupStat.bbAllowed,
                            soPitching: collision.soPitching + dupStat.soPitching,
                            gamesStartedP: collision.gamesStartedP + dupStat.gamesStartedP,
                            battersFaced: collision.battersFaced + dupStat.battersFaced,
                            hrAllowed: collision.hrAllowed + dupStat.hrAllowed,
                            wildPitches: collision.wildPitches + dupStat.wildPitches,
                            saves: collision.saves + dupStat.saves,
                            errors: collision.errors + dupStat.errors,
                        }
                    });
                    await tx.playerStat.delete({ where: { id: dupStat.id } });
                } else {
                    // No hay colision, el primario nunca habia jugado ahí. Le damos el record completo.
                    await tx.playerStat.update({
                        where: { id: dupStat.id },
                        data: { playerId: primaryId }
                    });
                }
            }

            // 4. Se asegura el estado verificado del principal si asimiló identidades robustas
            await tx.player.update({
                where: { id: primaryId },
                data: { isVerified: true }
            });

            // 5. Destrucción final del Duplicado vacío.
            return tx.player.delete({ where: { id: duplicateId } });
        });
    }

    // ── REMOVE ───────────────────────────────────────────────────────────────

    async remove(id: string, reqUser?: { id: string; role: string }) {
        const player = await this.prisma.player.findUnique({
            where: { id },
            include: {
                rosterEntries: {
                    include: {
                        team: {
                            include: {
                                tournament: {
                                    include: { league: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!player) {
            throw new NotFoundException(`Jugador con id ${id} no encontrado`);
        }

        // Validación de Permisos si no es el Super Admin "admin"
        if (reqUser && reqUser.role !== 'admin') {
            const delegateAssignments = reqUser.role === 'delegado'
                ? await this.getDelegateAssignmentsForUser(reqUser.id)
                : [];

            if (reqUser.role === 'delegado' && delegateAssignments.length === 0) {
                throw new ForbiddenException('Tu cuenta de delegado no está activa.');
            }

            // Regla 1: Jugador verificado (múltiples equipos) no puede ser eliminado por organizadores/presis/delegados
            if (player.rosterEntries.length > 1) {
                throw new ForbiddenException('No puedes eliminar definitivamente a este jugador porque ya está participando en más de un equipo en el sistema. Por favor, si lo quieres fuera, solo dalo de baja de tu equipo desde el perfil del equipo.');
            }

            // Regla 2: Si tiene 1 registro, debe ser estrictamente en una liga del usuario o equipo del delegado
            if (player.rosterEntries.length === 1) {
                const entry = player.rosterEntries[0];
                const trn = entry.team?.tournament;
                
                if (reqUser.role === 'delegado') {
                    const hasAccess = delegateAssignments.some((assignment) =>
                        assignment.teamId === entry.teamId && assignment.tournamentId === entry.tournamentId,
                    );
                    if (!hasAccess) {
                        throw new ForbiddenException('No puedes eliminar a este jugador porque no pertenece a tu plantilla.');
                    }
                } else {
                    const isAdmin = trn?.adminId === reqUser.id || trn?.league?.adminId === reqUser.id;
                    if (!isAdmin) {
                        throw new ForbiddenException('No puedes eliminar a este jugador porque pertenece a una liga o torneo que no administras.');
                    }
                }
            }
        }

        // Proceder con el borrado transaccional manual ya que las policies CASCADE del schema pueden ser restrictivas
        return this.prisma.$transaction(async (tx: any) => {
            // 1. Quitar referencias de MVP y Pitcher Ganador/Perdedor/Salvamento en los Juegos
            await tx.$executeRaw`UPDATE games SET mvp_batter1_id = NULL WHERE mvp_batter1_id = ${id}`;
            await tx.$executeRaw`UPDATE games SET mvp_batter2_id = NULL WHERE mvp_batter2_id = ${id}`;
            await tx.$executeRaw`UPDATE games SET winning_pitcher_id = NULL WHERE winning_pitcher_id = ${id}`;
            await tx.$executeRaw`UPDATE games SET losing_pitcher_id = NULL WHERE losing_pitcher_id = ${id}`;
            await tx.$executeRaw`UPDATE games SET save_pitcher_id = NULL WHERE save_pitcher_id = ${id}`;
            
            // 2. Eliminar estadísticas y jugadas activas si el jugador formó parte
            await tx.playerStat.deleteMany({ where: { playerId: id } });
            await tx.lineup.deleteMany({ where: { playerId: id } });
            await tx.lineupChange.deleteMany({ where: { playerInId: id } });
            await tx.lineupChange.deleteMany({ where: { playerOutId: id } });
            await tx.play.deleteMany({ where: { batterId: id } });
            await tx.play.deleteMany({ where: { pitcherId: id } });
            
            // 3. Eliminar la inscripción a los equipos (Rosters)
            await tx.rosterEntry.deleteMany({ where: { playerId: id } });
            
            // 4. Eliminar el registro Maestro del Jugador
            return tx.player.delete({ where: { id } });
        });
    }
}
