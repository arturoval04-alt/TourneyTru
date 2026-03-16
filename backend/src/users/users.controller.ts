import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll() {
        return this.usersService.findAll();
    }

    @Post()
    async create(@Body() createUserDto: any) {
        return this.usersService.create(createUserDto);
    }

    @Patch(':email')
    async updateProfile(@Param('email') email: string, @Body() updateDto: any) {
        return this.usersService.updateProfile(email, updateDto);
    }
}
