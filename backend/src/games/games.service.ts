import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeLineupDto, CreateGameDto, UpdateGameDto, SetGameLineupDto } from './dto/game.dto';

@Injectable()
export class GamesService {
    constructor(private prisma: PrismaService) { }

    private readonly defensivePositions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

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
            'BD': 'DH', 'DH': 'DH',
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
            const defensivePos = this.normalizeDefensivePosition(lineup.position);
            if (defensivePos) {
                if (defensiveUsed.has(defensivePos)) {
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
                throw new BadRequestException('Si se usa DH, debe anclarse a una posición defensiva válida.');
            }
            if (!defensiveUsed.has(anchor)) {
                throw new BadRequestException(`El DH debe anclarse a una posición defensiva presente en el lineup (${anchor}).`);
            }
        }
    }

    async create(data: CreateGameDto) {
        return this.prisma.game.create({ data });
    }

    async findAll(filters?: { status?: string; tournamentId?: string }) {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.tournamentId) where.tournamentId = filters.tournamentId;

        return this.prisma.game.findMany({
            where,
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: { select: { name: true, id: true } },
            },
            orderBy: { scheduledDate: 'desc' },
        });
    }

    async findOne(id: string) {
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
        const game = await this.findOne(gameId);

        if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
            throw new BadRequestException('El equipo no pertenece a este juego.');
        }

        this.validateLineup(lineupData.lineups);

        // Primero, eliminar todo el lineup existente de este equipo en este juego
        await this.prisma.lineup.deleteMany({
            where: {
                gameId: gameId,
                teamId: teamId
            }
        });

        // Ahora insertamos los nuevos
        const dataToInsert = lineupData.lineups.map(l => ({
            gameId: gameId,
            teamId: teamId,
            playerId: l.playerId,
            battingOrder: l.battingOrder,
            position: l.position,
            dhForPosition: this.normalizePosition(l.position) === 'DH' ? this.normalizeDefensivePosition(l.dhForPosition) : null,
            isStarter: l.isStarter !== undefined ? l.isStarter : true,
        }));

        const result = await this.prisma.lineup.createMany({
            data: dataToInsert
        });

        return {
            status: 'success',
            message: `Lineup guardado. Jugadores insertados: ${result.count}`,
            gameId
        };
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

    async getGameBoxscore(id: string) {
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                homeTeam: true,
                awayTeam: true,
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
                    plays: {}
                }))
            };
        };

        const homeBox = initTeamBoxscore(game.homeTeam, game.lineups);
        const awayBox = initTeamBoxscore(game.awayTeam, game.lineups);

        // Process plays
        for (const play of game.plays) {
            const isTop = play.half === 'top';
            const battingBox = isTop ? awayBox : homeBox;

            // Increment run by inning
            if (play.runsScored > 0) {
                battingBox.runsByInning[play.inning] = (battingBox.runsByInning[play.inning] || 0) + play.runsScored;
                battingBox.totalRuns += play.runsScored;
            }

            // Find batter in lineup
            const batter = battingBox.lineup.find((b: any) => b.playerId === play.batterId);
            if (batter) {
                // WP_RUN / RUN_SCORED: corredor anotó — actualizar su play existente en este inning
                // para cerrar su rombo SIN crear una celda extra en el boxscore.
                const isRunScore = play.result === 'WP_RUN' || play.result === 'RUN_SCORED';
                if (isRunScore) {
                    batter.runs += 1;
                    // Buscar el play existente del corredor en este inning y sumarle la carrera
                    const existingInningPlays = batter.plays[play.inning];
                    if (existingInningPlays && existingInningPlays.length > 0) {
                        // Actualizar el último play del corredor en ese inning (su PA más reciente)
                        existingInningPlays[existingInningPlays.length - 1].runsScored += 1;
                    }
                    // Si no hay play previo, no se crea celda (el corredor llegó a base en un inning anterior)
                    continue;
                }

                // Update stats (SF y SH no cuentan como turno oficial al bate)
                const isAtBat = !['BB', 'HBP', 'SAC', 'WP', 'SF', 'SH'].includes(play.result);
                if (isAtBat) batter.atBats += 1;

                // Hits — frontend now emits H1/H2/H3/HR (WBSC notation)
                if (['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'].includes(play.result)) {
                    batter.hits += 1;
                    battingBox.totalHits += 1;
                }
                if (play.result === 'BB') batter.bb += 1;
                if (play.result.startsWith('K')) batter.so += 1;
                batter.rbi += play.rbi;

                if (play.runsScored > 0) {
                    batter.runs += play.runsScored;
                }

                // Add to play grid
                if (!batter.plays[play.inning]) batter.plays[play.inning] = [];
                batter.plays[play.inning].push({
                    inning: play.inning,
                    result: play.result,
                    outsRecorded: play.outsRecorded,
                    outsBeforePlay: play.outsBeforePlay,
                    runsScored: play.runsScored,
                    rbi: play.rbi
                });
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
            return {
                text: `${p.half === 'top' ? '▲' : '▼'}${p.inning} | ${batterName}: ${p.result}${p.runsScored > 0 ? ` (${p.runsScored} R)` : ''}`,
                type: this.classifyPlayResult(p.result),
            };
        });

        // Compute current outs from the last play's state
        // We'll compute outs from plays in the current half-inning
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

        return {
            gameId: game.id,
            status: game.status,
            inning: game.currentInning,
            half: game.half,
            outs: currentOuts,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            playLogs,
            awayBatterIndex,
            homeBatterIndex,
            currentBatter,
            currentBatterId,
            // bases are not stored in DB — safe to reset to empty on refresh
            bases: { first: null, second: null, third: null },
            balls: 0,
            strikes: 0,
        };
    }

    private classifyPlayResult(result: string): string {
        if (['H1', 'H2', 'H3', 'HR', '1B', '2B', '3B'].includes(result)) return 'hit';
        if (result === 'BB' || result === 'HBP') return 'walk';
        if (result.startsWith('K')) return 'out';
        if (['FO', 'GO', 'LO', 'DP', 'TP', 'SAC', 'SF', 'SH'].includes(result)) return 'out';
        if (result.match(/^\d+-\d+/)) return 'out'; // e.g. "6-3"
        return 'info';
    }
}
