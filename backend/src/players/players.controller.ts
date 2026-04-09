import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto, UpdatePlayerDto, BulkCreatePlayersDto, ConfirmImportDto } from './dto/player.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('api/players')
export class PlayersController {
    constructor(private readonly playersService: PlayersService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createPlayerDto: CreatePlayerDto, @Request() req: any) {
        return this.playersService.create(createPlayerDto, req.user);
    }

    // Legacy bulk — se mantiene por compatibilidad
    @Post('bulk')
    @UseGuards(JwtAuthGuard)
    createBulk(@Body() dto: BulkCreatePlayersDto) {
        return this.playersService.createBulk(dto);
    }

    // Nueva importación con preview por fila
    @Post('import')
    @UseGuards(JwtAuthGuard)
    importPlayers(@Body() dto: BulkCreatePlayersDto, @Request() req: any) {
        return this.playersService.importPlayers(dto, req.user);
    }

    // Confirmar importación tras revisión del preview
    @Post('confirm-import')
    @UseGuards(JwtAuthGuard)
    confirmImport(@Body() dto: ConfirmImportDto, @Request() req: any) {
        return this.playersService.confirmImport(dto, req.user);
    }

    @Get('check-duplicate')
    checkDuplicate(
        @Query('fn') firstName: string,
        @Query('ln') lastName: string,
        @Query('sln') secondLastName: string,
        @Query('teamId') teamId: string,
        @Query('tourneyId') tournamentId: string,
    ) {
        if (!firstName || !lastName || !teamId || !tournamentId) return { level: 'none' };
        return this.playersService.detectDuplicate(firstName, lastName, secondLastName || undefined, teamId, tournamentId);
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

    @Get('directory')
    @UseGuards(OptionalJwtAuthGuard)
    getDirectory(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('q') search?: string,
        @Query('leagueId') leagueId?: string,
        @Query('tournamentId') tournamentId?: string,
        @Query('teamId') teamId?: string,
        @Request() req?: any
    ) {
        // Obtenemos el usuario si está logueado y usó JWT (se asume que si el jwt-auth no es guard global,
        // hay que inyectar opcionalmente o usar el token manual. Para este caso, req.user existirá si
        // pasaron token, pero @Get('directory') es público, así que puede no haber req.user).
        return this.playersService.getDirectory({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
            leagueId,
            tournamentId,
            teamId,
            requestingUser: req?.user
        });
    }

    @Get()
    findAll(@Query('teamId') teamId?: string) {
        return this.playersService.findAll({ teamId });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.playersService.findOne(id);
    }

    @Post('merge')
    @UseGuards(JwtAuthGuard)
    mergePlayers(@Body() body: { primaryId: string, duplicateId: string }, @Request() req: any) {
        return this.playersService.merge(body.primaryId, body.duplicateId, req.user);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerDto) {
        return this.playersService.update(id, updatePlayerDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.playersService.remove(id, req.user);
    }
}
