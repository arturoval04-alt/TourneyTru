import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { Requestor } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateDocumentDto, uploadedById: string) {
        const tournament = await this.prisma.tournament.findUnique({
            where: { id: dto.tournamentId },
        });
        if (!tournament) throw new NotFoundException('Torneo no encontrado.');

        return (this.prisma.tournamentDocument as any).create({
            data: {
                tournamentId: dto.tournamentId,
                uploadedById,
                name: dto.name,
                fileUrl: dto.fileUrl,
                fileType: dto.fileType,
                category: dto.category ?? 'general',
            },
        });
    }

    async findByTournament(tournamentId: string, requestor?: Requestor) {
        const tournament = await (this.prisma.tournament.findUnique as any)({
            where: { id: tournamentId },
            include: {
                league: { select: { id: true, adminId: true, isPrivate: true } },
                organizers: { select: { userId: true } },
            },
        });
        if (!tournament) throw new NotFoundException('Torneo no encontrado.');

        if (requestor?.role !== 'admin') {
            if (tournament.league?.isPrivate) {
                const isLeagueAdmin = requestor?.id === tournament.league.adminId;
                const isAssignedSK = requestor?.role === 'scorekeeper' && requestor.scorekeeperTournamentIds?.includes(tournamentId);
                if (!isLeagueAdmin && !isAssignedSK) {
                    throw new ForbiddenException({ code: 'PRIVATE', message: 'Esta liga es privada.' });
                }
            }
            if (tournament.isPrivate) {
                const isLeagueAdmin = requestor?.id === tournament.league?.adminId;
                const isOrganizer = tournament.organizers?.some((o: any) => o.userId === requestor?.id);
                const isAssignedSK = requestor?.role === 'scorekeeper' && requestor.scorekeeperTournamentIds?.includes(tournamentId);
                if (!isLeagueAdmin && !isOrganizer && !isAssignedSK) {
                    throw new ForbiddenException({ code: 'PRIVATE', message: 'Este torneo es privado.' });
                }
            }
        }

        return (this.prisma.tournamentDocument as any).findMany({
            where: { tournamentId },
            include: {
                uploadedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async remove(id: string, requestorId: string, requestorRole: string) {
        const doc = await (this.prisma.tournamentDocument as any).findUnique({
            where: { id },
        });
        if (!doc) throw new NotFoundException('Documento no encontrado.');

        // Solo puede eliminar quien lo subió o un admin
        if (requestorRole !== 'admin' && doc.uploadedById !== requestorId) {
            throw new ForbiddenException('No tienes permiso para eliminar este documento.');
        }

        return (this.prisma.tournamentDocument as any).delete({ where: { id } });
    }

    /**
     * Genera y retorna el CSV de plantilla de jugadores para importar.
     * Formato: Nombre,Apellido,Número,Posición
     */
    generatePlayerTemplateCsv(): Buffer {
        const headers = 'Nombre,Apellido,Número,Posición,Batea,Tira';
        const exampleRows = [
            'Juan,Pérez,5,SS,R,R',
            'María,López,12,OF,L,R',
            'Carlos,Ramírez,22,P,R,R',
        ].join('\n');

        // BOM para compatibilidad con Excel en Windows
        const csv = '\uFEFF' + headers + '\n' + exampleRows;
        return Buffer.from(csv, 'utf-8');
    }
}
