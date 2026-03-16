import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, CreateTeamBulkDto } from './dto/team.dto';

@Controller('api/teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Post()
    create(@Body() createTeamDto: CreateTeamDto) {
        return this.teamsService.create(createTeamDto);
    }

    @Post('bulk')
    createBulk(@Body() createBulkDto: CreateTeamBulkDto) {
        return this.teamsService.createBulk(createBulkDto);
    }

    @Get()
    findAll() {
        return this.teamsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.teamsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
        return this.teamsService.update(id, updateTeamDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.teamsService.remove(id);
    }
}
