import { Module } from '@nestjs/common';
import { DelegatesController } from './delegates.controller';
import { DelegatesService } from './delegates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DelegatesController],
    providers: [DelegatesService],
    exports: [DelegatesService],
})
export class DelegatesModule {}
