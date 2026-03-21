import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, CreateTeamBulkDto } from './dto/team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
    findOne(@Param('id') id: string) {
        return this.teamsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
        return this.teamsService.update(id, updateTeamDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.teamsService.remove(id);
    }
}
