import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UmpiresService } from './umpires.service';
import { CreateUmpireDto, UpdateUmpireDto } from './dto/umpire.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/umpires')
export class UmpiresController {
    constructor(private readonly umpiresService: UmpiresService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createUmpireDto: CreateUmpireDto) {
        return this.umpiresService.create(createUmpireDto);
    }

    @Get()
    findAll() {
        return this.umpiresService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.umpiresService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateUmpireDto: UpdateUmpireDto) {
        return this.umpiresService.update(id, updateUmpireDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.umpiresService.remove(id);
    }
}
