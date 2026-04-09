import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { DelegatesService } from './delegates.service';
import { CreateDelegateDto } from './dto/delegate.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/delegates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DelegatesController {
    constructor(private readonly delegatesService: DelegatesService) {}

    /** Crear delegado — solo organizer, presi o admin */
    @Post()
    @Roles('admin', 'organizer', 'presi')
    create(@Body() dto: CreateDelegateDto, @Req() req: any) {
        return this.delegatesService.create(dto, req.user.id);
    }

    /** Listar delegados de un torneo */
    @Get('tournament/:tournamentId')
    @Roles('admin', 'organizer', 'presi')
    findByTournament(@Param('tournamentId') tournamentId: string) {
        return this.delegatesService.findByTournament(tournamentId);
    }

    /** Toggle activo/inactivo */
    @Patch(':id/toggle')
    @Roles('admin', 'organizer', 'presi')
    toggle(@Param('id') id: string, @Req() req: any) {
        return this.delegatesService.toggle(id, req.user.id);
    }

    /** Eliminar delegado (y su cuenta de usuario) */
    @Delete(':id')
    @Roles('admin', 'organizer', 'presi')
    remove(@Param('id') id: string) {
        return this.delegatesService.remove(id);
    }
}
