import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';

@Controller('api/leagues')
export class LeaguesController {
    constructor(private readonly leaguesService: LeaguesService) { }

    @Post()
    create(@Body() createLeagueDto: CreateLeagueDto) {
        return this.leaguesService.create(createLeagueDto);
    }

    @Get()
    findAll() {
        return this.leaguesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leaguesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLeagueDto: UpdateLeagueDto) {
        return this.leaguesService.update(id, updateLeagueDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.leaguesService.remove(id);
    }
}
