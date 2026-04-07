import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto, UpdatePlayerDto, BulkCreatePlayersDto } from './dto/player.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/players')
export class PlayersController {
    constructor(private readonly playersService: PlayersService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createPlayerDto: CreatePlayerDto) {
        return this.playersService.create(createPlayerDto);
    }

    @Post('bulk')
    @UseGuards(JwtAuthGuard)
    createBulk(@Body() dto: BulkCreatePlayersDto) {
        return this.playersService.createBulk(dto);
    }

    @Get('search')
    search(@Query('q') q?: string) {
        return this.playersService.search(q ?? '');
    }

    @Get('verified')
    searchVerified(
        @Query('q') q?: string,
        @Query('excludeTeamId') excludeTeamId?: string,
    ) {
        return this.playersService.searchVerified(q, excludeTeamId);
    }

    @Get()
    findAll(@Query('teamId') teamId?: string) {
        return this.playersService.findAll({ teamId });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.playersService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerDto) {
        return this.playersService.update(id, updatePlayerDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.playersService.remove(id);
    }
}
