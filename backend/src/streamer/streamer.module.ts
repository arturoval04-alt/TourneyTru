import { Module } from '@nestjs/common';
import { GamesModule } from '../games/games.module';
import { StreamerService } from './streamer.service';
import { StreamerController } from './streamer.controller';

@Module({
    imports: [GamesModule],
    providers: [StreamerService],
    controllers: [StreamerController],
})
export class StreamerModule { }
