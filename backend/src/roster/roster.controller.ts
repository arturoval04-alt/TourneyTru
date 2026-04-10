import { Controller, Post, Delete, Get, Param, Body, Query, UseGuards, Request, Patch } from '@nestjs/common';
import { RosterService } from './roster.service';
import { AddRosterEntryDto, UpdateRosterEntryDto } from './dto/roster.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/roster')
export class RosterController {
    constructor(private readonly rosterService: RosterService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    addToRoster(@Body() dto: AddRosterEntryDto, @Request() req: any) {
        return this.rosterService.addToRoster(dto, { id: req.user.id, role: req.user.role });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    removeFromRoster(@Param('id') id: string, @Request() req: any) {
        return this.rosterService.removeFromRoster(id, { id: req.user.id, role: req.user.role });
    }

    @Delete('player/:playerId/team/:teamId')
    @UseGuards(JwtAuthGuard)
    removeFromRosterByContext(
        @Param('playerId') playerId: string, 
        @Param('teamId') teamId: string, 
        @Request() req: any
    ) {
        return this.rosterService.removeFromRosterByPlayerAndTeam(playerId, teamId, { id: req.user.id, role: req.user.role });
    }

    @Delete('hard/:id')
    @UseGuards(JwtAuthGuard)
    hardDeleteFromRoster(@Param('id') id: string, @Request() req: any) {
        return this.rosterService.hardDeleteFromRoster(id, { id: req.user.id, role: req.user.role });
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    updateRosterEntry(@Param('id') id: string, @Body() dto: UpdateRosterEntryDto, @Request() req: any) {
        return this.rosterService.updateRosterEntry(id, dto, { id: req.user.id, role: req.user.role });
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
