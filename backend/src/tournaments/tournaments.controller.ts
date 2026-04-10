import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';
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

@Controller('api/torneos')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createTournamentDto: CreateTournamentDto) {
        return this.tournamentsService.create(createTournamentDto);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(
        @Query('adminId') adminId?: string,
        @Query('leagueId') leagueId?: string,
        @Req() req?: any,
    ) {
        return this.tournamentsService.findAll(adminId, leagueId, buildRequestor(req?.user));
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id') id: string, @Req() req?: any) {
        return this.tournamentsService.findOne(id, buildRequestor(req?.user));
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto, @Req() req: any) {
        return this.tournamentsService.update(id, updateTournamentDto, buildRequestor(req?.user));
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        return this.tournamentsService.remove(id, buildRequestor(req?.user));
    }

    @Get(':id/teams')
    @UseGuards(OptionalJwtAuthGuard)
    getTeams(@Param('id') id: string, @Req() req?: any) {
        return this.tournamentsService.getTeams(id, buildRequestor(req?.user));
    }

    @Post(':id/organizers')
    @UseGuards(JwtAuthGuard)
    addOrganizer(@Param('id') id: string, @Body('email') email: string, @Req() req: any) {
        return this.tournamentsService.addOrganizer(id, email, buildRequestor(req?.user));
    }

    @Delete(':id/organizers/:organizerId')
    @UseGuards(JwtAuthGuard)
    removeOrganizer(@Param('id') id: string, @Param('organizerId') organizerId: string, @Req() req: any) {
        return this.tournamentsService.removeOrganizer(id, organizerId, buildRequestor(req?.user));
    }

    @Post(':id/fields')
    @UseGuards(JwtAuthGuard)
    addField(
        @Param('id') id: string,
        @Body('name') name: string,
        @Body('location') location: string | undefined,
        @Body('mapsUrl') mapsUrl: string | undefined,
        @Req() req: any,
    ) {
        return this.tournamentsService.addField(id, name, location, mapsUrl, buildRequestor(req?.user));
    }

    @Delete(':id/fields/:fieldId')
    @UseGuards(JwtAuthGuard)
    removeField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Req() req: any) {
        return this.tournamentsService.removeField(id, fieldId, buildRequestor(req?.user));
    }

    @Post(':id/news')
    @UseGuards(JwtAuthGuard)
    createNews(@Param('id') id: string, @Body() body: {
        title: string;
        description?: string;
        coverUrl?: string;
        facebookUrl?: string;
        type?: string;
        hasVideo?: boolean;
        authorId?: string;
    }, @Req() req: any) {
        return this.tournamentsService.createNews(id, {
            ...body,
            authorId: body.authorId ?? req.user.id,
        }, buildRequestor(req?.user));
    }

    @Patch(':id/finalize')
    @UseGuards(JwtAuthGuard)
    finalize(@Param('id') id: string, @Req() req: any) {
        return this.tournamentsService.finalize(id, buildRequestor(req?.user));
    }

    @Get(':id/standings')
    @UseGuards(OptionalJwtAuthGuard)
    getStandings(@Param('id') id: string, @Req() req?: any) {
        return this.tournamentsService.getStandings(id, buildRequestor(req?.user));
    }
}
