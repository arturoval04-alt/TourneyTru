import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, CreateTeamBulkDto } from './dto/team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('api/teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createTeamDto: CreateTeamDto) {
        return this.teamsService.create(createTeamDto);
    }

    @Post('bulk')
    @UseGuards(JwtAuthGuard)
    createBulk(@Body() createBulkDto: CreateTeamBulkDto) {
        return this.teamsService.createBulk(createBulkDto);
    }

    @Get()
    findAll(
        @Query('tournamentId') tournamentId?: string,
        @Query('includePlayers') includePlayers?: string,
    ) {
        return this.teamsService.findAll({ tournamentId, includePlayers: includePlayers === 'true' });
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id') id: string, @Request() req: any) {
        const requestor = req?.user ? { 
            id: req.user.id, 
            userId: req.user.id,
            role: req.user.role, 
            scorekeeperLeagueId: req.user.scorekeeperLeagueId ?? null,
            scorekeeperTournamentIds: req.user.scorekeeperTournamentIds ?? []
        } : undefined;
        return this.teamsService.findOne(id, requestor);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto, @Request() req: any) {
        return this.teamsService.update(id, updateTeamDto, req.user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.teamsService.remove(id, req.user);
    }
}
