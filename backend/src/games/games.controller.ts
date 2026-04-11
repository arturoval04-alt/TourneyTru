import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GamesService } from './games.service';
import { AssignUmpireDto, CreateGameDto, UpdateGameDto, SetGameLineupDto, ChangeLineupDto, CambioSustitucionDto, CambioPosicionDto, CambioReingresoDto, ScheduleGameDto } from './dto/game.dto';
import { SubmitManualStatsDto } from './dto/manual-stats.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Requestor } from '../common/types';

const buildRequestor = (user?: any): Requestor | undefined => {
    if (!user) return undefined;
    return {
        id: user.id,
        userId: user.id,
        role: user.role,
        scorekeeperLeagueId: user.scorekeeperLeagueId ?? null,
        scorekeeperTournamentIds: user.scorekeeperTournamentIds ?? [],
        delegateTeamId: user.delegateTeamId ?? null,
        delegateTournamentId: user.delegateTournamentId ?? null,
        delegateTeamIds: user.delegateTeamIds ?? [],
        delegateTournamentIds: user.delegateTournamentIds ?? [],
        delegateAssignments: user.delegateAssignments ?? [],
        isDelegateActive: user.isDelegateActive ?? false,
    };
};

@Controller('api/games')
export class GamesController {
    constructor(
        private readonly gamesService: GamesService,
        private readonly jwtService: JwtService,
    ) { }

    private createOverlayAccessToken(gameId: string) {
        return this.jwtService.sign(
            { type: 'overlay_access', gameId },
            {
                secret: process.env.JWT_SECRET,
                expiresIn: '30d',
            },
        );
    }

    private buildReadRequestor(req: any, gameId: string, overlayToken?: string): Requestor | undefined {
        const userRequestor = buildRequestor(req?.user);
        if (userRequestor) return userRequestor;
        if (!overlayToken) return undefined;

        try {
            const payload = this.jwtService.verify(overlayToken, { secret: process.env.JWT_SECRET }) as any;
            if (payload?.type === 'overlay_access' && payload?.gameId === gameId) {
                return {
                    id: `overlay:${gameId}`,
                    userId: `overlay:${gameId}`,
                    role: 'overlay',
                };
            }
        } catch {
            return undefined;
        }

        return undefined;
    }

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
        if (user?.role === 'scorekeeper') {
            return this.gamesService.findAll({
                status,
                tournamentId,
                limit: limit ? parseInt(limit) : undefined,
                scorekeeperTournamentIds: user.scorekeeperTournamentIds ?? [],
            });
        }
        return this.gamesService.findAll({ status, tournamentId, limit: limit ? parseInt(limit) : undefined, adminId, leagueId });
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id') id: string, @Request() req: any, @Query('ot') overlayToken?: string) {
        return this.gamesService.findOne(id, this.buildReadRequestor(req, id, overlayToken));
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto, @Request() req: any) {
        return this.gamesService.update(id, updateGameDto, buildRequestor(req?.user));
    }

    @Patch(':id/schedule')
    @UseGuards(JwtAuthGuard)
    schedule(@Param('id') id: string, @Body() dto: ScheduleGameDto, @Request() req: any) {
        return this.gamesService.scheduleGame(id, dto, buildRequestor(req?.user));
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.gamesService.remove(id, buildRequestor(req?.user));
    }

    @Delete(':id/plays')
    @UseGuards(JwtAuthGuard)
    deletePlays(@Param('id') id: string, @Body() body: { playIds: string[] }, @Request() req: any) {
        return this.gamesService.deletePlays(id, body.playIds, buildRequestor(req?.user));
    }

    @Post(':id/team/:teamId/lineup')
    @UseGuards(JwtAuthGuard)
    setLineup(
        @Param('id') id: string,
        @Param('teamId') teamId: string,
        @Body() lineupData: SetGameLineupDto,
        @Request() req: any,
    ) {
        return this.gamesService.setLineup(id, teamId, lineupData, buildRequestor(req?.user));
    }

    @Post(':id/lineup-change')
    @UseGuards(JwtAuthGuard)
    changeLineup(
        @Param('id') id: string,
        @Body() change: ChangeLineupDto,
        @Request() req: any,
    ) {
        return this.gamesService.changeLineup(id, change, buildRequestor(req?.user));
    }

    @Get(':id/boxscore')
    @UseGuards(OptionalJwtAuthGuard)
    getBoxscore(@Param('id') id: string, @Request() req: any, @Query('ot') overlayToken?: string) {
        return this.gamesService.getGameBoxscore(id, this.buildReadRequestor(req, id, overlayToken));
    }

    @Get(':id/state')
    @UseGuards(OptionalJwtAuthGuard)
    getState(@Param('id') id: string, @Request() req: any, @Query('ot') overlayToken?: string) {
        return this.gamesService.getGameState(id, this.buildReadRequestor(req, id, overlayToken));
    }

    @Get(':id/pitcher-matchup')
    @UseGuards(OptionalJwtAuthGuard)
    getPitcherMatchup(@Param('id') id: string, @Request() req: any, @Query('ot') overlayToken?: string) {
        return this.gamesService.getPitcherMatchup(id, this.buildReadRequestor(req, id, overlayToken));
    }

    @Get(':id/cambios/elegibles/:teamId')
    @UseGuards(OptionalJwtAuthGuard)
    getCambiosEligibles(@Param('id') id: string, @Param('teamId') teamId: string, @Request() req: any) {
        return this.gamesService.getCambiosEligibles(id, teamId, buildRequestor(req?.user));
    }

    @Post(':id/cambios/sustitucion')
    @UseGuards(JwtAuthGuard)
    cambioSustitucion(@Param('id') id: string, @Body() dto: CambioSustitucionDto, @Request() req: any) {
        return this.gamesService.cambioSustitucion(id, dto, buildRequestor(req?.user));
    }

    @Post(':id/cambios/posicion')
    @UseGuards(JwtAuthGuard)
    cambioPosicion(@Param('id') id: string, @Body() dto: CambioPosicionDto, @Request() req: any) {
        return this.gamesService.cambioPosicion(id, dto, buildRequestor(req?.user));
    }

    @Post(':id/cambios/reingreso')
    @UseGuards(JwtAuthGuard)
    cambioReingreso(@Param('id') id: string, @Body() dto: CambioReingresoDto, @Request() req: any) {
        return this.gamesService.cambioReingreso(id, dto, buildRequestor(req?.user));
    }

    @Get(':id/umpires')
    @UseGuards(OptionalJwtAuthGuard)
    getGameUmpires(@Param('id') id: string, @Request() req: any) {
        return this.gamesService.getGameUmpires(id, buildRequestor(req?.user));
    }

    @Post(':id/umpires')
    @UseGuards(JwtAuthGuard)
    assignUmpire(@Param('id') id: string, @Body() dto: AssignUmpireDto, @Request() req: any) {
        return this.gamesService.assignUmpire(id, dto, buildRequestor(req?.user));
    }

    @Delete(':id/umpires/:umpireId')
    @UseGuards(JwtAuthGuard)
    removeUmpire(@Param('id') id: string, @Param('umpireId') umpireId: string, @Request() req: any) {
        return this.gamesService.removeUmpire(id, umpireId, buildRequestor(req?.user));
    }

    @Get(':id/stream-info')
    @UseGuards(OptionalJwtAuthGuard)
    async getStreamInfo(@Param('id') id: string, @Request() req: any, @Query('ot') overlayToken?: string) {
        const requestor = this.buildReadRequestor(req, id, overlayToken);
        const data = await this.gamesService.getStreamInfo(id, requestor);
        return {
            ...data,
            overlayAccessToken: requestor ? this.createOverlayAccessToken(id) : null,
        };
    }

    @Post(':id/stream')
    @UseGuards(JwtAuthGuard)
    startStream(@Param('id') id: string, @Body() body: { facebookStreamUrl: string }, @Request() req: any) {
        return this.gamesService.startStream(id, body.facebookStreamUrl, buildRequestor(req?.user));
    }

    @Delete(':id/stream')
    @UseGuards(JwtAuthGuard)
    endStream(@Param('id') id: string, @Request() req: any) {
        return this.gamesService.endStream(id, buildRequestor(req?.user));
    }

    @Post(':id/manual-stats')
    @UseGuards(JwtAuthGuard)
    submitManualStats(@Param('id') id: string, @Body() dto: SubmitManualStatsDto, @Request() req: any) {
        return this.gamesService.submitManualStats(id, dto, buildRequestor(req?.user));
    }
}
