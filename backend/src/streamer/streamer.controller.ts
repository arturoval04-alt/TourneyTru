import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { StreamerService } from './streamer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/streamer')
@UseGuards(JwtAuthGuard)
export class StreamerController {
    constructor(private readonly streamerService: StreamerService) { }

    @Post('games')
    createGame(@Req() req: any, @Body() body: {
        homeTeamName: string;
        awayTeamName: string;
        homePlayers: { firstName: string; lastName: string; number?: number; position?: string; dhForPosition?: string }[];
        awayPlayers: { firstName: string; lastName: string; number?: number; position?: string; dhForPosition?: string }[];
        homeReserves?: { firstName: string; lastName: string; number?: number }[];
        awayReserves?: { firstName: string; lastName: string; number?: number }[];
        scheduledDate?: string;
        maxInnings?: number;
    }) {
        return this.streamerService.createQuickGame(req.user.id, body);
    }

    @Get('games')
    listGames(@Req() req: any) {
        return this.streamerService.listGames(req.user.id);
    }

    @Get('games/:id/boxscore')
    getBoxScore(@Req() req: any, @Param('id') id: string) {
        return this.streamerService.getBoxScore(id, req.user.id);
    }

    @Post('games/:id/auto-lineup')
    autoLineup(@Req() req: any, @Param('id') id: string) {
        return this.streamerService.autoLineup(id, req.user.id);
    }

    @Post('games/:id/team/:teamId/players')
    addPlayerInGame(
        @Req() req: any,
        @Param('id') id: string,
        @Param('teamId') teamId: string,
        @Body() body: { firstName: string; lastName: string; number?: number },
    ) {
        return this.streamerService.addPlayerInGame(id, teamId, req.user.id, body);
    }

    @Delete('games/:id')
    deleteGame(@Req() req: any, @Param('id') id: string) {
        return this.streamerService.deleteGame(id, req.user.id);
    }
}
