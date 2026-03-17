import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto, UpdateGameDto, SetGameLineupDto, ChangeLineupDto } from './dto/game.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
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
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto) {
        return this.gamesService.update(id, updateGameDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.gamesService.remove(id);
    }

    @Post(':id/team/:teamId/lineup')
    @UseGuards(JwtAuthGuard)
    setLineup(
        @Param('id') id: string,
        @Param('teamId') teamId: string,
        @Body() lineupData: SetGameLineupDto
    ) {
        return this.gamesService.setLineup(id, teamId, lineupData);
    }

    @Post(':id/lineup-change')
    @UseGuards(JwtAuthGuard)
    changeLineup(
        @Param('id') id: string,
        @Body() change: ChangeLineupDto
    ) {
        return this.gamesService.changeLineup(id, change);
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
