import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Requestor } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { AssignUmpireDto, ChangeLineupDto, CreateGameDto, UpdateGameDto, SetGameLineupDto, CambioSustitucionDto, CambioPosicionDto, CambioReingresoDto, ScheduleGameDto } from './dto/game.dto';
import { SubmitManualStatsDto } from './dto/manual-stats.dto';
import { LiveGateway } from '../live/live.gateway';

@Injectable()
export class GamesService {
    constructor(private prisma: PrismaService, private liveGateway: LiveGateway) { }

    private readonly defensivePositions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF'];

    private normalizePosition(position?: string | null): string | null {
        if (!position) return null;
        const raw = position.trim().toUpperCase();
        if (!raw) return null;
        const map: Record<string, string> = {
            '1': 'P', 'P': 'P',
            '2': 'C', 'C': 'C',
            '3': '1B', '1B': '1B',
            '4': '2B', '2B': '2B',
            '5': '3B', '3B': '3B',
            '6': 'SS', 'SS': 'SS',
            '7': 'LF', 'LF': 'LF',
            '8': 'CF', 'CF': 'CF',
            '9': 'RF', 'RF': 'RF',
            '10': 'SF', 'SF': 'SF',   // ShortFielder (pos 10)
            'BD': 'DH', 'DH': 'DH',
            'BE': 'BE',               // Bateador Extra (solo batea)
        };
        return map[raw] || raw;
    }

    private normalizeDefensivePosition(position?: string | null): string | null {
        const normalized = this.normalizePosition(position);
        if (!normalized) return null;
        return this.defensivePositions.includes(normalized) ? normalized : null;
    }

    private validateLineup(lineups: Array<{ position: string; dhForPosition?: string | null }>) {
        const defensiveUsed = new Set<string>();
        for (const lineup of lineups) {
            const normalized = this.normalizePosition(lineup.position);
            // BE (Bateador Extra) has no defensive position — skip defensive check
            if (normalized === 'BE') continue;
            const defensivePos = this.normalizeDefensivePosition(lineup.position);
            if (defensivePos) {
                if (defensiveUsed.has(defensivePos)) {
                    console.error(`[Lineup Validation] Duplicated position: ${defensivePos}`);
                    throw new BadRequestException(`Posición defensiva duplicada: ${defensivePos}.`);
                }
                defensiveUsed.add(defensivePos);
            }
        }

        const dhEntries = lineups.filter((l) => this.normalizePosition(l.position) === 'DH');
        if (dhEntries.length > 1) {
            throw new BadRequestException('Solo se permite un DH estándar por equipo.');
        }
        if (dhEntries.length === 1) {
            const dh = dhEntries[0];
            const anchor = this.normalizeDefensivePosition(dh.dhForPosition);
            if (!anchor) {
                console.error(`[Lineup Validation] DH anchor missing or invalid for role ${dh.dhForPosition}`);
                throw new BadRequestException('Si se usa DH, debe anclarse a una posición defensiva válida.');
            }
            if (!defensiveUsed.has(anchor)) {
                console.error(`[Lineup Validation] DH anchored to ${anchor} but ${anchor} is not in defensive lineup`);
                throw new BadRequestException(`El DH debe anclarse a una posición defensiva presente en el lineup (${anchor}).`);
            }
        }
    }

    async create(data: CreateGameDto) {
        const { fieldId, scheduledDate, status, ...rest } = data as any;

        // Si no tiene fecha ni campo asignado, el juego empieza como draft
        const resolvedStatus = status ?? (scheduledDate ? 'scheduled' : 'draft');

        return this.prisma.game.create({
            data: {
                ...rest,
                status: resolvedStatus,
                ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
                ...(fieldId ? { fieldId } : {}),
            },
        });
    }

    async findAll(filters?: { status?: string; tournamentId?: string; limit?: number; adminId?: string; leagueId?: string; scorekeeperTournamentIds?: string[] }) {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.tournamentId) where.tournamentId = filters.tournamentId;
        if (filters?.adminId) where.tournament = { league: { adminId: filters.adminId } };
        if (filters?.leagueId) where.tournament = { leagueId: filters.leagueId };
        
        if (filters?.scorekeeperTournamentIds && filters.scorekeeperTournamentIds.length > 0) {
            where.tournamentId = { in: filters.scorekeeperTournamentIds };
            // If both tournamentId and scorekeeperTournamentIds are present, tournamentId filter takes precedence but we should ensure it's in the allowed list
            if (filters.tournamentId && !filters.scorekeeperTournamentIds.includes(filters.tournamentId)) {
                where.tournamentId = "__none__";
            }
        }

        return this.prisma.game.findMany({
            where,
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: { select: { name: true, id: true, logoUrl: true, league: { select: { id: true, name: true } } } },
            },
            orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
            ...(filters?.limit ? { take: filters.limit } : {}),
        });
    }

    async findOne(id: string, requestor?: Requestor) {
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                homeTeam: { include: { rosterEntries: { where: { isActive: true }, include: { player: true } } } },
                awayTeam: { include: { rosterEntries: { where: { isActive: true }, include: { player: true } } } },
                tournament: {
                    include: {
                        league: { select: { id: true, adminId: true, isPrivate: true } },
                        organizers: { select: { userId: true } },
                    },
                },
                fieldRef: { select: { id: true, name: true, location: true, sportsUnit: { select: { id: true, name: true } } } },
                winningPitcher: true,
                mvpBatter1: true,
                mvpBatter2: true,
                lineups: {
                    include: { player: true }
                },
                plays: true
            },
        });

        if (!game) {
            throw new NotFoundException(`Game with id ${id} not found`);
        }

        // Privacy: si la liga o el torneo son privados, solo pueden ver el juego
        // quienes tengan acceso a ese torneo.
        const tournament = (game as any).tournament;
        const league = tournament?.league;
        const isSystemAdmin = requestor?.role === 'admin';
        const isOverlayViewer = requestor?.role === 'overlay';

        if (!isSystemAdmin && !isOverlayViewer) {
            if (league?.isPrivate) {
                const isLeagueAdmin = requestor?.id === league.adminId;
                const isAssignedSK = requestor?.role === 'scorekeeper' && requestor.scorekeeperTournamentIds?.includes(game.tournamentId);
                if (!isLeagueAdmin && !isAssignedSK) {
                    throw new ForbiddenException({ code: 'PRIVATE', message: 'Esta liga es privada.' });
                }
            }
            if ((tournament as any)?.isPrivate) {
                const isLeagueAdmin = requestor?.id === league?.adminId;
                const isOrganizer = tournament?.organizers?.some((o: any) => o.userId === requestor?.id);
                const isAssignedSK = requestor?.role === 'scorekeeper' && requestor.scorekeeperTournamentIds?.includes(game.tournamentId);
                if (!isLeagueAdmin && !isOrganizer && !isAssignedSK) {
                    throw new ForbiddenException({ code: 'PRIVATE', message: 'Este torneo es privado.' });
                }
            }
        }

        return game;
    }

    private assertGameOwnership(game: any, requestor?: Requestor) {
        if (!requestor) throw new ForbiddenException('Se requiere autenticaci?n.');
        if (requestor.role === 'admin') return;
        const leagueOwnerId = game.tournament?.league?.adminId;
        const tournamentOwnerId = game.tournament?.adminId;
        const isLeagueOwner = requestor.id === leagueOwnerId;
        const isTournamentOwner = requestor.id === tournamentOwnerId;
        const isOrganizer = game.tournament?.organizers?.some((o: any) => o.userId === requestor.id);
        const isAssignedScorekeeper = requestor.role === 'scorekeeper' && requestor.scorekeeperTournamentIds?.includes(game.tournamentId);

        if (!isLeagueOwner && !isTournamentOwner && !isOrganizer && !isAssignedScorekeeper) {
            throw new ForbiddenException('No tienes permiso para modificar este juego.');
        }
    }

    private async getOwnedGame(gameId: string, requestor?: Requestor) {
        const game = await this.findOne(gameId, requestor);
        this.assertGameOwnership(game, requestor);
        return game;
    }

    /**
     * Verifica si un campo ya está ocupado en la misma fecha/hora dentro de la liga.
     * Respeta minGapMinutes y allowOverlap del scheduleConfig de la unidad deportiva del campo.
     * Lanza ConflictException si hay colisión.
     */
    private async assertNoFieldConflict(
        fieldId: string,
        date: Date,
        startTime?: Date | null,
        endTime?: Date | null,
        excludeGameId?: string,
    ) {
        // Leer config del campo → unidad → scheduleConfig
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
            include: { sportsUnit: true },
        }) as any;

        let avgDurationMinutes = 120;
        let minGapMinutes = 30;
        let allowOverlap = false;

        if (field?.sportsUnit?.scheduleConfig) {
            try {
                const cfg = JSON.parse(field.sportsUnit.scheduleConfig);
                avgDurationMinutes = cfg.avgDurationMinutes ?? avgDurationMinutes;
                minGapMinutes = cfg.minGapMinutes ?? minGapMinutes;
                allowOverlap = cfg.allowOverlap ?? allowOverlap;
            } catch { /* usar defaults */ }
        }

        if (allowOverlap) return; // la unidad permite solapamiento

        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        const nextDay = new Date(dateOnly);
        nextDay.setDate(nextDay.getDate() + 1);

        const activeStatuses = ['scheduled', 'live'];
        const existingGames = await this.prisma.game.findMany({
            where: {
                fieldId,
                status: { in: activeStatuses },
                scheduledDate: { gte: dateOnly, lt: nextDay },
                ...(excludeGameId ? { id: { not: excludeGameId } } : {}),
            },
            select: { id: true, scheduledDate: true, startTime: true, endTime: true },
        });

        if (existingGames.length === 0) return;

        // Hora efectiva de inicio del nuevo juego
        const newStart = startTime ?? date;
        // Hora efectiva de fin: endTime si existe, sino start + avgDuration
        const newEnd = endTime ?? new Date(newStart.getTime() + avgDurationMinutes * 60_000);
        // Ventana con brecha mínima: el nuevo juego no puede empezar hasta minGap después de que termina otro
        const newStartWithGap = new Date(newStart.getTime() - minGapMinutes * 60_000);
        const newEndWithGap = new Date(newEnd.getTime() + minGapMinutes * 60_000);

        for (const g of existingGames) {
            const gStart = g.startTime ?? g.scheduledDate;
            if (!gStart) continue;
            const gEnd = g.endTime ?? new Date((gStart as Date).getTime() + avgDurationMinutes * 60_000);

            // Solapamiento incluyendo brecha mínima
            const overlaps = newStartWithGap < gEnd && newEndWithGap > gStart;
            if (overlaps) {
                const gStartStr = (gStart as Date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                throw new (await import('@nestjs/common')).ConflictException(
                    `El campo ya tiene un juego a las ${gStartStr}. Se requiere una brecha de al menos ${minGapMinutes} min entre juegos.`,
                );
            }
        }
    }

    /**
     * Asigna campo, fecha y/o hora a un juego (idealmente en estado draft).
     * Valida conflictos de horario a nivel liga.
     */
    async scheduleGame(id: string, dto: ScheduleGameDto, requestor?: Requestor) {
        const game = await this.getOwnedGame(id, requestor) as any;

        const fieldId = dto.fieldId ?? game.fieldId ?? null;
        const scheduledDate = dto.scheduledDate ? new Date(dto.scheduledDate) : game.scheduledDate;

        if (fieldId && scheduledDate) {
            const startTime = dto.startTime
                ? new Date(`${dto.scheduledDate ?? scheduledDate.toISOString().slice(0, 10)}T${dto.startTime}:00`)
                : game.startTime ?? null;
            const endTime = dto.endTime
                ? new Date(`${dto.scheduledDate ?? scheduledDate.toISOString().slice(0, 10)}T${dto.endTime}:00`)
                : game.endTime ?? null;

            await this.assertNoFieldConflict(fieldId, scheduledDate, startTime, endTime, id);
        }

        const updateData: any = {};
        if (dto.fieldId !== undefined) updateData.fieldId = dto.fieldId;
        if (dto.scheduledDate !== undefined) updateData.scheduledDate = new Date(dto.scheduledDate);
        if (dto.startTime !== undefined) {
            const baseDate = dto.scheduledDate ?? (scheduledDate ? scheduledDate.toISOString().slice(0, 10) : null);
            updateData.startTime = baseDate ? new Date(`${baseDate}T${dto.startTime}:00`) : null;
        }
        if (dto.endTime !== undefined) {
            const baseDate = dto.scheduledDate ?? (scheduledDate ? scheduledDate.toISOString().slice(0, 10) : null);
            updateData.endTime = baseDate ? new Date(`${baseDate}T${dto.endTime}:00`) : null;
        }
        if (dto.round !== undefined) updateData.round = dto.round;

        // Si el juego era draft y ahora tiene campo + fecha, lo promueve a 'scheduled'
        if (game.status === 'draft' && updateData.fieldId && updateData.scheduledDate) {
            updateData.status = 'scheduled';
        }

        return this.prisma.game.update({ where: { id }, data: updateData });
    }

    async update(id: string, updateData: UpdateGameDto, requestor?: Requestor) {
        const game = await this.getOwnedGame(id, requestor);
        
        // Ensure empty strings are casted to undefined so Prisma ignores them correctly instead of throwing 400 Bad Request
        if (updateData.winningPitcherId === "") updateData.winningPitcherId = undefined;
        if (updateData.losingPitcherId === "") updateData.losingPitcherId = undefined;
        if (updateData.savePitcherId === "") updateData.savePitcherId = undefined;
        if (updateData.mvpBatter1Id === "") updateData.mvpBatter1Id = undefined;
        if (updateData.mvpBatter2Id === "") updateData.mvpBatter2Id = undefined;

        // Ensure fields exist before trying to create relation edits, otherwise ignore.
        const prismaUpdateData: any = { ...updateData };

        const updated = await this.prisma.game.update({
            where: { id },
            data: prismaUpdateData,
        });

        // Auto-recalculate standings when a game is finalized
        if (updateData.status === 'finished' && game.status !== 'finished') {
            try {
                await this.recalculateStandings(game.tournamentId);
                await this.cleanupStreamerPlayers(id);
            } catch (err) {
                console.error('[Standings/Cleanup] Error:', err);
            }
        }

        return updated;
    }

    /** Recalculate tournament standings from all finished games */
    private async recalculateStandings(tournamentId: string) {
        const games = await this.prisma.game.findMany({
            where: { tournamentId, status: 'finished' },
            select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
        });
        const teams = await this.prisma.team.findMany({
            where: { tournamentId },
            select: { id: true },
        });

        const standings: Record<string, { wins: number; losses: number; ties: number; runsFor: number; runsAgainst: number; results: string[] }> = {};
        for (const t of teams) standings[t.id] = { wins: 0, losses: 0, ties: 0, runsFor: 0, runsAgainst: 0, results: [] };

        for (const g of games) {
            const home = standings[g.homeTeamId];
            const away = standings[g.awayTeamId];
            if (!home || !away) continue;
            home.runsFor += g.homeScore; home.runsAgainst += g.awayScore;
            away.runsFor += g.awayScore; away.runsAgainst += g.homeScore;
            if (g.homeScore > g.awayScore) { home.wins++; home.results.push('W'); away.losses++; away.results.push('L'); }
            else if (g.awayScore > g.homeScore) { away.wins++; away.results.push('W'); home.losses++; home.results.push('L'); }
            else { home.ties++; home.results.push('T'); away.ties++; away.results.push('T'); }
        }

        const calcStreak = (r: string[]) => {
            if (!r.length) return '-';
            const last = r[r.length - 1];
            let c = 0;
            for (let i = r.length - 1; i >= 0; i--) { if (r[i] === last) c++; else break; }
            return `${last}${c}`;
        };

        const upserts = Object.entries(standings).map(([teamId, s]) =>
            this.prisma.standing.upsert({
                where: { teamId_tournamentId: { teamId, tournamentId } },
                create: { teamId, tournamentId, wins: s.wins, losses: s.losses, ties: s.ties, runsFor: s.runsFor, runsAgainst: s.runsAgainst, streak: calcStreak(s.results) },
                update: { wins: s.wins, losses: s.losses, ties: s.ties, runsFor: s.runsFor, runsAgainst: s.runsAgainst, streak: calcStreak(s.results), lastUpdated: new Date() },
            }),
        );

        await this.prisma.$transaction(upserts);
        console.log(`[Standings] Recalculated for tournament ${tournamentId}`);
    }

    async remove(id: string, requestor?: Requestor) {
        const game = await this.getOwnedGame(id, requestor);
        return this.prisma.game.delete({
            where: { id },
        });
    }

    /**
     * Elimina jugadores temporales creados por streamers que no tienen jugadas/stats vinculadas
     * o que ya cumplieron su propósito en este juego finalizado.
     */
    private async cleanupStreamerPlayers(gameId: string) {
        // Encontrar jugadores creados por streamer que estuvieron en este juego
        const streamerPlayers = await (this.prisma.player as any).findMany({
            where: {
                isStreamerCreated: true,
                rosterEntries: { some: { gameId: gameId } } // Assuming rosterEntry might have gameId for temp players, or just linked via team/tournament
            }
        });

        // Alternativa: buscar en RosterEntries del torneo/equipo del juego
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;

        const playersInGame = await (this.prisma.player as any).findMany({
            where: {
                isStreamerCreated: true,
                rosterEntries: {
                    some: {
                        tournamentId: game.tournamentId,
                        teamId: { in: [game.homeTeamId, game.awayTeamId] }
                    }
                }
            },
            include: {
                _count: {
                    select: {
                        playsAsBatter: true,
                        playsAsPitcher: true,
                        playerStats: true,
                        rosterEntries: true
                    }
                }
            }
        });

        for (const player of playersInGame) {
            // Si el jugador solo tiene el roster entry de este torneo y ninguna jugada real vinculada (o solo en este juego)
            // los borramos si así lo desea el sistema para mantener limpieza.
            // NOTA: Por ahora solo borramos los que NO tienen jugadas para evitar romper el historial.
            if (player._count.playsAsBatter === 0 && player._count.playsAsPitcher === 0) {
                await (this.prisma.player as any).delete({ where: { id: player.id } }).catch(() => {});
            }
        }
    }

    async setLineup(gameId: string, teamId: string, lineupData: SetGameLineupDto, requestor?: Requestor) {
        console.log(`[GamesService] Starting setLineup for game ${gameId}, team ${teamId}`);
        try {
            const game = await this.getOwnedGame(gameId, requestor);

            if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
                console.error(`[Lineup Error] Team ${teamId} is not part of game ${gameId}`);
                throw new BadRequestException('El equipo no pertenece a este juego.');
            }

            this.validateLineup(lineupData.lineups);

            // Primero, eliminar todo el lineup existente de este equipo en este juego
            await this.prisma.lineup.deleteMany({
                where: { gameId, teamId }
            });

            if (!lineupData.lineups || lineupData.lineups.length === 0) {
                console.log(`[GamesService] Lineup empty for team ${teamId}, deletion complete.`);
                return { success: true, message: 'Lineup cleared' };
            }

            const dataToInsert = lineupData.lineups.map(l => ({
                gameId: gameId,
                teamId: teamId,
                playerId: l.playerId,
                position: l.position,
                battingOrder: l.battingOrder,
                dhForPosition: l.dhForPosition || null,
                isStarter: l.isStarter !== undefined ? l.isStarter : true
            }));

            await this.prisma.lineup.createMany({
                data: dataToInsert
            });

            console.log(`[GamesService] Lineup saved successfully for team ${teamId}`);
            return { success: true };
        } catch (error) {
            console.error(`[SET_LINEUP_FATAL_ERROR] Game: ${gameId}, Team: ${teamId}`);
            console.error(error);
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Error interno al procesar lineups: ${error.message}`);
        }
    }

    async changeLineup(gameId: string, change: ChangeLineupDto, requestor?: Requestor) {
        const game = await this.getOwnedGame(gameId, requestor);

        if (change.teamId !== game.homeTeamId && change.teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        const currentLineup = await this.prisma.lineup.findMany({
            where: { gameId, teamId: change.teamId },
            orderBy: { battingOrder: 'asc' },
        });

        if (currentLineup.length === 0) {
            throw new NotFoundException('No hay lineup registrado para este equipo.');
        }

        const lineupEntry = currentLineup.find((l) => l.battingOrder === change.battingOrder);
        if (!lineupEntry) {
            throw new NotFoundException('No se encontró el turno indicado en el lineup.');
        }

        const playerInEntry = await (this.prisma.rosterEntry as any).findFirst({
            where: { playerId: change.playerInId, teamId: change.teamId, isActive: true },
        });
        if (!playerInEntry) {
            throw new BadRequestException('El jugador seleccionado no pertenece al equipo.');
        }

        const normalizedPosition = this.normalizePosition(change.position);
        const dhAnchor = normalizedPosition === 'DH' ? this.normalizeDefensivePosition(change.dhForPosition) : null;

        const proposedLineup = currentLineup.map((l) => (
            l.id === lineupEntry.id
                ? { ...l, playerId: change.playerInId, position: change.position, dhForPosition: dhAnchor }
                : l
        ));

        this.validateLineup(proposedLineup);

        const updated = await this.prisma.lineup.update({
            where: { id: lineupEntry.id },
            data: {
                playerId: change.playerInId,
                position: change.position,
                dhForPosition: dhAnchor,
                isStarter: false,
            },
        });

        await this.prisma.lineupChange.create({
            data: {
                gameId,
                teamId: change.teamId,
                battingOrder: change.battingOrder,
                playerOutId: change.playerOutId ?? lineupEntry.playerId,
                playerInId: change.playerInId,
                position: change.position,
                dhForPosition: dhAnchor,
            },
        });

        return updated;
    }

    async getCambiosEligibles(gameId: string, teamId: string, requestor?: Requestor) {
        const game = await this.findOne(gameId, requestor);
        if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        const currentLineup = await this.prisma.lineup.findMany({
            where: { gameId, teamId },
            include: { player: true },
            orderBy: { battingOrder: 'asc' },
        });

        const rosterEntries = await (this.prisma.rosterEntry as any).findMany({
            where: { teamId, isActive: true },
            include: { player: true },
            orderBy: [{ player: { lastName: 'asc' } }, { player: { firstName: 'asc' } }],
        });
        const numberByPlayerId = new Map<string, number | null>(
            rosterEntries.map((e: any) => [e.playerId, e.number ?? null])
        );

        const activeLineup = currentLineup.filter(l => (l as any).isActive);
        const inactiveLineup = currentLineup.filter(l => !(l as any).isActive);
        const allLineupPlayerIds = new Set(currentLineup.map(l => l.playerId));

        // Jugadores que pueden salir: todos los activos actualmente
        const puedenSalir = activeLineup.map(l => ({
            lineupId: l.id,
            playerId: l.playerId,
            battingOrder: l.battingOrder,
            position: l.position,
            dhForPosition: l.dhForPosition,
            isStarter: l.isStarter,
            firstName: l.player.firstName,
            lastName: l.player.lastName,
            number: numberByPlayerId.get(l.playerId) ?? null,
        }));

        // Jugadores que pueden entrar (sustitución): jugadores del roster que
        // nunca han aparecido en el lineup de este juego (ni activos ni inactivos)
        const puedenEntrar = rosterEntries
            .filter((e: any) => !allLineupPlayerIds.has(e.playerId))
            .map((e: any) => ({
                playerId: e.playerId,
                firstName: e.player.firstName,
                lastName: e.player.lastName,
                number: e.number ?? null,
            }));

        // Jugadores que pueden reingresar: starters inactivos que no han usado reingreso
        const puedenReingresar = inactiveLineup
            .filter(l => l.isStarter && !(l as any).hasUsedReentry)
            .map(l => {
                // quién ocupa su batting order actualmente
                const sustituto = activeLineup.find(a => a.battingOrder === l.battingOrder);
                return {
                    lineupId: l.id,
                    playerId: l.playerId,
                    battingOrder: l.battingOrder,
                    position: l.position,
                    dhForPosition: l.dhForPosition,
                    firstName: l.player.firstName,
                    lastName: l.player.lastName,
                    number: numberByPlayerId.get(l.playerId) ?? null,
                    sustitutoActual: sustituto ? {
                        lineupId: sustituto.id,
                        playerId: sustituto.playerId,
                        firstName: sustituto.player.firstName,
                        lastName: sustituto.player.lastName,
                        number: numberByPlayerId.get(sustituto.playerId) ?? null,
                    } : null,
                };
            });

        return { puedenSalir, puedenEntrar, puedenReingresar };
    }

    /**
     * Sustitución (bateo y fildeo): sale un jugador activo, entra uno del roster no usado.
     */
    async cambioSustitucion(gameId: string, dto: CambioSustitucionDto, requestor?: Requestor) {
        const game = await this.getOwnedGame(gameId, requestor);
        if (dto.teamId !== game.homeTeamId && dto.teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        const currentLineup = await this.prisma.lineup.findMany({
            where: { gameId, teamId: dto.teamId },
            orderBy: { battingOrder: 'asc' },
        });

        const playerOut = currentLineup.find(l => l.playerId === dto.playerOutId && (l as any).isActive);
        if (!playerOut) {
            throw new BadRequestException('El jugador que sale no está activo en el lineup.');
        }

        // Jugador entrante: no debe estar ya en el lineup (ni activo ni inactivo)
        const alreadyInLineup = currentLineup.find(l => l.playerId === dto.playerInId);
        if (alreadyInLineup) {
            throw new BadRequestException('El jugador entrante ya ha participado en el juego.');
        }

        const playerInEntry2 = await (this.prisma.rosterEntry as any).findFirst({
            where: { playerId: dto.playerInId, teamId: dto.teamId, isActive: true },
        });
        if (!playerInEntry2) {
            throw new BadRequestException('El jugador no pertenece al equipo.');
        }

        const normalizedPosition = this.normalizePosition(dto.position);
        const dhAnchor = normalizedPosition === 'DH' ? this.normalizeDefensivePosition(dto.dhForPosition) : null;

        // Proponer nuevo lineup: marcar saliente como inactivo, insertar entrante
        const remainingActive = currentLineup.filter(l => (l as any).isActive && l.id !== playerOut.id);

        // Validación dirigida (no re-validar anclas de DH preexistentes en el lineup):
        // 1. No puede haber posiciones defensivas duplicadas con el nuevo jugador
        const defensiveUsed = new Set<string>();
        for (const l of remainingActive) {
            const dp = this.normalizeDefensivePosition(l.position);
            if (dp) defensiveUsed.add(dp);
        }
        const incomingDefPos = this.normalizeDefensivePosition(dto.position);
        if (incomingDefPos && defensiveUsed.has(incomingDefPos)) {
            throw new BadRequestException(`Posición defensiva duplicada: ${incomingDefPos}.`);
        }
        // 2. Si el entrante es DH, debe anclar a una posición defensiva válida
        if (normalizedPosition === 'DH') {
            if (!dhAnchor) {
                throw new BadRequestException('Si se usa DH, debe anclarse a una posición defensiva válida.');
            }
            if (!defensiveUsed.has(dhAnchor)) {
                throw new BadRequestException(`El DH debe anclarse a una posición defensiva presente en el lineup (${dhAnchor}).`);
            }
        }

        // Marcar al saliente como inactivo en el lineup
        await (this.prisma.lineup as any).update({
            where: { id: playerOut.id },
            data: { isActive: false },
        });

        // Insertar nuevo jugador en el mismo batting order
        await (this.prisma.lineup as any).create({
            data: {
                gameId,
                teamId: dto.teamId,
                playerId: dto.playerInId,
                battingOrder: playerOut.battingOrder,
                position: dto.position,
                dhForPosition: dhAnchor,
                isStarter: false,
                isActive: true,
                hasUsedReentry: false,
            },
        });

        await (this.prisma.lineupChange as any).create({
            data: {
                gameId,
                teamId: dto.teamId,
                changeType: 'SUBSTITUTION',
                battingOrder: playerOut.battingOrder,
                playerOutId: dto.playerOutId,
                playerInId: dto.playerInId,
                position: dto.position,
                dhForPosition: dhAnchor,
            },
        });

        return { status: 'success', message: 'Sustitución registrada.' };
    }

    /**
     * Cambio de posición (solo defensivo): intercambio entre jugadores ya en el lineup activo.
     * Recibe un array de swaps [{fromPosition, toPosition}] que puede ser circular.
     */
    async cambioPosicion(gameId: string, dto: CambioPosicionDto, requestor?: Requestor) {
        const game = await this.getOwnedGame(gameId, requestor);
        if (dto.teamId !== game.homeTeamId && dto.teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        const currentLineup = await (this.prisma.lineup as any).findMany({
            where: { gameId, teamId: dto.teamId, isActive: true },
        }) as any[];

        // Validar que todas las posiciones origen existen en el lineup activo
        for (const swap of dto.swaps) {
            const fromNorm = this.normalizePosition(swap.fromPosition) ?? swap.fromPosition;
            const toNorm = this.normalizePosition(swap.toPosition) ?? swap.toPosition;
            const entry = currentLineup.find((l: any) => this.normalizePosition(l.position) === fromNorm);
            if (!entry) {
                throw new BadRequestException(`La posición ${swap.fromPosition} no está en el lineup activo.`);
            }
            if (!this.defensivePositions.includes(toNorm)) {
                throw new BadRequestException(`La posición destino ${swap.toPosition} no es una posición defensiva válida.`);
            }
        }

        // Construir mapa de nuevas posiciones: para cada fromPosition, asignar toPosition
        const positionMap = new Map<string, string>(); // fromNorm -> toNorm
        for (const swap of dto.swaps) {
            positionMap.set(
                this.normalizePosition(swap.fromPosition) ?? swap.fromPosition,
                this.normalizePosition(swap.toPosition) ?? swap.toPosition,
            );
        }

        // Actualizar cada entrada del lineup afectada
        const updates: Promise<any>[] = [];
        const changes: Array<{ playerId: string; battingOrder: number; oldPos: string; newPos: string }> = [];

        for (const entry of currentLineup) {
            const normPos = this.normalizePosition(entry.position) ?? entry.position;
            if (positionMap.has(normPos)) {
                const newPos = positionMap.get(normPos)!;
                updates.push(
                    this.prisma.lineup.update({
                        where: { id: entry.id },
                        data: { position: newPos },
                    }),
                );
                changes.push({ playerId: entry.playerId as string, battingOrder: entry.battingOrder as number, oldPos: normPos, newPos });
            }
        }

        if (updates.length === 0) {
            throw new BadRequestException('Ninguna posición del swap coincidió con el lineup activo.');
        }

        await Promise.all(updates);

        // Registrar un LineupChange por cada movimiento (playerOut = mismo jugador = posición cambiada)
        for (const change of changes) {
            await (this.prisma.lineupChange as any).create({
                data: {
                    gameId,
                    teamId: dto.teamId,
                    changeType: 'POSITION_ONLY',
                    battingOrder: change.battingOrder,
                    playerOutId: change.playerId,
                    playerInId: change.playerId,
                    position: change.newPos,
                    dhForPosition: null,
                },
            });
        }

        return { status: 'success', message: 'Posiciones actualizadas.', changes };
    }

    /**
     * Reingreso: un titular (isStarter=true, isActive=false, hasUsedReentry=false) regresa.
     * El sustituto que lo había reemplazado sale permanentemente.
     * El titular recupera su batting order y posición original.
     */
    async cambioReingreso(gameId: string, dto: CambioReingresoDto, requestor?: Requestor) {
        const game = await this.getOwnedGame(gameId, requestor);
        if (dto.teamId !== game.homeTeamId && dto.teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        const currentLineup = await this.prisma.lineup.findMany({
            where: { gameId, teamId: dto.teamId },
            include: { player: true },
            orderBy: { battingOrder: 'asc' },
        });

        // Buscar al titular en el lineup histórico
        const starterEntry = currentLineup.find(
            (l: any) => l.playerId === dto.starterPlayerId && l.isStarter && !l.isActive && !l.hasUsedReentry,
        ) as any;
        if (!starterEntry) {
            throw new BadRequestException('El jugador no puede reingresar (no es titular, ya reingresó, o está activo).');
        }

        // El sustituto actual es quien ocupa el mismo batting order y está activo
        const sustituto = currentLineup.find(
            (l: any) => l.battingOrder === starterEntry.battingOrder && l.isActive,
        ) as any;
        if (!sustituto) {
            throw new BadRequestException('No se encontró el sustituto activo en ese batting order.');
        }

        // Marcar sustituto como inactivo permanentemente (ya no puede reingresar, no es starter)
        await (this.prisma.lineup as any).update({
            where: { id: sustituto.id },
            data: { isActive: false },
        });

        // Reactivar al titular y marcar que ya usó su reingreso
        await (this.prisma.lineup as any).update({
            where: { id: starterEntry.id },
            data: { isActive: true, hasUsedReentry: true },
        });

        await (this.prisma.lineupChange as any).create({
            data: {
                gameId,
                teamId: dto.teamId,
                changeType: 'REENTRY',
                battingOrder: starterEntry.battingOrder,
                playerOutId: sustituto.playerId,
                playerInId: dto.starterPlayerId,
                position: starterEntry.position,
                dhForPosition: starterEntry.dhForPosition,
            },
        });

        return { status: 'success', message: 'Reingreso registrado.' };
    }

    async getGameBoxscore(id: string, requestor?: Requestor) {
        await this.findOne(id, requestor);
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: true,
                winningPitcher: true,
                mvpBatter1: true,
                mvpBatter2: true,
                lineups: {
                    include: { player: true },
                    orderBy: [{ battingOrder: 'asc' }, { isStarter: 'desc' }]
                },
                plays: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!game) throw new NotFoundException(`Game with id ${id} not found`);

        const initTeamBoxscore = (team: any, lineups: any[]): any => {
            const teamLineup = lineups.filter(l => l.teamId === team.id);

            // Identify which defensive position(s) are covered by a DH.
            // Those fielders are defense-only (FLEX) — they should NOT have at-bats in the boxscore,
            // but they MUST remain in the lineup array so their pitching stats can be accumulated.
            const dhCoveredPositions = new Set<string>(
                teamLineup
                    .filter(l => this.normalizePosition(l.position) === 'DH' && l.dhForPosition)
                    .map(l => this.normalizeDefensivePosition(l.dhForPosition))
                    .filter((p): p is string => p !== null)
            );

            return {
                teamId: team.id,
                teamName: team.name,
                totalRuns: 0,
                totalHits: 0,
                totalErrors: 0,
                runsByInning: {},
                lastBatterByInning: {}, // Track who was the last to have a main play in each inning
                lineup: teamLineup.map(l => {
                    // Determine if this player is the FLEX (defense-only, covered by DH)
                    const normPos = this.normalizeDefensivePosition(l.position);
                    const isFlexPlayer = dhCoveredPositions.size > 0 && !!normPos && dhCoveredPositions.has(normPos);

                    let entryInning: number | undefined = undefined;
                    if (!l.isStarter) {
                        const lTime = new Date(l.createdAt).getTime();
                        const nextPlay = game.plays.find((p: any) => new Date(p.timestamp || p.createdAt).getTime() >= lTime);
                        if (nextPlay) {
                            entryInning = nextPlay.inning;
                        } else {
                            entryInning = game.currentInning || 1;
                        }
                    }

                    return {
                        playerId: l.player.id,
                        firstName: l.player.firstName,
                        lastName: l.player.lastName,
                        position: l.position,
                        battingOrder: l.battingOrder,
                        isStarter: l.isStarter,
                        isFlex: isFlexPlayer,
                        entryInning,
                        atBats: 0,
                        runs: 0,
                        hits: 0,
                        rbi: 0,
                        bb: 0,
                        so: 0,
                        pitchingIPOuts: 0,
                        pitchingSO: 0,
                        pitchingBB: 0,
                        pitchingHits: 0,
                        pitchingRuns: 0,
                        pitchingEarnedRuns: 0,
                        plays: {}
                    };
                })
            };
        };

        const homeBox = initTeamBoxscore(game.homeTeam, game.lineups);
        const awayBox = initTeamBoxscore(game.awayTeam, game.lineups);

        // Earned run tracking: runners who reached via error are "tainted" — any run
        // they score is unearned. The set resets at the start of each new half-inning.
        const taintedRunners = new Set<string>();
        let currentHalfKey = '';

        // Process plays
        for (const playObj of game.plays) {
            const play = playObj as any; // Temporary cast until prisma generate succeeds
            // Skip internal control plays (UNDO markers) that shouldn't affect the boxscore
            const resultCode = (play.result || '').split('|')[0].toUpperCase().trim();
            if (resultCode.includes('UNDO')) continue;

            const isTop = play.half === 'top';
            const battingBox = isTop ? awayBox : homeBox;

            // Reset taint set at each new half-inning
            const halfKey = `${play.inning}-${play.half}`;
            if (halfKey !== currentHalfKey) {
                currentHalfKey = halfKey;
                taintedRunners.clear();
            }
            // A batter who reaches via a fielding error is an unearned runner
            if ((play.result || '').toUpperCase().match(/^E\d/)) {
                taintedRunners.add(play.batterId);
            }

            // Find batter in lineup (robust comparison)
            const batter = battingBox.lineup.find((b: any) =>
                b.playerId?.toString().trim() === play.batterId?.toString().trim()
            );

            // Find pitcher in defensive lineup
            const defensiveBox = isTop ? homeBox : awayBox;
            const pitcher = defensiveBox.lineup.find((p: any) =>
                p.playerId?.toString().trim() === play.pitcherId?.toString().trim()
            );

            // WP_RUN / RUN_SCORED / SB / CS / ADV: updates to a runner's existing play entry.
            // These should modify the runner's existing diamond, NOT create new cells.
            const resultUpper = (play.result || '').toUpperCase();
            const isRunScore = resultUpper.startsWith('WP_RUN') || resultUpper.startsWith('RUN_SCORED');
            const isStolenBase = resultUpper.startsWith('SB');
            const isCaughtStealing = resultUpper.startsWith('CS');
            const isAdvance = resultUpper.startsWith('ADV');
            const isRunnerOut = resultUpper.startsWith('RUNNER_OUT');
            
            if (isRunScore || isStolenBase || isCaughtStealing || isAdvance || isRunnerOut) {
                // WP_RUN / SB→home / ADV→home: carreras reales no contadas en ninguna otra jugada
                // RUN_SCORED: ya está contado en el hit/BB primario — NO sumar de nuevo
                if (!resultUpper.startsWith('RUN_SCORED') && play.runsScored > 0) {
                    battingBox.runsByInning[play.inning] = (battingBox.runsByInning[play.inning] || 0) + play.runsScored;
                    battingBox.totalRuns += play.runsScored;
                }
                if (batter) {
                    if (isRunScore || (isStolenBase && play.runsScored > 0)) {
                        batter.runs += 1;
                    }
                    // Find the runner's most recent play in this (or any) inning and update it
                    let updated = false;
                    for (let inn = play.inning; inn >= 1 && !updated; inn--) {
                        const existingPlays = batter.plays[inn];
                        if (existingPlays && existingPlays.length > 0) {
                            const lastPlay = existingPlays[existingPlays.length - 1];

                            // Merge the new result (e.g. "BB|SB" or "H1|RUNNER_OUT")
                            if (!lastPlay.result.includes(play.result)) {
                                lastPlay.result = `${lastPlay.result}|${play.result}`;
                            }

                            if (isRunScore) {
                                lastPlay.runsScored = 1; // Mark THIS individual play as a score
                                lastPlay.scored = true;  // Explicit flag for the frontend
                            }
                            if (isRunnerOut) {
                                // Credit the pitcher with the out recorded on this runner
                                if (pitcher) {
                                    pitcher.pitchingIPOuts = (pitcher.pitchingIPOuts || 0) + (play.outsRecorded || 0);
                                }
                            }
                            if (isRunScore && pitcher) {
                                pitcher.pitchingRuns = (pitcher.pitchingRuns || 0) + 1;
                                // Earned only if runner did NOT reach via error AND not flagged as phantom-out unearned
                                const isUnearned = taintedRunners.has(play.batterId) || resultUpper.includes('UNEARNED');
                                if (!isUnearned) {
                                    pitcher.pitchingEarnedRuns = (pitcher.pitchingEarnedRuns || 0) + 1;
                                }
                            }
                            updated = true;
                        }
                    }

                    // If no prior play found, this runner entered via substitution (pinch runner).
                    // Create a synthetic PR entry so their advancement is visible in the boxscore.
                    if (!updated && (isAdvance || isRunScore)) {
                        if (!batter.plays[play.inning]) batter.plays[play.inning] = [];
                        const prResult = `PR|${play.result}`;
                        batter.plays[play.inning].push({
                            result: prResult,
                            outsBeforePlay: play.outsBeforePlay ?? 0,
                            outsRecorded: 0,
                            runsScored: isRunScore ? 1 : 0,
                            rbi: 0,
                            scored: isRunScore,
                        });
                        if (isRunScore && pitcher) {
                            pitcher.pitchingRuns = (pitcher.pitchingRuns || 0) + 1;
                            const isUnearned = taintedRunners.has(play.batterId) || resultUpper.includes('UNEARNED');
                            if (!isUnearned) {
                                pitcher.pitchingEarnedRuns = (pitcher.pitchingEarnedRuns || 0) + 1;
                            }
                        }
                    }
                }
                // Even if not merged, don't create a new diamond for runner-only actions
                continue;
            }

            // Smart Consolidation for At-Bats: 
            // If the same batter has multiple plays in the SAME inning and NO other batter 
            // came in between, it's just an update to the current plate appearance.
            const lastBatterInInning = battingBox.lastBatterByInning?.[play.inning];
            const isSameAppearance = lastBatterInInning === play.batterId;

            // Increment run by inning (only for non-RUN_SCORED plays)
            if (play.runsScored > 0) {
                battingBox.runsByInning[play.inning] = (battingBox.runsByInning[play.inning] || 0) + play.runsScored;
                battingBox.totalRuns += play.runsScored;
            }

            if (batter) {
                // Smart Consolidation: If this is the same consecutive appearance in the inning
                if (isSameAppearance && (batter.plays[play.inning] || []).length > 0) {
                    const inningPlays = batter.plays[play.inning];
                    const lastPlay = inningPlays[inningPlays.length - 1];
                    const isGeneric = ['OUT', 'GO', 'FO', 'LO', '?', 'H', 'H1', 'PO'].includes(lastPlay.result.toUpperCase());

                    if (isGeneric && !['BB', 'SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED'].includes(play.result.toUpperCase())) {
                        // REVERSE previous stats if they counted
                        const oldIsAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'FC'].includes(lastPlay.result.toUpperCase()) && !lastPlay.result.toUpperCase().match(/^E\d$/);
                        if (oldIsAtBat) batter.atBats = Math.max(0, batter.atBats - 1);
                        if (lastPlay.result.toUpperCase() === 'BB') batter.bb = Math.max(0, batter.bb - 1);
                        if (lastPlay.result.toUpperCase().startsWith('K')) batter.so = Math.max(0, batter.so - 1);
                        if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(lastPlay.result.toUpperCase())) {
                            batter.hits = Math.max(0, batter.hits - 1);
                            battingBox.totalHits = Math.max(0, battingBox.totalHits - 1);
                        }
                        batter.rbi = Math.max(0, batter.rbi - lastPlay.rbi);
                        // REVERSE pitcher stats for old play
                        if (pitcher) {
                            pitcher.pitchingIPOuts = Math.max(0, (pitcher.pitchingIPOuts || 0) - (lastPlay.outsRecorded || 0));
                            if (lastPlay.result.toUpperCase().startsWith('K')) pitcher.pitchingSO = Math.max(0, (pitcher.pitchingSO || 0) - 1);
                            if (lastPlay.result.toUpperCase() === 'BB') pitcher.pitchingBB = Math.max(0, (pitcher.pitchingBB || 0) - 1);
                            if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(lastPlay.result.toUpperCase())) pitcher.pitchingHits = Math.max(0, (pitcher.pitchingHits || 0) - 1);
                            if (['HR', 'H4'].includes(lastPlay.result.toUpperCase())) {
                                pitcher.pitchingRuns = Math.max(0, (pitcher.pitchingRuns || 0) - 1);
                                pitcher.pitchingEarnedRuns = Math.max(0, (pitcher.pitchingEarnedRuns || 0) - 1);
                            }
                        }

                        // REPLACE the record
                        lastPlay.result = play.result;
                        lastPlay.outsRecorded = play.outsRecorded;
                        lastPlay.outsBeforePlay = play.outsBeforePlay;
                        lastPlay.runsScored = play.runsScored;
                        lastPlay.rbi = play.rbi;
                        lastPlay.scored = play.scored || false;

                        // FORWARD new stats
                        const isError = play.result.toUpperCase().match(/^E\d$/);
                        const isAtBat = !['BB', 'IBB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'FC', 'SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED', 'KWP'].includes(play.result.toUpperCase()) && !isError;
                        if (isAtBat) batter.atBats += 1;
                        if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(play.result.toUpperCase())) {
                            batter.hits += 1;
                            battingBox.totalHits += 1;
                        }
                        if (play.result.toUpperCase() === 'BB' || play.result.toUpperCase() === 'IBB') batter.bb += 1;
                        if (play.result.toUpperCase().startsWith('K') || play.result.toUpperCase() === 'KWP') batter.so += 1;
                        batter.rbi += play.rbi;
                        // H1/H2/H3: batter stays on base — runners' runs come from RUN_SCORED plays
                        // HR/H4: batter scores exactly 1 run
                        // BB: forced runner's run comes from RUN_SCORED — batter doesn't score
                        // ADV / other: batter_id IS the runner, so runsScored is theirs
                        { const ru = play.result.toUpperCase();
                          if (['HR', 'H4'].includes(ru)) { batter.runs += 1; }
                          else if (!['H1', 'H2', 'H3', '1B', '2B', '3B', 'BB'].includes(ru) && play.runsScored > 0) { batter.runs += play.runsScored; } }

                        // FORWARD pitcher stats for new play
                        if (pitcher) {
                            pitcher.pitchingIPOuts = (pitcher.pitchingIPOuts || 0) + (play.outsRecorded || 0);
                            if (play.result.toUpperCase().startsWith('K')) pitcher.pitchingSO = (pitcher.pitchingSO || 0) + 1;
                            if (play.result.toUpperCase() === 'BB') pitcher.pitchingBB = (pitcher.pitchingBB || 0) + 1;
                            if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(play.result.toUpperCase())) pitcher.pitchingHits = (pitcher.pitchingHits || 0) + 1;
                            if (['HR', 'H4'].includes(play.result.toUpperCase())) {
                                // HR is always an earned run (batter didn't reach via error)
                                pitcher.pitchingRuns = (pitcher.pitchingRuns || 0) + 1;
                                pitcher.pitchingEarnedRuns = (pitcher.pitchingEarnedRuns || 0) + 1;
                            }
                        }

                        // Don't add a new play entry
                        continue;
                    }
                }

                // Normal At-Bat processing
                const isError = play.result.toUpperCase().match(/^E\d$/);
                const isAtBat = !['BB', 'IBB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'FC', 'SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED', 'RUNNER_OUT', 'KWP'].includes(play.result.toUpperCase()) && !isError;
                if (isAtBat) batter.atBats += 1;

                if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(play.result.toUpperCase())) {
                    batter.hits += 1;
                    battingBox.totalHits += 1;
                }
                if (play.result.toUpperCase() === 'BB' || play.result.toUpperCase() === 'IBB') batter.bb += 1;
                if (play.result.toUpperCase().startsWith('K') || play.result.toUpperCase() === 'KWP') batter.so += 1;
                batter.rbi += play.rbi;

                // H1/H2/H3: batter stays on base — runners' runs come from RUN_SCORED plays
                // HR/H4: batter scores exactly 1 run
                // BB: forced runner's run comes from RUN_SCORED — batter doesn't score
                // ADV / other: batter_id IS the runner, so runsScored is theirs
                { const ru = play.result.toUpperCase();
                  if (['HR', 'H4'].includes(ru)) { batter.runs += 1; }
                  else if (!['H1', 'H2', 'H3', '1B', '2B', '3B', 'BB', 'IBB', 'HBP', 'KWP'].includes(ru) && play.runsScored > 0) { batter.runs += play.runsScored; } }

                // Update pitcher stats
                if (pitcher) {
                    pitcher.pitchingIPOuts = (pitcher.pitchingIPOuts || 0) + (play.outsRecorded || 0);
                    if (play.result.toUpperCase().startsWith('K') || play.result.toUpperCase() === 'KWP') pitcher.pitchingSO = (pitcher.pitchingSO || 0) + 1;
                    if (play.result.toUpperCase() === 'BB' || play.result.toUpperCase() === 'IBB') pitcher.pitchingBB = (pitcher.pitchingBB || 0) + 1;
                    if (play.result.toUpperCase() === 'HBP') pitcher.pitchingBB = (pitcher.pitchingBB || 0) + 1;
                    if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(play.result.toUpperCase())) pitcher.pitchingHits = (pitcher.pitchingHits || 0) + 1;
                    if (['HR', 'H4'].includes(play.result.toUpperCase())) {
                        // HR is always an earned run
                        pitcher.pitchingRuns = (pitcher.pitchingRuns || 0) + 1;
                        pitcher.pitchingEarnedRuns = (pitcher.pitchingEarnedRuns || 0) + 1;
                    }
                }

                // Add to play grid
                if (!batter.plays[play.inning]) batter.plays[play.inning] = [];
                batter.plays[play.inning].push({
                    inning: play.inning,
                    result: play.result,
                    outsRecorded: play.outsRecorded,
                    outsBeforePlay: play.outsBeforePlay,
                    runsScored: play.runsScored,
                    rbi: play.rbi,
                    scored: play.scored || false
                });

                // Update last batter tracker for the next consolidation check
                if (!battingBox.lastBatterByInning) battingBox.lastBatterByInning = {};
                battingBox.lastBatterByInning[play.inning] = play.batterId;
            }
        }

        return {
            gameId: game.id,
            status: game.status,
            homeTeam: homeBox,
            awayTeam: awayBox,
            winningPitcher: game.winningPitcher,
            mvpBatter1: game.mvpBatter1,
            mvpBatter2: game.mvpBatter2
        };
    }

    /**
     * Reconstruct the full game state from DB so the frontend can resume after a page refresh.
     * Returns everything the Zustand store needs to restore a game in progress.
     */
    async getGameState(id: string, requestor?: Requestor) {
        await this.findOne(id, requestor);
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: true,
                lineups: {
                    include: { player: true },
                    orderBy: { battingOrder: 'asc' },
                },
                plays: {
                    orderBy: { timestamp: 'asc' },
                    include: {
                        batter: true,
                        pitcher: true,
                    },
                },
            },
        });

        if (!game) throw new NotFoundException(`Game with id ${id} not found`);

        let persistedLiveState: any = null;
        if ((game as any).liveStateJson) {
            try {
                persistedLiveState = JSON.parse((game as any).liveStateJson);
            } catch (error) {
                console.warn(`[GameState] liveStateJson inv?lido para juego ${id}:`, error);
            }
        }

        // Rebuild playLogs from DB plays
        const playLogs = game.plays.map((p) => {
            const batterName = `${p.batter.firstName} ${p.batter.lastName}`;
            const playText = (p as any).description || `${batterName}: ${p.result}`;
            return {
                text: `${p.half === 'top' ? '▲' : '▼'}${p.inning} | ${playText}${p.runsScored > 0 ? ` (${p.runsScored} R)` : ''}`,
                type: this.classifyPlayResult(p.result),
            };
        });

        // ── Derivar inning/half/outs DESDE las jugadas ────────────────────────
        // No confiar en game.currentInning / game.half porque pueden estar
        // desactualizados si hubo jugadas offline enviadas con fullState: null
        const NON_PA_CODES = ['SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED', 'RUNNER_OUT', 'UNDO'];
        const isPAPlay = (p: any) => {
            const code = (p.result || '').split('|')[0].toUpperCase().trim();
            return !NON_PA_CODES.some((x) => code.startsWith(x));
        };

        const sortedPlays = [...game.plays].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        let derivedInning = 1;
        let derivedHalf: 'top' | 'bottom' = 'top';
        let outsInCurrentHalf = 0;

        for (const play of sortedPlays) {
            outsInCurrentHalf += play.outsRecorded;
            if (outsInCurrentHalf >= 3) {
                outsInCurrentHalf = 0;
                if (derivedHalf === 'top') {
                    derivedHalf = 'bottom';
                } else {
                    derivedHalf = 'top';
                    derivedInning++;
                }
            }
        }
        const currentOuts = outsInCurrentHalf;

        // Si el juego ya tiene estado más avanzado en la BD (jugadas en vivo sincronizadas),
        // usar el mayor de los dos para no retroceder
        const dbInning = game.currentInning ?? 1;
        const dbHalf = game.half ?? 'top';
        const dbIsAhead =
            dbInning > derivedInning ||
            (dbInning === derivedInning && dbHalf === 'bottom' && derivedHalf === 'top');
        const activeInning = dbIsAhead ? dbInning : derivedInning;
        const activeHalf   = dbIsAhead ? dbHalf   : derivedHalf;

        // ── Batter indices desde jugadas (siempre desde plays, no desde DB) ─
        // Helper: exclude defense-only players covered by a DH from the batting lineup
        const filterBattingLineup = (lp: any[]) => {
            const covered = new Set<string>(
                lp.filter(l => this.normalizePosition(l.position) === 'DH' && l.dhForPosition)
                   .map(l => this.normalizeDefensivePosition(l.dhForPosition))
                   .filter((p): p is string => p !== null)
            );
            if (!covered.size) return lp;
            return lp.filter(l => {
                const norm = this.normalizeDefensivePosition(l.position);
                return !norm || !covered.has(norm);
            });
        };

        const homeLp = filterBattingLineup(game.lineups.filter((l) => l.teamId === game.homeTeamId && (l as any).isActive !== false));
        const awayLp = filterBattingLineup(game.lineups.filter((l) => l.teamId === game.awayTeamId && (l as any).isActive !== false));
        const awayPA = game.plays.filter((p) => p.half === 'top' && isPAPlay(p)).length;
        const homePA = game.plays.filter((p) => p.half === 'bottom' && isPAPlay(p)).length;
        const awayBatterIndex = awayLp.length > 0 ? awayPA % awayLp.length : 0;
        const homeBatterIndex = homeLp.length > 0 ? homePA % homeLp.length : 0;

        // Sincronizar game record si la derivación está más adelantada que la BD
        if (!dbIsAhead && game.status === 'in_progress') {
            this.prisma.game.update({
                where: { id: game.id },
                data: { currentInning: activeInning, half: activeHalf },
            }).catch(() => {});
        }

        // Determine current batter
        const currentLineup = activeHalf === 'top' ? awayLp : homeLp;
        const currentIndex = activeHalf === 'top' ? awayBatterIndex : homeBatterIndex;
        const currentLineupItem = currentLineup[currentIndex];
        const currentBatter = currentLineupItem?.player
            ? `${currentLineupItem.player.firstName} ${currentLineupItem.player.lastName}`
            : 'Esperando Bateador...';
        const currentBatterId = currentLineupItem?.playerId || null;

        // Build lineups array with snake_case keys for frontend compatibility
        const lineups = game.lineups.map((l) => ({
            player_id: l.playerId,
            team_id: l.teamId,
            position: l.position,
            batting_order: l.battingOrder,
            dh_for_position: l.dhForPosition,
            is_active: (l as any).isActive !== false,
            is_starter: l.isStarter,
            player: l.player ? {
                id: l.player.id,
                firstName: l.player.firstName,
                lastName: l.player.lastName,
                photoUrl: l.player.photoUrl,
            } : null,
        }));

        return {
            gameId: game.id,
            status: game.status,
            maxInnings: (game as any).maxInnings ?? 7,
            home_team_id: game.homeTeamId,
            away_team_id: game.awayTeamId,
            home_team_name: game.homeTeam?.name || 'HOME',
            away_team_name: game.awayTeam?.name || 'AWAY',
            home_team_logo: game.homeTeam?.logoUrl || null,
            away_team_logo: game.awayTeam?.logoUrl || null,
            home_team_short: game.homeTeam?.shortName || (game.homeTeam?.name || 'HOM').slice(0, 3).toUpperCase(),
            away_team_short: game.awayTeam?.shortName || (game.awayTeam?.name || 'AWA').slice(0, 3).toUpperCase(),
            tournament_name: game.tournament?.name || '',
            tournament_id: game.tournamentId,
            current_inning: persistedLiveState?.inning ?? activeInning,
            inning: persistedLiveState?.inning ?? activeInning,
            half: persistedLiveState?.half ?? activeHalf,
            outs: persistedLiveState?.outs ?? currentOuts,
            home_score: persistedLiveState?.homeScore ?? game.homeScore,
            away_score: persistedLiveState?.awayScore ?? game.awayScore,
            homeScore: persistedLiveState?.homeScore ?? game.homeScore,
            awayScore: persistedLiveState?.awayScore ?? game.awayScore,
            playLogs: persistedLiveState?.playLogs ?? playLogs,
            awayBatterIndex,
            homeBatterIndex,
            currentBatter: persistedLiveState?.currentBatter ?? currentBatter,
            currentBatterId: persistedLiveState?.currentBatterId ?? currentBatterId,
            playback_id: persistedLiveState?.playbackId ?? null,
            lineups,
            plays: game.plays,
            bases: persistedLiveState?.bases ?? { first: null, second: null, third: null },
            balls: persistedLiveState?.balls ?? 0,
            strikes: persistedLiveState?.strikes ?? 0,
        };
    }

    async getPitcherMatchup(gameId: string, requestor?: Requestor) {
        await this.findOne(gameId, requestor);
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: true,
                lineups: {
                    include: { player: true },
                    where: { isStarter: true },
                },
            },
        });

        if (!game) throw new NotFoundException(`Game ${gameId} not found`);

        // Find starting pitchers (position P or 1)
        const homePitcher = game.lineups.find(
            l => l.teamId === game.homeTeamId && (l.position === 'P' || l.position === '1'),
        );
        const awayPitcher = game.lineups.find(
            l => l.teamId === game.awayTeamId && (l.position === 'P' || l.position === '1'),
        );

        const buildPitcherData = async (lineup: typeof homePitcher, team: typeof game.homeTeam) => {
            if (!lineup?.player) return null;
            // Get cumulative tournament stats
            const stats = await this.prisma.playerStat.findFirst({
                where: { playerId: lineup.playerId, tournamentId: game.tournamentId },
            });
            const ipOuts = stats?.ipOuts || 0;
            const ip = `${Math.floor(ipOuts / 3)}.${ipOuts % 3}`;
            const era = ipOuts > 0 ? ((stats?.erAllowed || 0) * 27 / ipOuts).toFixed(2) : '0.00';
            return {
                playerId: lineup.playerId,
                name: `${lineup.player.firstName} ${lineup.player.lastName}`,
                photoUrl: lineup.player.photoUrl || null,
                teamName: team?.name || '',
                teamShort: team?.shortName || (team?.name || '').slice(0, 3).toUpperCase(),
                teamLogo: team?.logoUrl || null,
                ip,
                era,
                wins: stats?.wins || 0,
                losses: stats?.losses || 0,
                saves: stats?.saves || 0,
                so: stats?.soPitching || 0,
                bb: stats?.bbAllowed || 0,
                hAllowed: stats?.hAllowed || 0,
                hrAllowed: stats?.hrAllowed || 0,
            };
        };

        return {
            homePitcher: await buildPitcherData(homePitcher, game.homeTeam),
            awayPitcher: await buildPitcherData(awayPitcher, game.awayTeam),
            tournamentName: game.tournament?.name || '',
        };
    }

    async getGameUmpires(gameId: string, requestor?: Requestor) {
        await this.findOne(gameId, requestor);
        return this.prisma.gameUmpire.findMany({
            where: { gameId },
            include: { umpire: true },
        });
    }

    async assignUmpire(gameId: string, dto: AssignUmpireDto, requestor?: Requestor) {
        await this.getOwnedGame(gameId, requestor);
        return this.prisma.gameUmpire.upsert({
            where: { gameId_umpireId: { gameId, umpireId: dto.umpireId } },
            create: { gameId, umpireId: dto.umpireId, role: dto.role ?? 'plate' },
            update: { role: dto.role ?? 'plate' },
            include: { umpire: true },
        });
    }

    async removeUmpire(gameId: string, umpireId: string, requestor?: Requestor) {
        await this.getOwnedGame(gameId, requestor);
        return this.prisma.gameUmpire.deleteMany({ where: { gameId, umpireId } });
    }

    // ─── Delete specific plays by ID (undo support) ──────────────────────────────
    async deletePlays(gameId: string, playIds: string[], requestor?: Requestor) {
        await this.getOwnedGame(gameId, requestor);
        if (!playIds?.length) return { deleted: 0 };
        const result = await this.prisma.play.deleteMany({
            where: { id: { in: playIds }, gameId },
        });
        return { deleted: result.count };
    }

    private classifyPlayResult(result: string): string {
        if (['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'].includes(result)) return 'hit';
        if (result === 'BB' || result === 'HBP') return 'walk';
        if (result.startsWith('K')) return 'out';
        if (['FO', 'GO', 'LO', 'DP', 'TP', 'SAC', 'SF', 'SH', 'OUT'].includes(result)) return 'out';
        if (result.startsWith('DP ')) return 'out'; // e.g. "DP 6-4-3"
        if (result.match(/^F\d$/)) return 'out';    // e.g. "F7"
        if (result.match(/^L\d$/)) return 'out';    // e.g. "L5"
        if (result.match(/^\d[-\d]+$/)) return 'out'; // e.g. "6-3", "4-6-3"
        if (result.match(/^E\d$/)) return 'info';   // errors
        return 'info';
    }

    // ─── Stream (Facebook Live) ──────────────────────────────────────────────────

    async getStreamInfo(gameId: string, requestor?: Requestor) {
        await this.findOne(gameId, requestor);
        const game = await (this.prisma.game.findUnique as any)({
            where: { id: gameId },
            select: { id: true, facebookStreamUrl: true, streamStatus: true },
        }) as { id: string; facebookStreamUrl: string | null; streamStatus: string | null } | null;
        if (!game) throw new NotFoundException('Game not found');
        return {
            facebookStreamUrl: game.facebookStreamUrl ?? null,
            streamStatus: game.streamStatus ?? 'offline',
        };
    }

    async startStream(gameId: string, facebookStreamUrl: string, requestor?: Requestor) {
        await this.getOwnedGame(gameId, requestor);
        const game = await (this.prisma.game.update as any)({
            where: { id: gameId },
            data: { facebookStreamUrl, streamStatus: 'live' },
        }) as { id: string; facebookStreamUrl: string | null; streamStatus: string | null };
        this.liveGateway.server.to(`game:${gameId}`).emit('streamStatusUpdate', {
            facebookStreamUrl: game.facebookStreamUrl,
            streamStatus: 'live',
        });
        return { facebookStreamUrl: game.facebookStreamUrl, streamStatus: 'live' };
    }

    async endStream(gameId: string, requestor?: Requestor) {
        await this.getOwnedGame(gameId, requestor);
        const game = await (this.prisma.game.update as any)({
            where: { id: gameId },
            data: { streamStatus: 'ended' },
        }) as { id: string; facebookStreamUrl: string | null; streamStatus: string | null };
        this.liveGateway.server.to(`game:${gameId}`).emit('streamStatusUpdate', {
            facebookStreamUrl: game.facebookStreamUrl,
            streamStatus: 'ended',
        });
        return { facebookStreamUrl: game.facebookStreamUrl, streamStatus: 'ended' };
    }

    // ─── MANUAL STATS ────────────────────────────────────────────────────────────

    // Valid result codes for manual entry — maps input to canonical result code
    private readonly MANUAL_RESULT_MAP: Record<string, { result: string; isAB: boolean; isHit: boolean; isOut: boolean; outsRecorded: number }> = {
        // Hits
        'H1': { result: 'H1', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        '1B': { result: 'H1', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        'H2': { result: 'H2', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        '2B': { result: 'H2', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        'H3': { result: 'H3', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        '3B': { result: 'H3', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        'HR': { result: 'HR', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        'H4': { result: 'HR', isAB: true, isHit: true, isOut: false, outsRecorded: 0 },
        // Strikeouts
        'K':  { result: 'KS', isAB: true, isHit: false, isOut: true, outsRecorded: 1 },
        'KS': { result: 'KS', isAB: true, isHit: false, isOut: true, outsRecorded: 1 },
        'KL': { result: 'K',  isAB: true, isHit: false, isOut: true, outsRecorded: 1 },
        // Walks / HBP
        'BB':  { result: 'BB',  isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'IBB': { result: 'IBB', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'HBP': { result: 'HBP', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        // Sacrifices
        'SF': { result: 'SF', isAB: false, isHit: false, isOut: true, outsRecorded: 1 },
        'SH': { result: 'SH', isAB: false, isHit: false, isOut: true, outsRecorded: 1 },
        // Fielder's choice
        'FC': { result: 'FC', isAB: true, isHit: false, isOut: false, outsRecorded: 1 },
        // Errors (E1-E9)
        'E1': { result: 'E1', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E2': { result: 'E2', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E3': { result: 'E3', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E4': { result: 'E4', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E5': { result: 'E5', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E6': { result: 'E6', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E7': { result: 'E7', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E8': { result: 'E8', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        'E9': { result: 'E9', isAB: false, isHit: false, isOut: false, outsRecorded: 0 },
        // Double play
        'DP': { result: 'DP', isAB: true, isHit: false, isOut: true, outsRecorded: 2 },
    };

    // Ground outs pattern: 1-3, 6-3, 4-6-3, 5-3, 3U, etc.
    private parseGroundOut(code: string): { result: string; outsRecorded: number } | null {
        const upper = code.toUpperCase().trim();
        // Pattern: digits separated by dashes (e.g. "6-3", "4-6-3", "3U")
        if (/^\d(-\d)+$/.test(upper) || /^\d+U$/.test(upper)) {
            return { result: upper, outsRecorded: 1 };
        }
        return null;
    }

    // Fly outs: F1-F9
    private parseFlyOut(code: string): { result: string; outsRecorded: number } | null {
        const upper = code.toUpperCase().trim();
        if (/^F\d$/.test(upper)) {
            return { result: upper, outsRecorded: 1 };
        }
        return null;
    }

    // Line outs: L1-L9
    private parseLineOut(code: string): { result: string; outsRecorded: number } | null {
        const upper = code.toUpperCase().trim();
        if (/^L\d$/.test(upper)) {
            return { result: upper, outsRecorded: 1 };
        }
        return null;
    }

    private classifyManualResult(code: string): { result: string; isAB: boolean; isHit: boolean; isOut: boolean; outsRecorded: number } {
        const upper = code.toUpperCase().trim();

        // Direct lookup
        const direct = this.MANUAL_RESULT_MAP[upper];
        if (direct) return direct;

        // Ground outs
        const groundOut = this.parseGroundOut(upper);
        if (groundOut) return { ...groundOut, isAB: true, isHit: false, isOut: true };

        // Fly outs
        const flyOut = this.parseFlyOut(upper);
        if (flyOut) return { ...flyOut, isAB: true, isHit: false, isOut: true };

        // Line outs
        const lineOut = this.parseLineOut(upper);
        if (lineOut) return { ...lineOut, isAB: true, isHit: false, isOut: true };

        // If we can't classify, treat as a generic out
        console.warn(`[ManualStats] Unknown result code "${code}", treating as generic out`);
        return { result: upper, isAB: true, isHit: false, isOut: true, outsRecorded: 1 };
    }

    async submitManualStats(gameId: string, dto: SubmitManualStatsDto, requestor?: Requestor) {
        await this.getOwnedGame(gameId, requestor);
        // 1. Validate game exists
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                homeTeam: true,
                awayTeam: true,
                lineups: { include: { player: true } },
            },
        });
        if (!game) throw new NotFoundException('Juego no encontrado.');
        if (game.status === 'finished') {
            throw new BadRequestException('Este juego ya fue finalizado. No se pueden añadir estadísticas manuales.');
        }

        // 2. Validate lineups exist
        const homeLineup = game.lineups.filter(l => l.teamId === game.homeTeamId);
        const awayLineup = game.lineups.filter(l => l.teamId === game.awayTeamId);
        if (homeLineup.length === 0 || awayLineup.length === 0) {
            throw new BadRequestException('Ambos equipos necesitan tener lineups configurados antes de registrar estadísticas.');
        }

        // 3. Build pitcher assignment by inning+half
        // For each half-inning, determine which pitcher was active based on ipOuts distribution
        const buildPitcherMap = (pitchers: typeof dto.awayPitchers, lineupEntries: typeof homeLineup): Map<string, string> => {
            // Map: "inning-half" → pitcherId
            const map = new Map<string, string>();
            // Find pitcher from lineup (starting pitcher)
            const startingPitcher = lineupEntries.find(l => this.normalizePosition(l.position) === 'P');
            let currentPitcherId = startingPitcher?.playerId || pitchers[0]?.playerId;
            let outsUsed = 0;
            let pitcherIdx = 0;
            let pitcherOutsLimit = pitchers[pitcherIdx]?.ipOuts ?? 999;

            // Max innings from runs data or default to 9
            const maxInning = Math.max(...dto.runsByInning.map(r => r.inning), 9);

            for (let inn = 1; inn <= maxInning; inn++) {
                // Each inning has 3 outs for the opposing half
                const halfKey = `${inn}`;
                map.set(halfKey, currentPitcherId);

                outsUsed += 3;
                // Check if this pitcher has used all their outs, move to next
                while (pitcherIdx < pitchers.length - 1 && outsUsed >= pitcherOutsLimit) {
                    outsUsed = 0;
                    pitcherIdx++;
                    currentPitcherId = pitchers[pitcherIdx].playerId;
                    pitcherOutsLimit = pitchers[pitcherIdx].ipOuts;
                }
            }
            return map;
        };

        // Away pitchers face home batters (bottom), home pitchers face away batters (top)
        const homePitcherMap = buildPitcherMap(dto.homePitchers, homeLineup); // faces away batters in top
        const awayPitcherMap = buildPitcherMap(dto.awayPitchers, awayLineup); // faces home batters in bottom

        // 4. Delete existing plays for this game (in case of re-submission attempt)
        await this.prisma.play.deleteMany({ where: { gameId } });

        // 4b. Pre-cargar RosterEntries del torneo para asignar IDs al crear jugadas
        const rosterEntries = await this.prisma.rosterEntry.findMany({
            where: {
                tournamentId: game.tournamentId,
                teamId: { in: [game.homeTeamId, game.awayTeamId] },
            },
            select: { id: true, playerId: true, teamId: true },
        });
        // Map: "playerId:teamId" → rosterEntryId
        const rosterEntryMap = new Map<string, string>(
            rosterEntries.map(re => [`${re.playerId}:${re.teamId}`, re.id])
        );

        // 5. Build Play records from batter entries
        const playsToCreate: any[] = [];
        let playTimestamp = new Date(game.scheduledDate ?? game.createdAt);

        const processBatters = (
            batters: typeof dto.awayBatters,
            half: string,
            pitcherMap: Map<string, string>,
            defaultPitcherId: string,
            batterTeamId: string,
            pitcherTeamId: string,
        ) => {
            // Distribute plate appearances across innings
            // We use runsByInning to figure out how many innings existed, then distribute
            // plate appearances in order through the lineup
            const relevantInnings = dto.runsByInning
                .filter(r => r.half === half)
                .sort((a, b) => a.inning - b.inning);
            const maxInning = relevantInnings.length > 0
                ? Math.max(...relevantInnings.map(r => r.inning))
                : Math.ceil(batters.reduce((sum, b) => sum + b.results.length, 0) / batters.length);

            // Flatten all plate appearances in lineup order
            let currentBatterIdx = 0;
            let currentPAIdx: number[] = new Array(batters.length).fill(0); // track which PA we're on for each batter
            let inning = 1;
            let outsInInning = 0;

            // Process linearly through the lineup, rotating
            const totalPAs = batters.reduce((sum, b) => sum + b.results.length, 0);
            let paProcessed = 0;

            while (paProcessed < totalPAs) {
                const batter = batters[currentBatterIdx % batters.length];
                const paIdx = currentPAIdx[currentBatterIdx % batters.length];

                if (paIdx >= batter.results.length) {
                    // This batter has no more PAs, skip to next
                    currentBatterIdx++;
                    if (currentBatterIdx >= batters.length * 2) break; // safety
                    continue;
                }

                const resultCode = batter.results[paIdx];
                const classified = this.classifyManualResult(resultCode);
                const pitcherId = pitcherMap.get(`${inning}`) || defaultPitcherId;

                // Calculate per-PA RBI: distribute total RBI evenly across hit PAs
                // For HR: 1 run scored by batter guaranteed
                let rbi = 0;
                if (batter.rbi > 0 && classified.isHit) {
                    // Distribute RBI proportionally (simple approach)
                    const hitPAs = batter.results.filter(r => this.classifyManualResult(r).isHit).length;
                    if (hitPAs > 0) {
                        const baseRbi = Math.floor(batter.rbi / hitPAs);
                        const remainder = batter.rbi % hitPAs;
                        const hitIdx = batter.results.slice(0, paIdx + 1).filter(r => this.classifyManualResult(r).isHit).length - 1;
                        rbi = baseRbi + (hitIdx < remainder ? 1 : 0);
                    }
                }
                // For SF with RBI and no hits
                if (batter.rbi > 0 && classified.result === 'SF') {
                    const hitPAs = batter.results.filter(r => this.classifyManualResult(r).isHit).length;
                    if (hitPAs === 0) {
                        // All RBI come from SFs
                        const sfPAs = batter.results.filter(r => this.classifyManualResult(r).result === 'SF').length;
                        if (sfPAs > 0) {
                            const baseRbi = Math.floor(batter.rbi / sfPAs);
                            const remainder = batter.rbi % sfPAs;
                            const sfIdx = batter.results.slice(0, paIdx + 1).filter(r => this.classifyManualResult(r).result === 'SF').length - 1;
                            rbi = baseRbi + (sfIdx < remainder ? 1 : 0);
                        }
                    }
                }

                // Run scoring: distribute runs across PAs
                let runsScored = 0;
                if (classified.result === 'HR') {
                    runsScored = 1; // Batter always scores on HR
                }

                playTimestamp = new Date(playTimestamp.getTime() + 1000); // increment 1s for ordering

                playsToCreate.push({
                    gameId,
                    inning,
                    half,
                    outsBeforePlay: outsInInning,
                    result: classified.result,
                    description: `Manual: ${resultCode}`,
                    rbi,
                    runsScored,
                    outsRecorded: classified.outsRecorded,
                    scored: runsScored > 0,
                    batterId: batter.playerId,
                    pitcherId,
                    batterRosterEntryId: rosterEntryMap.get(`${batter.playerId}:${batterTeamId}`) ?? null,
                    pitcherRosterEntryId: rosterEntryMap.get(`${pitcherId}:${pitcherTeamId}`) ?? null,
                    timestamp: playTimestamp,
                });

                outsInInning += classified.outsRecorded;
                if (outsInInning >= 3) {
                    inning++;
                    outsInInning = 0;
                }

                currentPAIdx[currentBatterIdx % batters.length]++;
                paProcessed++;
                currentBatterIdx++;
            }
        };

        const defaultAwayPitcher = dto.awayPitchers[0]?.playerId || awayLineup.find(l => this.normalizePosition(l.position) === 'P')?.playerId || awayLineup[0]?.playerId;
        const defaultHomePitcher = dto.homePitchers[0]?.playerId || homeLineup.find(l => this.normalizePosition(l.position) === 'P')?.playerId || homeLineup[0]?.playerId;

        // top: away batea (batterTeamId=away), home pichea (pitcherTeamId=home)
        processBatters(dto.awayBatters, 'top', homePitcherMap, defaultHomePitcher, game.awayTeamId, game.homeTeamId);
        // bottom: home batea (batterTeamId=home), away pichea (pitcherTeamId=away)
        processBatters(dto.homeBatters, 'bottom', awayPitcherMap, defaultAwayPitcher, game.homeTeamId, game.awayTeamId);

        // 6. Create all plays in a transaction
        if (playsToCreate.length > 0) {
            await this.prisma.play.createMany({ data: playsToCreate });
        }

        // 7. Finalize game
        const updateData: any = {
            status: 'finished',
            homeScore: dto.homeScore,
            awayScore: dto.awayScore,
            currentInning: Math.max(...dto.runsByInning.map(r => r.inning), 1),
            half: 'bottom',
            endTime: new Date(),
        };
        if (dto.winningPitcherId) updateData.winningPitcherId = dto.winningPitcherId;
        if (dto.losingPitcherId) updateData.losingPitcherId = dto.losingPitcherId;
        if (dto.savePitcherId) updateData.savePitcherId = dto.savePitcherId;
        if (dto.mvpBatter1Id) updateData.mvpBatter1Id = dto.mvpBatter1Id;
        if (dto.mvpBatter2Id) updateData.mvpBatter2Id = dto.mvpBatter2Id;

        await this.prisma.game.update({
            where: { id: gameId },
            data: updateData,
        });

        // 8. Recalculate standings
        try {
            await this.recalculateStandings(game.tournamentId);
        } catch (err) {
            console.error('[ManualStats] Error recalculating standings:', err);
        }

        console.log(`[ManualStats] Successfully created ${playsToCreate.length} plays for game ${gameId}`);

        return {
            success: true,
            playsCreated: playsToCreate.length,
            gameId,
        };
    }
}

