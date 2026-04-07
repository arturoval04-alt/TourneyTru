import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('api')
export class StatsController {
    constructor(private readonly statsService: StatsService) {}

    @Get('torneos/:id/stats/batting')
    async getBattingLeaderboard(@Param('id') id: string) {
        const [rows, config] = await Promise.all([
            this.statsService.getBattingLeaderboard(id),
            this.statsService.getStatsConfig(id),
        ]);
        return { rows, minAB: config.minAB, minIPOuts: config.minIPOuts };
    }

    @Get('torneos/:id/stats/pitching')
    async getPitchingLeaderboard(@Param('id') id: string) {
        const [rows, config] = await Promise.all([
            this.statsService.getPitchingLeaderboard(id),
            this.statsService.getStatsConfig(id),
        ]);
        return { rows, minAB: config.minAB, minIPOuts: config.minIPOuts };
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
