import { Controller, Post, Delete, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { RosterService } from './roster.service';
import { AddRosterEntryDto } from './dto/roster.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/roster')
export class RosterController {
    constructor(private readonly rosterService: RosterService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    addToRoster(@Body() dto: AddRosterEntryDto) {
        return this.rosterService.addToRoster(dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    removeFromRoster(@Param('id') id: string) {
        return this.rosterService.removeFromRoster(id);
    }

    @Delete('hard/:id')
    @UseGuards(JwtAuthGuard)
    hardDeleteFromRoster(@Param('id') id: string) {
        return this.rosterService.hardDeleteFromRoster(id);
    }

    @Get('player/:playerId/history')
    getPlayerHistory(@Param('playerId') playerId: string) {
        return this.rosterService.getPlayerHistory(playerId);
    }

    @Get('team/:teamId')
    getTeamRoster(
        @Param('teamId') teamId: string,
        @Query('tournamentId') tournamentId: string,
    ) {
        return this.rosterService.getTeamRoster(teamId, tournamentId);
    }
}
