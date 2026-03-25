import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { LiveModule } from '../live/live.module';

@Module({
  imports: [LiveModule],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
