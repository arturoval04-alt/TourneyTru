import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/live_games',
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGateway.name);
  private activeGames: Record<string, any> = {};

  constructor(private prisma: PrismaService, private jwtService: JwtService) { }

  private async withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (e: any) {
        const isConnErr = e?.message?.toLowerCase().includes('connect') ||
          e?.code === 'P1001' || e?.code === 'P1017';
        if (attempt < retries && isConnErr) {
          this.logger.warn(`DB connection error, reintentando (${attempt + 1}/${retries})...`);
          try { await this.prisma.$disconnect(); await this.prisma.$connect(); } catch { }
          continue;
        }
        throw e;
      }
    }
    throw new Error('withRetry: unreachable');
  }

  private parseCookieHeader(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce<Record<string, string>>((acc, chunk) => {
      const [rawKey, ...rawValue] = chunk.split('=');
      const key = rawKey?.trim();
      if (!key) return acc;
      acc[key] = decodeURIComponent(rawValue.join('=').trim());
      return acc;
    }, {});
  }

  private getAuthToken(client: Socket, payloadToken?: string): string | null {
    if (payloadToken) return payloadToken;
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken as string;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    const cookies = this.parseCookieHeader(client.handshake.headers?.cookie as string | undefined);
    return cookies.accessToken ?? null;
  }

  private verifySocketAuth(client: Socket, payloadToken?: string) {
    const token = this.getAuthToken(client, payloadToken);
    if (!token) return null;
    try {
      return this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
    } catch {
      return null;
    }
  }

  private buildFallbackState(game: {
    currentInning: number | null;
    half: string | null;
    homeScore: number;
    awayScore: number;
  }) {
    return {
      inning: game.currentInning ?? 1,
      half: game.half ?? 'top',
      outs: 0,
      balls: 0,
      strikes: 0,
      homeScore: game.homeScore ?? 0,
      awayScore: game.awayScore ?? 0,
      bases: { first: null, second: null, third: null },
      currentBatter: 'Esperando Bateador...',
      currentBatterId: null,
      playLogs: [],
      playbackId: null,
    };
  }

  handleConnection(client: Socket) {
    const token = this.getAuthToken(client);
    if (token) {
      const payload = this.verifySocketAuth(client);
      if (!payload) {
        this.logger.warn(`Cliente ${client.id} desconectado: token inv?lido`);
        client.disconnect(true);
        return;
      }
      (client.data as any).user = payload;
    }
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`game:${gameId}`);
    this.logger.log(`Client ${client.id} joined game: ${gameId}`);

    if (this.activeGames[gameId]) {
      client.emit('gameStateUpdate', {
        lastPlay: null,
        fullState: this.activeGames[gameId],
      });
    }

    return { status: 'joined', gameId };
  }

  @SubscribeMessage('requestFullSync')
  async handleRequestFullSync(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const gameId: string = typeof payload === 'string' ? payload : payload?.gameId;

    if (this.activeGames[gameId]) {
      client.emit('fullStateSync', {
        gameId,
        fullState: this.activeGames[gameId],
        source: 'memory',
      });
      return { status: 'ok', source: 'memory' };
    }

    try {
      const game = await this.withRetry(() =>
        this.prisma.game.findUnique({
          where: { id: gameId },
          select: {
            id: true,
            currentInning: true,
            half: true,
            homeScore: true,
            awayScore: true,
            liveStateJson: true,
          },
        }),
      );

      if (!game) {
        client.emit('fullStateSync', { gameId, fullState: null, source: 'db', error: 'Game not found' });
        return { status: 'not_found' };
      }

      if (game.liveStateJson) {
        try {
          const parsedState = JSON.parse(game.liveStateJson);
          this.activeGames[gameId] = parsedState;
          client.emit('fullStateSync', { gameId, fullState: parsedState, source: 'db_live_state' });
          return { status: 'ok', source: 'db_live_state' };
        } catch (error) {
          this.logger.warn(`liveStateJson inv?lido para juego ${gameId}: ${error}`);
        }
      }

      const fallbackState = this.buildFallbackState(game);
      client.emit('fullStateSync', { gameId, fullState: fallbackState, source: 'db_fallback' });
      return { status: 'ok', source: 'db_fallback' };
    } catch (e) {
      this.logger.error('Error fetching full game state from DB:', e);
      client.emit('fullStateSync', { gameId, fullState: null, source: 'db', error: 'DB error' });
      return { status: 'error' };
    }
  }

  @SubscribeMessage('syncState')
  async handleSyncState(
    @MessageBody() payload: { gameId: string; fullState: any; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const auth = this.verifySocketAuth(client, payload.token);
    if (!auth || !['admin', 'organizer', 'scorekeeper', 'streamer'].includes(auth.role)) {
      throw new WsException('Unauthorized');
    }

    const { gameId, fullState } = payload;
    this.activeGames[gameId] = fullState;

    try {
      await this.withRetry(() => this.prisma.game.update({
        where: { id: gameId },
        data: {
          homeScore: fullState?.homeScore ?? 0,
          awayScore: fullState?.awayScore ?? 0,
          currentInning: fullState?.inning ?? 1,
          half: fullState?.half ?? 'top',
          status: 'in_progress',
          liveStateJson: JSON.stringify(fullState ?? {}),
        },
      }));
    } catch (error) {
      this.logger.error('Error syncing full state to DB:', error);
    }

    this.server.to(`game:${gameId}`).emit('gameStateUpdate', {
      lastPlay: null,
      fullState,
    });
    return { status: 'synced' };
  }

  @SubscribeMessage('registerPlay')
  async handleRegisterPlay(
    @MessageBody() payload: { gameId: string; playInfo: any; fullState?: any; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const auth = this.verifySocketAuth(client, payload.token);
    if (!auth || !['admin', 'organizer', 'scorekeeper', 'streamer'].includes(auth.role)) {
      throw new WsException('Unauthorized');
    }
    const { gameId, playInfo, fullState } = payload;

    let play: any = null;
    try {
      const batterId = playInfo.batter_id || playInfo.batterId;
      const pitcherId = playInfo.pitcher_id || playInfo.pitcherId;
      const outsBeforePlay = playInfo.outs_before_play ?? playInfo.outsBeforePlay ?? 0;
      const runsScored = playInfo.runs_scored ?? playInfo.runsScored ?? 0;
      const outsRecorded = playInfo.outs_recorded ?? playInfo.outsRecorded ?? 0;
      const rbi = playInfo.rbi ?? 0;

      if (!batterId || !pitcherId) {
        const missing = !batterId && !pitcherId ? 'batter_id y pitcher_id' : !batterId ? 'batter_id' : 'pitcher_id';
        this.logger.error(`Jugada rechazada: falta ${missing}`);
        client.emit('play_error', { code: 'MISSING_PLAYER', message: `No se puede registrar la jugada: falta ${missing}.` });
        return { status: 'error', code: 'MISSING_PLAYER' };
      }

      const rawResult = playInfo.result || '';
      const resultCode = rawResult.includes('|') ? rawResult.split('|')[0] : rawResult;
      const resultDescription = rawResult.includes('|') ? rawResult.split('|')[1] : null;

      let batterRosterEntryId: string | undefined;
      let pitcherRosterEntryId: string | undefined;
      try {
        const gameRecord = await this.prisma.game.findUnique({
          where: { id: gameId },
          select: { tournamentId: true, homeTeamId: true, awayTeamId: true },
        });
        if (gameRecord) {
          const half = playInfo.half as string;
          const batterTeamId = half === 'top' ? gameRecord.awayTeamId : gameRecord.homeTeamId;
          const pitcherTeamId = half === 'top' ? gameRecord.homeTeamId : gameRecord.awayTeamId;
          const [batterEntry, pitcherEntry] = await Promise.all([
            this.prisma.rosterEntry.findFirst({
              where: { playerId: batterId, teamId: batterTeamId, tournamentId: gameRecord.tournamentId },
              select: { id: true },
            }),
            this.prisma.rosterEntry.findFirst({
              where: { playerId: pitcherId, teamId: pitcherTeamId, tournamentId: gameRecord.tournamentId },
              select: { id: true },
            }),
          ]);
          batterRosterEntryId = batterEntry?.id;
          pitcherRosterEntryId = pitcherEntry?.id;
        }
      } catch (e) {
        this.logger.warn('No se pudo resolver RosterEntry IDs para la jugada:', e);
      }

      play = await this.withRetry(() => this.prisma.play.create({
        data: {
          gameId,
          inning: playInfo.inning,
          half: playInfo.half,
          outsBeforePlay,
          result: resultCode,
          description: resultDescription,
          rbi,
          runsScored,
          outsRecorded,
          scored: playInfo.scored || false,
          batterId,
          pitcherId,
          batterRosterEntryId: batterRosterEntryId ?? null,
          pitcherRosterEntryId: pitcherRosterEntryId ?? null,
          runnersOnBase: playInfo.runners_on_base ?? '000',
          ballsOnPlay: playInfo.balls_on_play ?? 0,
          strikesOnPlay: playInfo.strikes_on_play ?? 0,
          swingsInPA: playInfo.swings_in_pa ?? 0,
          contactsInPA: playInfo.contacts_in_pa ?? 0,
          pitchesInPA: playInfo.pitches_in_pa ?? 0,
        }
      }));
      this.logger.log(`Jugada guardada (Play ID: ${play?.id}, Result: ${resultCode})`);
      if (play?.id) client.emit('play_registered', { playId: play.id });
    } catch (e) {
      this.logger.error('Error guardando play en DB (sin reintentos disponibles):', e);
      client.emit('play_db_error', {
        playInfo,
        message: 'No se pudo guardar la jugada en la base de datos. Reintentando v?a HTTP...',
      });
    }

    if (fullState) {
      try {
        await this.withRetry(() => this.prisma.game.update({
          where: { id: gameId },
          data: {
            homeScore: fullState.homeScore ?? 0,
            awayScore: fullState.awayScore ?? 0,
            currentInning: fullState.inning ?? 1,
            half: fullState.half ?? 'top',
            status: 'in_progress',
            liveStateJson: JSON.stringify(fullState),
          },
        }));
      } catch (e) {
        this.logger.error('Error syncing game state to DB:', e);
      }

      this.activeGames[gameId] = fullState;
    }

    this.server.to(`game:${gameId}`).emit('gameStateUpdate', {
      lastPlay: playInfo,
      fullState,
    });

    return { status: 'play_registered', playId: play?.id ?? null };
  }
}
