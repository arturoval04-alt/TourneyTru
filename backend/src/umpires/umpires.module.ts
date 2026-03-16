import { Module } from '@nestjs/common';
import { UmpiresService } from './umpires.service';
import { UmpiresController } from './umpires.controller';

@Module({
  providers: [UmpiresService],
  controllers: [UmpiresController]
})
export class UmpiresModule {}
