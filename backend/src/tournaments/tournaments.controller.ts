import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/torneos')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createTournamentDto: CreateTournamentDto) {
        return this.tournamentsService.create(createTournamentDto);
    }

    @Get()
    findAll() {
        return this.tournamentsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tournamentsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto) {
        return this.tournamentsService.update(id, updateTournamentDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.tournamentsService.remove(id);
    }

    @Get(':id/teams')
    getTeams(@Param('id') id: string) {
        return this.tournamentsService.getTeams(id);
    }

    @Post(':id/organizers')
    @UseGuards(JwtAuthGuard)
    addOrganizer(@Param('id') id: string, @Body('email') email: string) {
        return this.tournamentsService.addOrganizer(id, email);
    }

    @Delete(':id/organizers/:organizerId')
    @UseGuards(JwtAuthGuard)
    removeOrganizer(@Param('id') id: string, @Param('organizerId') organizerId: string) {
        return this.tournamentsService.removeOrganizer(id, organizerId);
    }

    @Post(':id/fields')
    @UseGuards(JwtAuthGuard)
    addField(
        @Param('id') id: string,
        @Body('name') name: string,
        @Body('location') location?: string,
        @Body('mapsUrl') mapsUrl?: string,
    ) {
        return this.tournamentsService.addField(id, name, location, mapsUrl);
    }

    @Delete(':id/fields/:fieldId')
    @UseGuards(JwtAuthGuard)
    removeField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
        return this.tournamentsService.removeField(id, fieldId);
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
    }) {
        return this.tournamentsService.createNews(id, body);
    }

    @Patch(':id/finalize')
    @UseGuards(JwtAuthGuard)
    finalize(@Param('id') id: string) {
        return this.tournamentsService.finalize(id);
    }

    @Get(':id/standings')
    getStandings(@Param('id') id: string) {
        return this.tournamentsService.getStandings(id);
    }
}
