import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LeaguesModule } from './leagues/leagues.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { UmpiresModule } from './umpires/umpires.module';
import { GamesModule } from './games/games.module';
import { LiveModule } from './live/live.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    LeaguesModule,
    TournamentsModule,
    TeamsModule,
    PlayersModule,
    UmpiresModule,
    GamesModule,
    LiveModule,
    UsersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
