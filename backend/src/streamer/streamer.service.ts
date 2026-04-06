import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SHADOW_LEAGUE_NAME = '__streamer__';
const SHADOW_TOURNAMENT_SEASON = '__quick__';

@Injectable()
export class StreamerService {
    constructor(private prisma: PrismaService) { }

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

        // Create home team
        const homeTeam = await this.prisma.team.create({
            data: { name: data.homeTeamName, tournamentId },
        });

        // Create home players (keep created records for lineup)
        const homePlayers: any[] = [];
        for (const p of (data.homePlayers || [])) {
            const player = await this.prisma.player.create({
                data: {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    number: p.number ?? null,
                    position: p.position ?? null,
                    teamId: homeTeam.id,
                },
            });
            homePlayers.push({ ...player, position: p.position });
        }

        // Create away team
        const awayTeam = await this.prisma.team.create({
            data: { name: data.awayTeamName, tournamentId },
        });

        // Create away players (keep created records for lineup)
        const awayPlayers: any[] = [];
        for (const p of (data.awayPlayers || [])) {
            const player = await this.prisma.player.create({
                data: {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    number: p.number ?? null,
                    position: p.position ?? null,
                    teamId: awayTeam.id,
                },
            });
            awayPlayers.push({ ...player, position: p.position });
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
        const createLineups = async (players: any[], teamId: string) => {
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                await this.prisma.lineup.create({
                    data: {
                        gameId: game.id,
                        teamId,
                        playerId: p.id,
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

        // Create reserve/bench players — Player records only, NO lineup entry
        // They will appear in "puedenEntrar" for substitutions
        const createReserves = async (reserves: { firstName: string; lastName: string; number?: number }[], teamId: string) => {
            for (const r of reserves) {
                await this.prisma.player.create({
                    data: {
                        firstName: r.firstName,
                        lastName: r.lastName,
                        number: r.number ?? null,
                        position: null,
                        teamId,
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

        const player = await this.prisma.player.create({
            data: {
                firstName: playerData.firstName,
                lastName: playerData.lastName,
                number: playerData.number ?? null,
                position: null,
                teamId,
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
                homeTeam: { include: { players: true } },
                awayTeam: { include: { players: true } },
            },
        }) as any;

        if (!game) throw new NotFoundException('Juego no encontrado.');

        // Delete existing lineups first (clean slate)
        await this.prisma.lineup.deleteMany({ where: { gameId } });

        const insertLineups = async (players: any[], teamId: string) => {
            for (let i = 0; i < players.length; i++) {
                await this.prisma.lineup.create({
                    data: {
                        gameId,
                        teamId,
                        playerId: players[i].id,
                        battingOrder: i + 1,
                        position: players[i].position || 'UT',
                        isStarter: true,
                        isActive: true,
                    } as any,
                });
            }
        };

        if (game.homeTeam.players.length > 0) await insertLineups(game.homeTeam.players, game.homeTeamId);
        if (game.awayTeam.players.length > 0) await insertLineups(game.awayTeam.players, game.awayTeamId);

        return { created: (game.homeTeam.players.length + game.awayTeam.players.length) };
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

        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                homeTeam: { include: { players: true } },
                awayTeam: { include: { players: true } },
                plays: {
                    orderBy: { timestamp: 'asc' },
                    include: {
                        batter: { select: { id: true, firstName: true, lastName: true, number: true } },
                        pitcher: { select: { id: true, firstName: true, lastName: true, number: true } },
                    },
                },
                lineups: {
                    include: {
                        player: { select: { id: true, firstName: true, lastName: true, number: true } },
                    },
                    orderBy: { battingOrder: 'asc' },
                },
            },
        }) as any;

        if (!game) throw new NotFoundException('Juego no encontrado.');
        return game;
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
