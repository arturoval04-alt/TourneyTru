import { Module } from '@nestjs/common';
import { StreamerService } from './streamer.service';
import { StreamerController } from './streamer.controller';

@Module({
    providers: [StreamerService],
    controllers: [StreamerController],
})
export class StreamerModule { }
