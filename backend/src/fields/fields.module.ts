import { Module } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { FieldsReportService } from './fields-report.service';
import { FieldsController, LeagueFieldsController } from './fields.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [FieldsService, FieldsReportService],
    controllers: [LeagueFieldsController, FieldsController],
    exports: [FieldsService, FieldsReportService],
})
export class FieldsModule {}
