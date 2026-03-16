import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/live_games',
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) { }

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
    @MessageBody() payload: { gameId: string; fullState: any },
    @ConnectedSocket() client: Socket,
  ) {
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
    @MessageBody() payload: { gameId: string; playInfo: any; fullState?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, playInfo, fullState } = payload;

    // Aquí (en fase 3 completa) se validaría la jugada y se actualizarían bases y Score.
    // Por ahora, simulamos el motor de juego guardando el log básico y difundiéndolo.

    // 2. Guardar en DB
    let play = null;
    try {
      if (!playInfo.batterId) {
        console.warn("⚠️ Advertencia: playInfo.batterId no fue proporcionado. Asignando jugada a bateador por defecto.");
      }

      // Buscar un fallback real en base de datos si falta el batter o pitcher
      let validBatterId = playInfo.batterId;
      let validPitcherId = playInfo.pitcherId;

      if (!validBatterId) {
        const fallbackPlayer = await this.prisma.player.findFirst();
        validBatterId = fallbackPlayer ? fallbackPlayer.id : undefined;
      }

      if (!validPitcherId) {
        const fallbackPlayer = await this.prisma.player.findFirst();
        validPitcherId = fallbackPlayer ? fallbackPlayer.id : undefined;
      }

      play = await this.prisma.play.create({
        data: {
          gameId,
          inning: playInfo.inning,
          half: playInfo.half,
          outsBeforePlay: playInfo.outsBeforePlay,
          result: playInfo.result,
          rbi: playInfo.rbi || 0,
          runsScored: playInfo.runsScored || 0,
          outsRecorded: playInfo.outsRecorded !== undefined ? playInfo.outsRecorded : 0,
          batterId: validBatterId,
          pitcherId: validPitcherId,
        }
      });
      console.log(`[DB] Jugada guardada en SQLite (Play ID: ${play.id})`);
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
