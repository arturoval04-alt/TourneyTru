import { Controller, Get, Patch, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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

    // Cualquier usuario autenticado puede actualizar su propio perfil
    @Patch('profile')
    async updateProfile(
        @Request() req: any,
        @Body() updateDto: { phone?: string; profilePicture?: string },
    ) {
        return this.usersService.updateProfile(req.user.id, updateDto);
    }
}
