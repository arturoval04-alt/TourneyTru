import { Module } from '@nestjs/common';
import { SportsUnitsService } from './sports-units.service';
import { SportsUnitsController } from './sports-units.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [SportsUnitsService],
    controllers: [SportsUnitsController],
    exports: [SportsUnitsService],
})
export class SportsUnitsModule {}
