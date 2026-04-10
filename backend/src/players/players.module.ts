import { Module } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { DelegatesModule } from '../delegates/delegates.module';
import { LeaguesModule } from '../leagues/leagues.module';

@Module({
  imports: [DelegatesModule, LeaguesModule],
  providers: [PlayersService],
  controllers: [PlayersController],
  exports: [PlayersService]
})
export class PlayersModule {}
