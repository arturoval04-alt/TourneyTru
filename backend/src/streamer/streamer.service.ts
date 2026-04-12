import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { PrismaService } from '../prisma/prisma.service';

const SHADOW_LEAGUE_NAME = '__streamer__';
const SHADOW_TOURNAMENT_SEASON = '__quick__';

@Injectable()
export class StreamerService {
    constructor(
        private prisma: PrismaService,
        private gamesService: GamesService,
    ) { }

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
            '10': 'SF', 'SF': 'SF',
            'BD': 'DH', 'DH': 'DH',
            'BE': 'BE',
        };

        return map[raw] || raw;
    }

    private normalizeDefensivePosition(position?: string | null): string | null {
        const normalized = this.normalizePosition(position);
        if (!normalized) return null;
        return this.defensivePositions.includes(normalized) ? normalized : null;
    }

    private validateLineup(players: Array<{ position?: string | null; dhForPosition?: string | null }>) {
        const defensiveUsed = new Set<string>();

        for (const player of players) {
            const normalized = this.normalizePosition(player.position);
            if (!normalized || normalized === 'BE') continue;

            const defensivePos = this.normalizeDefensivePosition(normalized);
            if (defensivePos) {
                if (defensiveUsed.has(defensivePos)) {
                    throw new BadRequestException(`Posición defensiva duplicada: ${defensivePos}.`);
                }
                defensiveUsed.add(defensivePos);
            }
        }

        const dhEntries = players.filter((p) => this.normalizePosition(p.position) === 'DH');
        if (dhEntries.length > 1) {
            throw new BadRequestException('Solo se permite un DH estándar por equipo.');
        }

        if (dhEntries.length === 1) {
            const anchor = this.normalizeDefensivePosition(dhEntries[0].dhForPosition);
            if (!anchor) {
                throw new BadRequestException('Si se usa DH, debe anclarse a una posición defensiva válida.');
            }
            if (!defensiveUsed.has(anchor)) {
                throw new BadRequestException(`El DH debe anclarse a una posición defensiva presente en el lineup (${anchor}).`);
            }
        }
    }

    // ─── Shadow context ───────────────────────────────────────────────────────────
    // Each streamer owns one hidden league + one hidden tournament that holds
    // all their quick games. These are private and excluded from public listings.

    private async ensureShadowContext(streamerId: string): Promise<{ leagueId: string; tournamentId: string }> {
        // Find or create shadow league
        let league = await this.prisma.league.findFirst({
            where: { adminId: streamerId, name: SHADOW_LEAGUE_NAME },
        }) as any;

        if (!league) {
            league = await this.prisma.league.create({
                data: {
                    name: SHADOW_LEAGUE_NAME,
                    adminId: streamerId,
                },
            }) as any;
            // Mark as private so it never appears in public listings
            await this.prisma.$executeRaw`UPDATE leagues SET is_private = 1 WHERE id = ${league.id}`;
        }

        // Find or create shadow tournament
        let tournament = await this.prisma.tournament.findFirst({
            where: { leagueId: league.id, season: SHADOW_TOURNAMENT_SEASON },
        }) as any;

        if (!tournament) {
            tournament = await this.prisma.tournament.create({
                data: {
                    name: 'Quick Games',
                    season: SHADOW_TOURNAMENT_SEASON,
                    leagueId: league.id,
                    adminId: streamerId,
                    rulesType: 'baseball_9',
                    status: 'active',
                } as any,
            }) as any;
            // Mark as private
            await this.prisma.$executeRaw`UPDATE tournaments SET is_private = 1 WHERE id = ${tournament.id}`;
        }

        return { leagueId: league.id, tournamentId: tournament.id };
    }

    // ─── Create quick game ───────────────────────────────────────────────────────

    async createQuickGame(streamerId: string, data: {
        homeTeamName: string;
        awayTeamName: string;
        homePlayers: { firstName: string; lastName: string; number?: number; position?: string; dhForPosition?: string }[];
        awayPlayers: { firstName: string; lastName: string; number?: number; position?: string; dhForPosition?: string }[];
        homeReserves?: { firstName: string; lastName: string; number?: number }[];
        awayReserves?: { firstName: string; lastName: string; number?: number }[];
        scheduledDate?: string;
        maxInnings?: number;
    }) {
        const { tournamentId } = await this.ensureShadowContext(streamerId);
        this.validateLineup(data.homePlayers || []);
        this.validateLineup(data.awayPlayers || []);

        // Create home team
        const homeTeam = await this.prisma.team.create({
            data: { name: data.homeTeamName, tournamentId },
        });

        // Create home players (keep created records for lineup)
        const homePlayers: Array<{ playerId: string; position: string | null; dhForPosition: string | null }> = [];
        for (const p of (data.homePlayers || [])) {
            const normalizedPosition = this.normalizePosition(p.position);
            const dhAnchor = normalizedPosition === 'DH' ? this.normalizeDefensivePosition(p.dhForPosition) : null;
            const player = await (this.prisma.player as any).create({
                data: {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    position: normalizedPosition ?? null,
                    isStreamerCreated: true,
                },
            });
            await (this.prisma.rosterEntry as any).create({
                data: {
                    playerId: player.id,
                    teamId: homeTeam.id,
                    tournamentId,
                    number: p.number ?? null,
                    position: normalizedPosition ?? null,
                    isActive: true,
                },
            });
            homePlayers.push({ playerId: player.id, position: normalizedPosition, dhForPosition: dhAnchor });
        }

        // Create away team
        const awayTeam = await this.prisma.team.create({
            data: { name: data.awayTeamName, tournamentId },
        });

        // Create away players (keep created records for lineup)
        const awayPlayers: Array<{ playerId: string; position: string | null; dhForPosition: string | null }> = [];
        for (const p of (data.awayPlayers || [])) {
            const normalizedPosition = this.normalizePosition(p.position);
            const dhAnchor = normalizedPosition === 'DH' ? this.normalizeDefensivePosition(p.dhForPosition) : null;
            const player = await (this.prisma.player as any).create({
                data: {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    position: normalizedPosition ?? null,
                    isStreamerCreated: true,
                },
            });
            await (this.prisma.rosterEntry as any).create({
                data: {
                    playerId: player.id,
                    teamId: awayTeam.id,
                    tournamentId,
                    number: p.number ?? null,
                    position: normalizedPosition ?? null,
                    isActive: true,
                },
            });
            awayPlayers.push({ playerId: player.id, position: normalizedPosition, dhForPosition: dhAnchor });
        }

        // Create the game
        const game = await this.prisma.game.create({
            data: {
                tournamentId,
                homeTeamId: homeTeam.id,
                awayTeamId: awayTeam.id,
                scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
                maxInnings: data.maxInnings ?? 9,
                status: 'scheduled',
            } as any,
            include: {
                homeTeam: true,
                awayTeam: true,
            },
        });

        // Auto-crear lineups desde los jugadores registrados
        // Esto permite que el scorekeeper funcione de inmediato sin pasar por el wizard de lineup
        const createLineups = async (
            players: Array<{ playerId: string; position: string | null; dhForPosition: string | null }>,
            teamId: string,
        ) => {
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                await this.prisma.lineup.create({
                    data: {
                        gameId: game.id,
                        teamId,
                        playerId: p.playerId,
                        battingOrder: i + 1,
                        position: p.position || 'UT',
                        dhForPosition: p.dhForPosition || null,
                        isStarter: true,
                        isActive: true,
                    } as any,
                }).catch(() => { /* ignorar duplicados */ });
            }
        };

        if (homePlayers.length > 0) await createLineups(homePlayers, homeTeam.id);
        if (awayPlayers.length > 0) await createLineups(awayPlayers, awayTeam.id);

        // Create reserve/bench players — Player + RosterEntry, NO lineup entry
        // They will appear in "puedenEntrar" for substitutions
        const createReserves = async (reserves: { firstName: string; lastName: string; number?: number }[], teamId: string) => {
            for (const r of reserves) {
                const player = await (this.prisma.player as any).create({
                    data: {
                        firstName: r.firstName,
                        lastName: r.lastName,
                        position: null,
                        isStreamerCreated: true,
                    },
                });
                await (this.prisma.rosterEntry as any).create({
                    data: {
                        playerId: player.id,
                        teamId,
                        tournamentId,
                        number: r.number ?? null,
                        position: null,
                        isActive: true,
                    },
                });
            }
        };

        if (data.homeReserves?.length) await createReserves(data.homeReserves, homeTeam.id);
        if (data.awayReserves?.length) await createReserves(data.awayReserves, awayTeam.id);

        return game;
    }

    // ─── Register a new player mid-game (streamer only) ──────────────────────────

    async addPlayerInGame(gameId: string, teamId: string, streamerId: string, playerData: {
        firstName: string;
        lastName: string;
        number?: number;
    }) {
        await this.verifyGameOwnership(gameId, streamerId);

        // Verify the team belongs to this game
        const game = await this.prisma.game.findUnique({ where: { id: gameId } }) as any;
        if (game.homeTeamId !== teamId && game.awayTeamId !== teamId) {
            throw new ForbiddenException('El equipo no pertenece a este juego.');
        }

        const game2 = await this.prisma.game.findUnique({
            where: { id: gameId },
            select: { tournamentId: true },
        }) as any;

        const player = await (this.prisma.player as any).create({
            data: {
                firstName: playerData.firstName,
                lastName: playerData.lastName,
                position: null,
                isStreamerCreated: true,
            },
        });
        await (this.prisma.rosterEntry as any).create({
            data: {
                playerId: player.id,
                teamId,
                tournamentId: game2.tournamentId,
                number: playerData.number ?? null,
                position: null,
                isActive: true,
            },
        });

        return player;
    }

    // ─── Auto-generate lineups from team players ──────────────────────────────────
    // Useful for games created before auto-lineup was implemented, or when the
    // streamer wants to regenerate lineups after adding players manually.

    async autoLineup(gameId: string, streamerId: string) {
        await this.verifyGameOwnership(gameId, streamerId);

        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                lineups: {
                    orderBy: { battingOrder: 'asc' },
                },
                homeTeam: {
                    include: {
                        rosterEntries: {
                            where: { isActive: true },
                            include: { player: true },
                            orderBy: { joinedAt: 'asc' },
                        },
                    },
                },
                awayTeam: {
                    include: {
                        rosterEntries: {
                            where: { isActive: true },
                            include: { player: true },
                            orderBy: { joinedAt: 'asc' },
                        },
                    },
                },
            },
        }) as any;

        if (!game) throw new NotFoundException('Juego no encontrado.');

        const previousLineups = new Map<string, { battingOrder: number; position: string; dhForPosition: string | null }>(
            (game.lineups || []).map((lineup: any) => [
                lineup.playerId,
                {
                    battingOrder: lineup.battingOrder,
                    position: lineup.position,
                    dhForPosition: lineup.dhForPosition ?? null,
                },
            ]),
        );

        const buildLineupDraft = (entries: any[]) => {
            const ordered = [...entries].sort((a, b) => {
                const existingA = previousLineups.get(a.player.id);
                const existingB = previousLineups.get(b.player.id);

                if (existingA && existingB) return existingA.battingOrder - existingB.battingOrder;
                if (existingA) return -1;
                if (existingB) return 1;

                return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
            });

            return ordered.map((entry, index) => {
                const existing = previousLineups.get(entry.player.id);
                const normalizedPosition = this.normalizePosition(existing?.position || entry.position || entry.player.position);
                const dhAnchor = normalizedPosition === 'DH'
                    ? this.normalizeDefensivePosition(existing?.dhForPosition)
                    : null;

                return {
                    playerId: entry.player.id,
                    battingOrder: index + 1,
                    position: normalizedPosition || 'UT',
                    dhForPosition: dhAnchor,
                };
            });
        };

        const insertLineups = async (
            lineupDraft: Array<{ playerId: string; battingOrder: number; position: string; dhForPosition: string | null }>,
            teamId: string,
        ) => {
            for (const entry of lineupDraft) {
                await this.prisma.lineup.create({
                    data: {
                        gameId,
                        teamId,
                        playerId: entry.playerId,
                        battingOrder: entry.battingOrder,
                        position: entry.position,
                        dhForPosition: entry.dhForPosition,
                        isStarter: true,
                        isActive: true,
                    } as any,
                });
            }
        };

        const homeEntries = game.homeTeam.rosterEntries;
        const awayEntries = game.awayTeam.rosterEntries;
        const homeDraft = buildLineupDraft(homeEntries);
        const awayDraft = buildLineupDraft(awayEntries);

        if (homeDraft.length > 0) this.validateLineup(homeDraft);
        if (awayDraft.length > 0) this.validateLineup(awayDraft);

        // Delete existing lineups only after both teams validate successfully
        await this.prisma.lineup.deleteMany({ where: { gameId } });

        if (homeDraft.length > 0) await insertLineups(homeDraft, game.homeTeamId);
        if (awayDraft.length > 0) await insertLineups(awayDraft, game.awayTeamId);

        return { created: (homeEntries.length + awayEntries.length) };
    }

    // ─── List quick games ────────────────────────────────────────────────────────

    async listGames(streamerId: string) {
        const league = await this.prisma.league.findFirst({
            where: { adminId: streamerId, name: SHADOW_LEAGUE_NAME },
        }) as any;

        if (!league) return [];

        const tournament = await this.prisma.tournament.findFirst({
            where: { leagueId: league.id, season: SHADOW_TOURNAMENT_SEASON },
        }) as any;

        if (!tournament) return [];

        return this.prisma.game.findMany({
            where: { tournamentId: tournament.id },
            include: {
                homeTeam: { select: { id: true, name: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, logoUrl: true } },
            },
            orderBy: { scheduledDate: 'desc' },
        });
    }

    // ─── Verify game belongs to this streamer ────────────────────────────────────

    async verifyGameOwnership(gameId: string, streamerId: string): Promise<void> {
        const league = await this.prisma.league.findFirst({
            where: { adminId: streamerId, name: SHADOW_LEAGUE_NAME },
        }) as any;
        if (!league) throw new ForbiddenException('No tienes juegos rápidos.');

        const tournament = await this.prisma.tournament.findFirst({
            where: { leagueId: league.id, season: SHADOW_TOURNAMENT_SEASON },
        }) as any;
        if (!tournament) throw new ForbiddenException('No tienes juegos rápidos.');

        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new NotFoundException('Juego no encontrado.');
        if (game.tournamentId !== tournament.id) throw new ForbiddenException('No tienes acceso a este juego.');
    }

    // ─── Get box score data ──────────────────────────────────────────────────────

    async getBoxScore(gameId: string, streamerId: string) {
        await this.verifyGameOwnership(gameId, streamerId);
        return this.gamesService.getGameBoxscore(gameId, {
            id: streamerId,
            userId: streamerId,
            role: 'streamer',
        });
    }

    // ─── Delete quick game ───────────────────────────────────────────────────────

    async deleteGame(gameId: string, streamerId: string) {
        await this.verifyGameOwnership(gameId, streamerId);
        
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;

        const homeTeamId = game.homeTeamId;
        const awayTeamId = game.awayTeamId;

        // Delete game first (due to FK constraints)
        await this.prisma.game.delete({ where: { id: gameId } });

        // Delete teams (cascades to their players, lineup entries, plays, etc)
        if (homeTeamId) {
            await this.prisma.team.delete({ where: { id: homeTeamId } }).catch(() => {});
        }
        if (awayTeamId) {
            await this.prisma.team.delete({ where: { id: awayTeamId } }).catch(() => {});
        }

        return { success: true };
    }
}
