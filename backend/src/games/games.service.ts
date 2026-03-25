import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignUmpireDto, ChangeLineupDto, CreateGameDto, UpdateGameDto, SetGameLineupDto, CambioSustitucionDto, CambioPosicionDto, CambioReingresoDto } from './dto/game.dto';
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
        return this.prisma.game.create({ data });
    }

    async findAll(filters?: { status?: string; tournamentId?: string; limit?: number }) {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.tournamentId) where.tournamentId = filters.tournamentId;

        return this.prisma.game.findMany({
            where,
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: { select: { name: true, id: true, logoUrl: true } },
            },
            orderBy: { scheduledDate: 'desc' },
            ...(filters?.limit ? { take: filters.limit } : {}),
        });
    }

    async findOne(id: string) {
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                homeTeam: { include: { players: true } },
                awayTeam: { include: { players: true } },
                tournament: true,
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

        return game;
    }

    async update(id: string, updateData: UpdateGameDto) {
        await this.findOne(id);
        
        // Ensure empty strings are casted to undefined so Prisma ignores them correctly instead of throwing 400 Bad Request
        if (updateData.winningPitcherId === "") updateData.winningPitcherId = undefined;
        if (updateData.mvpBatter1Id === "") updateData.mvpBatter1Id = undefined;
        if (updateData.mvpBatter2Id === "") updateData.mvpBatter2Id = undefined;

        // Ensure fields exist before trying to create relation edits, otherwise ignore.
        const prismaUpdateData: any = { ...updateData };

        return this.prisma.game.update({
            where: { id },
            data: prismaUpdateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.game.delete({
            where: { id },
        });
    }

    async setLineup(gameId: string, teamId: string, lineupData: SetGameLineupDto) {
        console.log(`[GamesService] Starting setLineup for game ${gameId}, team ${teamId}`);
        try {
            const game = await this.findOne(gameId);

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

    async changeLineup(gameId: string, change: ChangeLineupDto) {
        const game = await this.findOne(gameId);

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

        const playerIn = await this.prisma.player.findUnique({
            where: { id: change.playerInId },
            select: { id: true, teamId: true },
        });
        if (!playerIn || playerIn.teamId !== change.teamId) {
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

        return {
            status: 'success',
            message: 'Lineup actualizado correctamente.',
            lineupId: updated.id,
        };
    }

    // ─── Cambios v2 ─────────────────────────────────────────────────────────────

    /**
     * Devuelve quiénes pueden salir, entrar y reingresar para un equipo en un juego.
     * Reglas WBSC:
     *  - puedenSalir: jugadores isActive=true en el lineup
     *  - puedenEntrar: roster del equipo que NO están en el lineup activo actual
     *    y que no han sido removidos permanentemente (isActive=false y hasUsedReentry=true
     *    → ya están fuera para siempre; isActive=false y hasUsedReentry=false → elegibles para reingreso, no para sustitución)
     *  - puedenReingresar: starters (isStarter=true) con isActive=false y hasUsedReentry=false,
     *    junto con el jugador que actualmente ocupa su batting order
     */
    async getCambiosEligibles(gameId: string, teamId: string) {
        const game = await this.findOne(gameId);
        if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        const currentLineup = await this.prisma.lineup.findMany({
            where: { gameId, teamId },
            include: { player: true },
            orderBy: { battingOrder: 'asc' },
        });

        const roster = await this.prisma.player.findMany({
            where: { teamId },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });

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
            number: (l.player as any).number ?? null,
        }));

        // Jugadores que pueden entrar (sustitución): jugadores del roster que
        // nunca han aparecido en el lineup de este juego (ni activos ni inactivos)
        const puedenEntrar = roster
            .filter(p => !allLineupPlayerIds.has(p.id))
            .map(p => ({
                playerId: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                number: (p as any).number ?? null,
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
                    number: (l.player as any).number ?? null,
                    sustitutoActual: sustituto ? {
                        lineupId: sustituto.id,
                        playerId: sustituto.playerId,
                        firstName: sustituto.player.firstName,
                        lastName: sustituto.player.lastName,
                        number: (sustituto.player as any).number ?? null,
                    } : null,
                };
            });

        return { puedenSalir, puedenEntrar, puedenReingresar };
    }

    /**
     * Sustitución (bateo y fildeo): sale un jugador activo, entra uno del roster no usado.
     */
    async cambioSustitucion(gameId: string, dto: CambioSustitucionDto) {
        const game = await this.findOne(gameId);
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

        const playerInRecord = await this.prisma.player.findUnique({
            where: { id: dto.playerInId },
            select: { id: true, teamId: true },
        });
        if (!playerInRecord || playerInRecord.teamId !== dto.teamId) {
            throw new BadRequestException('El jugador no pertenece al equipo.');
        }

        const normalizedPosition = this.normalizePosition(dto.position);
        const dhAnchor = normalizedPosition === 'DH' ? this.normalizeDefensivePosition(dto.dhForPosition) : null;

        // Proponer nuevo lineup: marcar saliente como inactivo, insertar entrante
        const proposedLineup = currentLineup
            .filter(l => (l as any).isActive && l.id !== playerOut.id)
            .map(l => ({ position: l.position, dhForPosition: l.dhForPosition }));
        proposedLineup.push({ position: dto.position, dhForPosition: dhAnchor });
        this.validateLineup(proposedLineup);

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
    async cambioPosicion(gameId: string, dto: CambioPosicionDto) {
        const game = await this.findOne(gameId);
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
    async cambioReingreso(gameId: string, dto: CambioReingresoDto) {
        const game = await this.findOne(gameId);
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

    async getGameBoxscore(id: string) {
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
                    orderBy: { battingOrder: 'asc' }
                },
                plays: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!game) throw new NotFoundException(`Game with id ${id} not found`);

        const initTeamBoxscore = (team: any, lineups: any[]): any => {
            const teamLineup = lineups.filter(l => l.teamId === team.id);
            return {
                teamId: team.id,
                teamName: team.name,
                totalRuns: 0,
                totalHits: 0,
                totalErrors: 0,
                runsByInning: {},
                lastBatterByInning: {}, // Track who was the last to have a main play in each inning
                lineup: teamLineup.map(l => ({
                    playerId: l.player.id,
                    firstName: l.player.firstName,
                    lastName: l.player.lastName,
                    position: l.position,
                    battingOrder: l.battingOrder,
                    atBats: 0,
                    runs: 0,
                    hits: 0,
                    rbi: 0,
                    bb: 0,
                    so: 0,
                    pitchingIPOuts: 0,
                    pitchingSO: 0,
                    pitchingBB: 0,
                    plays: {}
                }))
            };
        };

        const homeBox = initTeamBoxscore(game.homeTeam, game.lineups);
        const awayBox = initTeamBoxscore(game.awayTeam, game.lineups);

        // Process plays
        for (const playObj of game.plays) {
            const play = playObj as any; // Temporary cast until prisma generate succeeds
            const isTop = play.half === 'top';
            const battingBox = isTop ? awayBox : homeBox;

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
                            updated = true;
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
                        const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'FC', 'SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED'].includes(play.result.toUpperCase()) && !isError;
                        if (isAtBat) batter.atBats += 1;
                        if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(play.result.toUpperCase())) {
                            batter.hits += 1;
                            battingBox.totalHits += 1;
                        }
                        if (play.result.toUpperCase() === 'BB') batter.bb += 1;
                        if (play.result.toUpperCase().startsWith('K')) batter.so += 1;
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
                        }

                        // Don't add a new play entry
                        continue;
                    }
                }

                // Normal At-Bat processing
                const isError = play.result.toUpperCase().match(/^E\d$/);
                const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH', 'FC', 'SB', 'CS', 'ADV', 'WP_RUN', 'RUN_SCORED', 'RUNNER_OUT'].includes(play.result.toUpperCase()) && !isError;
                if (isAtBat) batter.atBats += 1;

                if (['H1', 'H2', 'H3', 'H4', 'HR', '1B', '2B', '3B'].includes(play.result.toUpperCase())) {
                    batter.hits += 1;
                    battingBox.totalHits += 1;
                }
                if (play.result.toUpperCase() === 'BB') batter.bb += 1;
                if (play.result.toUpperCase().startsWith('K')) batter.so += 1;
                batter.rbi += play.rbi;

                // H1/H2/H3: batter stays on base — runners' runs come from RUN_SCORED plays
                // HR/H4: batter scores exactly 1 run
                // BB: forced runner's run comes from RUN_SCORED — batter doesn't score
                // ADV / other: batter_id IS the runner, so runsScored is theirs
                { const ru = play.result.toUpperCase();
                  if (['HR', 'H4'].includes(ru)) { batter.runs += 1; }
                  else if (!['H1', 'H2', 'H3', '1B', '2B', '3B', 'BB'].includes(ru) && play.runsScored > 0) { batter.runs += play.runsScored; } }

                // Update pitcher stats
                if (pitcher) {
                    pitcher.pitchingIPOuts = (pitcher.pitchingIPOuts || 0) + (play.outsRecorded || 0);
                    if (play.result.toUpperCase().startsWith('K')) pitcher.pitchingSO = (pitcher.pitchingSO || 0) + 1;
                    if (play.result.toUpperCase() === 'BB') pitcher.pitchingBB = (pitcher.pitchingBB || 0) + 1;
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
    async getGameState(id: string) {
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

        // Rebuild playLogs from DB plays
        const playLogs = game.plays.map((p) => {
            const batterName = `${p.batter.firstName} ${p.batter.lastName}`;
            const playText = (p as any).description || `${batterName}: ${p.result}`;
            return {
                text: `${p.half === 'top' ? '▲' : '▼'}${p.inning} | ${playText}${p.runsScored > 0 ? ` (${p.runsScored} R)` : ''}`,
                type: this.classifyPlayResult(p.result),
            };
        });

        // Compute current outs from the last play's state
        const currentHalfPlays = game.plays.filter(
            (p) => p.inning === game.currentInning && p.half === game.half,
        );
        const currentOuts = currentHalfPlays.reduce((sum, p) => sum + p.outsRecorded, 0) % 3;

        // Compute batter indices
        const homeLp = game.lineups.filter((l) => l.teamId === game.homeTeamId);
        const awayLp = game.lineups.filter((l) => l.teamId === game.awayTeamId);
        const awayPA = game.plays.filter((p) => p.half === 'top').length;
        const homePA = game.plays.filter((p) => p.half === 'bottom').length;
        const awayBatterIndex = awayLp.length > 0 ? awayPA % awayLp.length : 0;
        const homeBatterIndex = homeLp.length > 0 ? homePA % homeLp.length : 0;

        // Determine current batter
        const currentLineup = game.half === 'top' ? awayLp : homeLp;
        const currentIndex = game.half === 'top' ? awayBatterIndex : homeBatterIndex;
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
            current_inning: game.currentInning,
            inning: game.currentInning,
            half: game.half,
            outs: currentOuts,
            home_score: game.homeScore,
            away_score: game.awayScore,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            playLogs,
            awayBatterIndex,
            homeBatterIndex,
            currentBatter,
            currentBatterId,
            playback_id: null,
            lineups,
            plays: game.plays,
            // bases are not stored in DB — safe to reset to empty on refresh
            bases: { first: null, second: null, third: null },
            balls: 0,
            strikes: 0,
        };
    }

    async getGameUmpires(gameId: string) {
        await this.findOne(gameId);
        return this.prisma.gameUmpire.findMany({
            where: { gameId },
            include: { umpire: true },
        });
    }

    async assignUmpire(gameId: string, dto: AssignUmpireDto) {
        await this.findOne(gameId);
        return this.prisma.gameUmpire.upsert({
            where: { gameId_umpireId: { gameId, umpireId: dto.umpireId } },
            create: { gameId, umpireId: dto.umpireId, role: dto.role ?? 'plate' },
            update: { role: dto.role ?? 'plate' },
            include: { umpire: true },
        });
    }

    async removeUmpire(gameId: string, umpireId: string) {
        await this.findOne(gameId);
        return this.prisma.gameUmpire.deleteMany({ where: { gameId, umpireId } });
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

    async getStreamInfo(gameId: string) {
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

    async startStream(gameId: string, facebookStreamUrl: string) {
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

    async endStream(gameId: string) {
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
}
