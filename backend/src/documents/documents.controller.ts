import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Res,
    UseGuards,
    Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('api/documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    /** Subir documento — solo organizer, presi o admin */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'organizer', 'presi')
    create(@Body() dto: CreateDocumentDto, @Req() req: any) {
        return this.documentsService.create(dto, req.user.id);
    }

    /** Listar documentos de un torneo — público */
    @Get('tournament/:tournamentId')
    @UseGuards(OptionalJwtAuthGuard)
    findByTournament(@Param('tournamentId') tournamentId: string) {
        return this.documentsService.findByTournament(tournamentId);
    }

    /** Descargar plantilla CSV de jugadores */
    @Get('template/players')
    downloadPlayerTemplate(@Res() res: Response) {
        const csv = this.documentsService.generatePlayerTemplateCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="plantilla_jugadores.csv"');
        res.end(csv);
    }

    /** Eliminar documento */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'organizer', 'presi')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.documentsService.remove(id, req.user.id, req.user.role);
    }
}
