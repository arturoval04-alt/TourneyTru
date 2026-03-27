import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // Solo admins pueden listar todos los usuarios
    @Get()
    @Roles('admin')
    async findAll() {
        return this.usersService.findAll();
    }

    // Organizer: obtener los scorekeepers vinculados a sus ligas
    @Get('my-scorekeepers')
    @Roles('organizer', 'admin')
    async myScorekeepers(@Request() req: any) {
        return this.usersService.findScorekeepersByOrganizer(req.user.id);
    }

    // Admin: cambiar rol y cuotas de un usuario
    @Patch(':id/access')
    @Roles('admin')
    async updateAccess(
        @Param('id') id: string,
        @Body() dto: {
            role?: string;
            planLabel?: string;
            maxLeagues?: number;
            maxTournamentsPerLeague?: number;
            maxTeamsPerTournament?: number;
            maxPlayersPerTeam?: number;
            scorekeeperLeagueId?: string | null;
        },
    ) {
        return this.usersService.updateAccess(id, dto);
    }

    // Organizador: crear un scorekeeper vinculado a su liga
    @Post('scorekeeper')
    @Roles('organizer', 'admin')
    async createScorekeeper(
        @Body() dto: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            leagueId: string;
        },
    ) {
        return this.usersService.createScorekeeper(dto);
    }

    // Cualquier usuario autenticado puede actualizar su propio perfil
    @Patch('profile')
    async updateProfile(
        @Request() req: any,
        @Body() updateDto: { phone?: string; profilePicture?: string },
    ) {
        return this.usersService.updateProfile(req.user.id, updateDto);
    }
}
