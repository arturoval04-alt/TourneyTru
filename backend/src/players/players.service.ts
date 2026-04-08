import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto, BulkCreatePlayersDto, ConfirmImportDto } from './dto/player.dto';

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

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable()
export class PlayersService {
    constructor(private prisma: PrismaService) { }

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
                                tournament: { select: { id: true, name: true, season: true } },
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
            include: { league: true },
        });
        const adminId = tournament?.league?.adminId ?? tournament?.adminId;
        if (!adminId) return;

        const admin = await this.prisma.user.findUnique({ where: { id: adminId } }) as any;
        if (!admin || admin.maxPlayersPerTeam <= 0) return;

        const count = await (this.prisma.rosterEntry as any).count({
            where: { teamId, tournamentId, isActive: true },
        });
        if (count + adding > admin.maxPlayersPerTeam) {
            throw new ForbiddenException({
                code: 'QUOTA_EXCEEDED',
                resource: 'players',
                message: `El límite de tu plan es ${admin.maxPlayersPerTeam} jugadores por equipo. Ya tienes ${count} y estás intentando agregar ${adding}.`,
                limit: admin.maxPlayersPerTeam,
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
                                tournament: { select: { id: true, name: true, season: true } },
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

    async findOne(id: string) {
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

        if (!player) throw new NotFoundException(`Player with id ${id} not found`);
        return player;
    }

    // ── IMPORT (preview por fila) ────────────────────────────────────────────

    async importPlayers(data: BulkCreatePlayersDto, requestingUser: { role: string }) {
        const { teamId, tournamentId, players } = data;

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

    async confirmImport(data: ConfirmImportDto, _requestingUser: { role: string }) {
        const { teamId, tournamentId, toCreate, toRoster } = data;
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
        return this.importPlayers(data, { role: 'organizer' });
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────

    async update(id: string, updateData: UpdatePlayerDto) {
        await this.findOne(id);
        
        const { teamId, tournamentId, number, ...playerData } = updateData;

        // Si se nos envía teamId y tournamentId, actualizamos también su RosterEntry correspondiente.
        if (teamId && tournamentId) {
            const entry = await (this.prisma.rosterEntry as any).findUnique({
                where: { playerId_teamId_tournamentId: { playerId: id, teamId, tournamentId } },
            });
            if (entry) {
                await (this.prisma.rosterEntry as any).update({
                    where: { id: entry.id },
                    data: {
                        ...(number !== undefined ? { number } : {}),
                        ...(playerData.position ? { position: playerData.position } : {}),
                    },
                });
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

    // ── REMOVE ───────────────────────────────────────────────────────────────

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.player.delete({ where: { id } });
    }
}
