import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { FieldsReportService } from './fields-report.service';
import { CreateFieldDto, UpdateFieldDto, CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/field.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

// ─── Reportes de campos / liga ───────────────────────────────────────────────

@Controller('api/leagues/:leagueId/fields')
export class LeagueFieldsController {
    constructor(
        private readonly fieldsService: FieldsService,
        private readonly reportService: FieldsReportService,
    ) {}

    @Get('report')
    @UseGuards(OptionalJwtAuthGuard)
    getOccupancyReport(
        @Param('leagueId') leagueId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('round') round?: string,
    ) {
        return this.reportService.getOccupancyReport(leagueId, from, to, round);
    }

    // ─── Campos a nivel liga ─────────────────────────────────────────────────

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(
        @Param('leagueId') leagueId: string,
        @Query('sportsUnitId') sportsUnitId?: string,
    ) {
        return this.fieldsService.findAllByLeague(leagueId, sportsUnitId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(
        @Param('leagueId') leagueId: string,
        @Body() body: Omit<CreateFieldDto, 'leagueId'>,
        @Req() req: any,
    ) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.fieldsService.create({ ...body, leagueId }, requestor);
    }
}

// ─── Operaciones por campo (get/update/delete + disponibilidad + horario) ────

@Controller('api/fields')
export class FieldsController {
    constructor(
        private readonly fieldsService: FieldsService,
        private readonly reportService: FieldsReportService,
    ) {}

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.fieldsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() body: UpdateFieldDto, @Req() req: any) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.fieldsService.update(id, body, requestor);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.fieldsService.remove(id, requestor);
    }

    // ─── Horario del campo ───────────────────────────────────────────────────
    // Nota: se registra como `:id/schedule` — NestJS evalúa rutas exactas antes de params,
    // pero como `:fieldId` es igual a `:id` en valor y hay `/schedule` como segundo segmento,
    // no hay ambigüedad.

    @Get(':fieldId/schedule')
    @UseGuards(OptionalJwtAuthGuard)
    getFieldSchedule(
        @Param('fieldId') fieldId: string,
        @Query('from') from: string,
        @Query('to') to?: string,
    ) {
        return this.reportService.getFieldSchedule(fieldId, from, to);
    }

    // ─── Disponibilidad ──────────────────────────────────────────────────────

    @Get(':fieldId/availability')
    @UseGuards(OptionalJwtAuthGuard)
    getAvailability(@Param('fieldId') fieldId: string, @Query('date') date?: string) {
        return this.fieldsService.getAvailability(fieldId, date);
    }

    @Post(':fieldId/availability')
    @UseGuards(JwtAuthGuard)
    createAvailability(
        @Param('fieldId') fieldId: string,
        @Body() body: CreateAvailabilityDto,
        @Req() req: any,
    ) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.fieldsService.createAvailability(fieldId, body, requestor);
    }

    @Patch(':fieldId/availability/:id')
    @UseGuards(JwtAuthGuard)
    updateAvailability(
        @Param('id') id: string,
        @Body() body: UpdateAvailabilityDto,
        @Req() req: any,
    ) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.fieldsService.updateAvailability(id, body, requestor);
    }

    @Delete(':fieldId/availability/:id')
    @UseGuards(JwtAuthGuard)
    deleteAvailability(@Param('id') id: string, @Req() req: any) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.fieldsService.deleteAvailability(id, requestor);
    }
}
