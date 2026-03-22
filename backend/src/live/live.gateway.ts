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

  constructor(private prisma: PrismaService, private jwtService: JwtService) { }


  private getAuthToken(client: Socket, payloadToken?: string): string | null {
    if (payloadToken) return payloadToken;
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken as string;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return null;
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


  // Mapa temporal en memoria para mantener el último estado de cada juego activo
  private activeGames: Record<string, any> = {};

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Permite al Frontend Público o al Scorekeeper unirse al 'room' del juego actual
  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`game:${gameId}`);
    console.log(`Client ${client.id} joined game: ${gameId}`);

    // Si ya existe un estado activo para ese juego en memoria, envíalo al recién conectado
    if (this.activeGames[gameId]) {
      client.emit('gameStateUpdate', {
        lastPlay: null,
        fullState: this.activeGames[gameId]
      });
    }

    return { status: 'joined', gameId };
  }

  // Permite al scorekeeper inyectar el estado inicial directamente (si refresca o recién crea el juego)
  @SubscribeMessage('syncState')
  handleSyncState(
    @MessageBody() payload: { gameId: string; fullState: any; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const auth = this.verifySocketAuth(client, payload.token);
    if (!auth) throw new WsException('Unauthorized');
    const { gameId, fullState } = payload;
    this.activeGames[gameId] = fullState;

    this.server.to(`game:${gameId}`).emit('gameStateUpdate', {
      lastPlay: null,
      fullState: fullState,
    });
    return { status: 'synced' };
  }

  // Recibe jugadas del Scorekeeper, guarda en db y difunde a los fans
  @SubscribeMessage('registerPlay')
  async handleRegisterPlay(
    @MessageBody() payload: { gameId: string; playInfo: any; fullState?: any; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const auth = this.verifySocketAuth(client, payload.token);
    if (!auth) throw new WsException('Unauthorized');
    const { gameId, playInfo, fullState } = payload;

    // Aquí (en fase 3 completa) se validaría la jugada y se actualizarían bases y Score.
    // Por ahora, simulamos el motor de juego guardando el log básico y difundiéndolo.

    // 2. Guardar en DB
    let play: any = null;
    try {
      // Support both snake_case (frontend sends) and camelCase field names
      const batterId = playInfo.batter_id || playInfo.batterId;
      const pitcherId = playInfo.pitcher_id || playInfo.pitcherId;
      const outsBeforePlay = playInfo.outs_before_play ?? playInfo.outsBeforePlay ?? 0;
      const runsScored = playInfo.runs_scored ?? playInfo.runsScored ?? 0;
      const outsRecorded = playInfo.outs_recorded ?? playInfo.outsRecorded ?? 0;
      const rbi = playInfo.rbi ?? 0;

      if (!batterId) {
        console.warn("⚠️ Advertencia: batter_id no fue proporcionado. Asignando jugada a bateador por defecto.");
      }

      // Buscar un fallback real en base de datos si falta el batter o pitcher
      let validBatterId = batterId;
      let validPitcherId = pitcherId;

      if (!validBatterId) {
        const fallbackPlayer = await this.prisma.player.findFirst();
        validBatterId = fallbackPlayer ? fallbackPlayer.id : undefined;
      }

      if (!validPitcherId) {
        const fallbackPlayer = await this.prisma.player.findFirst();
        validPitcherId = fallbackPlayer ? fallbackPlayer.id : undefined;
      }

      // Extract just the play code from "CODE|Description" format
      const rawResult = playInfo.result || '';
      const resultCode = rawResult.includes('|') ? rawResult.split('|')[0] : rawResult;

      play = await this.prisma.play.create({
        data: {
          gameId,
          inning: playInfo.inning,
          half: playInfo.half,
          outsBeforePlay: outsBeforePlay,
          result: resultCode,
          rbi: rbi,
          runsScored: runsScored,
          outsRecorded: outsRecorded,
          batterId: validBatterId,
          pitcherId: validPitcherId,
        }
      });
      console.log(`[DB] Jugada guardada (Play ID: ${play?.id}, Batter: ${validBatterId}, Result: ${resultCode})`);
    } catch (e) {
      console.error("Error guardando play en DB:", e);
    }

    // Sync game state to DB so it persists across page refreshes
    if (fullState) {
      try {
        await this.prisma.game.update({
          where: { id: gameId },
          data: {
            homeScore: fullState.homeScore ?? 0,
            awayScore: fullState.awayScore ?? 0,
            currentInning: fullState.inning ?? 1,
            half: fullState.half ?? 'top',
            status: 'in_progress',
          },
        });
      } catch (e) {
        console.error("Error syncing game state to DB:", e);
      }

      // Actualizar el estado en memoria para futuros conectados
      this.activeGames[gameId] = fullState;
    }

    // 2. Difundir a todo el los clientes viendo este juego (Gamecast y Panel local)
    this.server.to(`game:${gameId}`).emit('gameStateUpdate', {
      lastPlay: playInfo,
      fullState: fullState,
    });

    return { status: 'play_registered', playId: null };
  }
}
