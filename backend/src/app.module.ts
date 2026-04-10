import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LeaguesModule } from './leagues/leagues.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { UmpiresModule } from './umpires/umpires.module';
import { GamesModule } from './games/games.module';
import { LiveModule } from './live/live.module';
import { UsersModule } from './users/users.module';
import { StatsModule } from './stats/stats.module';
import { VisionModule } from './vision/vision.module';
import { RosterModule } from './roster/roster.module';
import { StreamerModule } from './streamer/streamer.module';
import { DelegatesModule } from './delegates/delegates.module';
import { DocumentsModule } from './documents/documents.module';
import { SportsUnitsModule } from './sports-units/sports-units.module';
import { FieldsModule } from './fields/fields.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),
    PrismaModule,
    AuthModule,
    LeaguesModule,
    TournamentsModule,
    TeamsModule,
    PlayersModule,
    UmpiresModule,
    GamesModule,
    LiveModule,
    UsersModule,
    StatsModule,
    VisionModule,
    RosterModule,
    StreamerModule,
    DelegatesModule,
    DocumentsModule,
    SportsUnitsModule,
    FieldsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate limiting activo en toda la app — los endpoints de auth tienen sus propios límites más estrictos
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
