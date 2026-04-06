import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('api')
export class StatsController {
    constructor(private readonly statsService: StatsService) {}

    @Get('torneos/:id/stats/batting')
    getBattingLeaderboard(@Param('id') id: string) {
        return this.statsService.getBattingLeaderboard(id);
    }

    @Get('torneos/:id/stats/pitching')
    getPitchingLeaderboard(@Param('id') id: string) {
        return this.statsService.getPitchingLeaderboard(id);
    }

    @Get('players/:id/stats')
    getPlayerStats(
        @Param('id') id: string,
        @Query('tournamentId') tournamentId?: string,
    ) {
        return this.statsService.getPlayerStats(id, tournamentId);
    }

    @Get('torneos/:id/standings')
    getStandings(@Param('id') id: string) {
        return this.statsService.getStandings(id);
    }

    @Post('torneos/:id/standings/recalculate')
    recalculateStandings(@Param('id') id: string) {
        return this.statsService.recalculateStandings(id);
    }
}
