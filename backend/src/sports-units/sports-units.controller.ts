import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { SportsUnitsService } from './sports-units.service';
import { CreateSportsUnitDto, UpdateSportsUnitDto, UpdateScheduleConfigDto } from './dto/sports-unit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('api/leagues/:leagueId/sports-units')
export class SportsUnitsController {
    constructor(private readonly sportsUnitsService: SportsUnitsService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(@Param('leagueId') leagueId: string) {
        return this.sportsUnitsService.findAll(leagueId);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.sportsUnitsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(
        @Param('leagueId') leagueId: string,
        @Body() body: Omit<CreateSportsUnitDto, 'leagueId'>,
        @Req() req: any,
    ) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.sportsUnitsService.create({ ...body, leagueId }, requestor);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() body: UpdateSportsUnitDto, @Req() req: any) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.sportsUnitsService.update(id, body, requestor);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.sportsUnitsService.remove(id, requestor);
    }

    @Get(':id/schedule-config')
    @UseGuards(OptionalJwtAuthGuard)
    getScheduleConfig(@Param('id') id: string) {
        return this.sportsUnitsService.getScheduleConfig(id);
    }

    @Patch(':id/schedule-config')
    @UseGuards(JwtAuthGuard)
    updateScheduleConfig(
        @Param('id') id: string,
        @Body() body: UpdateScheduleConfigDto,
        @Req() req: any,
    ) {
        const requestor = { userId: req.user.id, role: req.user.role };
        return this.sportsUnitsService.updateScheduleConfig(id, body, requestor);
    }
}
