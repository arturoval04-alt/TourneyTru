import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { LiveModule } from '../live/live.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LiveModule, AuthModule],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
