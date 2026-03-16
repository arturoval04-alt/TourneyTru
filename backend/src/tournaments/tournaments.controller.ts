import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';

@Controller('api/tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) { }

    @Post()
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
    update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto) {
        return this.tournamentsService.update(id, updateTournamentDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tournamentsService.remove(id);
    }

    @Get(':id/teams')
    getTeams(@Param('id') id: string) {
        return this.tournamentsService.getTeams(id);
    }

    @Post(':id/organizers')
    addOrganizer(@Param('id') id: string, @Body('email') email: string) {
        return this.tournamentsService.addOrganizer(id, email);
    }

    @Delete(':id/organizers/:organizerId')
    removeOrganizer(@Param('id') id: string, @Param('organizerId') organizerId: string) {
        return this.tournamentsService.removeOrganizer(id, organizerId);
    }

    @Post(':id/fields')
    addField(@Param('id') id: string, @Body('name') name: string, @Body('location') location?: string) {
        return this.tournamentsService.addField(id, name, location);
    }

    @Delete(':id/fields/:fieldId')
    removeField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
        return this.tournamentsService.removeField(id, fieldId);
    }
}
