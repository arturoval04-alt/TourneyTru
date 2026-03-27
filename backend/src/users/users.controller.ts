import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
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

    // Organizer y Presi: obtener el personal vinculado a sus ligas
    @Get('my-scorekeepers')
    @Roles('organizer', 'admin', 'presi')
    async myScorekeepers(@Request() req: any) {
        // Un presi también puede ver a los scorekeepers de su liga (u otros presis)
        return this.usersService.findStaffByOrganizer(req.user.id);
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

    // Organizador y Presi: crear un scorekeeper vinculado a su liga
    @Post('scorekeeper')
    @Roles('organizer', 'admin', 'presi')
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

    // Organizador: crear un Presi vinculado a su liga y torneos específicos
    @Post('president')
    @Roles('organizer', 'admin')
    async createPresident(
        @Body() dto: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            leagueId: string;
            tournamentIds: string[];
        },
    ) {
        return this.usersService.createPresident(dto);
    }

    // Cualquier usuario autenticado puede actualizar su propio perfil
    @Patch('profile')
    async updateProfile(
        @Request() req: any,
        @Body() updateDto: { phone?: string; profilePicture?: string },
    ) {
        return this.usersService.updateProfile(req.user.id, updateDto);
    }

    // Admin: eliminar una cuenta de usuario
    @Delete(':id')
    @Roles('admin')
    async deleteUser(@Param('id') id: string, @Request() req: any) {
        if (req.user.id === id) {
            throw new Error('No puedes eliminar tu propia cuenta.');
        }
        return this.usersService.deleteUser(id);
    }
}
