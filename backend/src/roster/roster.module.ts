import { Module } from '@nestjs/common';
import { RosterService } from './roster.service';
import { RosterController } from './roster.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DelegatesModule } from '../delegates/delegates.module';
import { LeaguesModule } from '../leagues/leagues.module';

@Module({
    imports: [PrismaModule, DelegatesModule, LeaguesModule],
    providers: [RosterService],
    controllers: [RosterController],
    exports: [RosterService],
})
export class RosterModule {}
