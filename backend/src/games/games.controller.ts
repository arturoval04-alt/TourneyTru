import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { GamesService } from './games.service';
import { AssignUmpireDto, CreateGameDto, UpdateGameDto, SetGameLineupDto, ChangeLineupDto, CambioSustitucionDto, CambioPosicionDto, CambioReingresoDto } from './dto/game.dto';
import { SubmitManualStatsDto } from './dto/manual-stats.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('api/games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createGameDto: CreateGameDto) {
        return this.gamesService.create(createGameDto);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('tournamentId') tournamentId?: string,
        @Query('limit') limit?: string,
        @Query('adminId') adminId?: string,
        @Query('leagueId') leagueId?: string,
    ) {
        const user = req.user;
        // Scorekeepers solo pueden ver juegos de su liga asignada — sin excepción
        if (user?.role === 'scorekeeper') {
            return this.gamesService.findAll({
                status, tournamentId, limit: limit ? parseInt(limit) : undefined,
                leagueId: user.scorekeeperLeagueId ?? '__none__',
            });
        }
        return this.gamesService.findAll({ status, tournamentId, limit: limit ? parseInt(limit) : undefined, adminId, leagueId });
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

    @Delete(':id/plays')
    @UseGuards(JwtAuthGuard)
    deletePlays(@Param('id') id: string, @Body() body: { playIds: string[] }) {
        return this.gamesService.deletePlays(id, body.playIds);
    }

    @Post(':id/team/:teamId/lineup')
    @UseGuards(JwtAuthGuard)
    setLineup(
        @Param('id') id: string,
        @Param('teamId') teamId: string,
        @Body() lineupData: SetGameLineupDto
    ) {
        console.log(`[GamesController] Entering setLineup for game ${id}, team ${teamId}`);
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

    @Get(':id/pitcher-matchup')
    getPitcherMatchup(@Param('id') id: string) {
        return this.gamesService.getPitcherMatchup(id);
    }

    // ─── Cambios v2 ─────────────────────────────────────────────────────────────

    @Get(':id/cambios/elegibles/:teamId')
    getCambiosEligibles(@Param('id') id: string, @Param('teamId') teamId: string) {
        return this.gamesService.getCambiosEligibles(id, teamId);
    }

    @Post(':id/cambios/sustitucion')
    @UseGuards(JwtAuthGuard)
    cambioSustitucion(@Param('id') id: string, @Body() dto: CambioSustitucionDto) {
        return this.gamesService.cambioSustitucion(id, dto);
    }

    @Post(':id/cambios/posicion')
    @UseGuards(JwtAuthGuard)
    cambioPosicion(@Param('id') id: string, @Body() dto: CambioPosicionDto) {
        return this.gamesService.cambioPosicion(id, dto);
    }

    @Post(':id/cambios/reingreso')
    @UseGuards(JwtAuthGuard)
    cambioReingreso(@Param('id') id: string, @Body() dto: CambioReingresoDto) {
        return this.gamesService.cambioReingreso(id, dto);
    }

    @Get(':id/umpires')
    getGameUmpires(@Param('id') id: string) {
        return this.gamesService.getGameUmpires(id);
    }

    @Post(':id/umpires')
    @UseGuards(JwtAuthGuard)
    assignUmpire(@Param('id') id: string, @Body() dto: AssignUmpireDto) {
        return this.gamesService.assignUmpire(id, dto);
    }

    @Delete(':id/umpires/:umpireId')
    @UseGuards(JwtAuthGuard)
    removeUmpire(@Param('id') id: string, @Param('umpireId') umpireId: string) {
        return this.gamesService.removeUmpire(id, umpireId);
    }

    // ─── Stream (Facebook Live) ──────────────────────────────────────────────────

    @Get(':id/stream-info')
    getStreamInfo(@Param('id') id: string) {
        return this.gamesService.getStreamInfo(id);
    }

    @Post(':id/stream')
    @UseGuards(JwtAuthGuard)
    startStream(@Param('id') id: string, @Body() body: { facebookStreamUrl: string }) {
        return this.gamesService.startStream(id, body.facebookStreamUrl);
    }

    @Delete(':id/stream')
    @UseGuards(JwtAuthGuard)
    endStream(@Param('id') id: string) {
        return this.gamesService.endStream(id);
    }

    // ─── Manual Stats ─────────────────────────────────────────────────────────────

    @Post(':id/manual-stats')
    @UseGuards(JwtAuthGuard)
    submitManualStats(@Param('id') id: string, @Body() dto: SubmitManualStatsDto) {
        return this.gamesService.submitManualStats(id, dto);
    }
}
