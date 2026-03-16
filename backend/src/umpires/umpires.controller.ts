import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UmpiresService } from './umpires.service';
import { CreateUmpireDto, UpdateUmpireDto } from './dto/umpire.dto';

@Controller('api/umpires')
export class UmpiresController {
    constructor(private readonly umpiresService: UmpiresService) { }

    @Post()
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
    update(@Param('id') id: string, @Body() updateUmpireDto: UpdateUmpireDto) {
        return this.umpiresService.update(id, updateUmpireDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.umpiresService.remove(id);
    }
}
