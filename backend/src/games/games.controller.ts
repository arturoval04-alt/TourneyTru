import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto, UpdateGameDto, SetGameLineupDto } from './dto/game.dto';

@Controller('api/games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) { }

    @Post()
    create(@Body() createGameDto: CreateGameDto) {
        return this.gamesService.create(createGameDto);
    }

    @Get()
    findAll(@Query('status') status?: string, @Query('tournamentId') tournamentId?: string) {
        return this.gamesService.findAll({ status, tournamentId });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.gamesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto) {
        return this.gamesService.update(id, updateGameDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.gamesService.remove(id);
    }

    @Post(':id/team/:teamId/lineup')
    setLineup(
        @Param('id') id: string,
        @Param('teamId') teamId: string,
        @Body() lineupData: SetGameLineupDto
    ) {
        return this.gamesService.setLineup(id, teamId, lineupData);
    }

    @Get(':id/boxscore')
    getBoxscore(@Param('id') id: string) {
        return this.gamesService.getGameBoxscore(id);
    }

    @Get(':id/state')
    getState(@Param('id') id: string) {
        return this.gamesService.getGameState(id);
    }
}
