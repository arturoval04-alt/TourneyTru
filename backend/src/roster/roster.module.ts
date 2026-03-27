import { Module } from '@nestjs/common';
import { RosterService } from './roster.service';
import { RosterController } from './roster.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [RosterService],
    controllers: [RosterController],
    exports: [RosterService],
})
export class RosterModule {}
