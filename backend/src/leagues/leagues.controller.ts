import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('api/leagues')
export class LeaguesController {
    constructor(private readonly leaguesService: LeaguesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createLeagueDto: CreateLeagueDto) {
        return this.leaguesService.create(createLeagueDto);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(@Query('adminId') adminId?: string, @Req() req?: any) {
        const requestor = req?.user ? { userId: req.user.id, role: req.user.role } : undefined;
        return this.leaguesService.findAll(adminId, requestor);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id') id: string, @Req() req?: any) {
        const requestor = req?.user ? { userId: req.user.id, role: req.user.role } : undefined;
        return this.leaguesService.findOne(id, requestor);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateLeagueDto: UpdateLeagueDto, @Req() req: any) {
        const requestor = req?.user ? { userId: req.user.id, role: req.user.role } : undefined;
        return this.leaguesService.update(id, updateLeagueDto, requestor);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        const requestor = req?.user ? { userId: req.user.id, role: req.user.role } : undefined;
        return this.leaguesService.remove(id, requestor);
    }

    @Get(':id/torneos')
    @UseGuards(OptionalJwtAuthGuard)
    async getTournaments(@Param('id') id: string, @Req() req?: any) {
        const requestor = req?.user ? { userId: req.user.id, role: req.user.role } : undefined;
        const league = await this.leaguesService.findOne(id, requestor);
        return league.tournaments;
    }
}
