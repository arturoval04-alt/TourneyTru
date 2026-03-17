import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/leagues')
export class LeaguesController {
    constructor(private readonly leaguesService: LeaguesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
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
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateLeagueDto: UpdateLeagueDto) {
        return this.leaguesService.update(id, updateLeagueDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.leaguesService.remove(id);
    }
}
