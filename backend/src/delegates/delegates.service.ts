import {
    Injectable,
    ConflictException,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDelegateDto } from './dto/delegate.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DelegatesService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateDelegateDto, createdById: string) {
        // Verificar que el equipo pertenece al torneo
        const team = await this.prisma.team.findFirst({
            where: { id: dto.teamId, tournamentId: dto.tournamentId },
        });
        if (!team) throw new NotFoundException('Equipo no encontrado en ese torneo.');

        // Verificar que el torneo está en estado "upcoming"
        const tournament = await (this.prisma.tournament.findUnique as any)({
            where: { id: dto.tournamentId },
        });
        if (!tournament) throw new NotFoundException('Torneo no encontrado.');
        if (tournament.status !== 'upcoming') {
            throw new ForbiddenException('Solo se pueden crear delegados en torneos con estado "Próximo".');
        }

        // Verificar que no existe ya un delegado para este equipo+torneo
        const existing = await (this.prisma.teamDelegate as any).findFirst({
            where: { teamId: dto.teamId, tournamentId: dto.tournamentId },
        });
        if (existing) throw new ConflictException('Este equipo ya tiene un delegado asignado en este torneo.');

        // Verificar email único
        const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (emailTaken) throw new ConflictException('El email ya está registrado.');

        // Obtener o crear rol "delegado"
        let role = await this.prisma.role.findUnique({ where: { name: 'delegado' } });
        if (!role) role = await this.prisma.role.create({ data: { name: 'delegado' } });

        const passwordHash = await bcrypt.hash(dto.password, 12);

        return this.prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    phone: dto.phone ?? null,
                    passwordHash,
                    roleId: role!.id,
                    emailVerified: true,   // sin flujo de verificación de correo
                    forcePasswordChange: false,
                    planLabel: 'public',
                    maxLeagues: 0,
                    maxTournamentsPerLeague: 0,
                    maxTeamsPerTournament: 0,
                    maxPlayersPerTeam: 0,
                },
            });

            const delegate = await (tx.teamDelegate as any).create({
                data: {
                    userId: user.id,
                    teamId: dto.teamId,
                    tournamentId: dto.tournamentId,
                    createdById,
                    isActive: true,
                },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                    team: { select: { id: true, name: true } },
                    tournament: { select: { id: true, name: true, status: true } },
                },
            });

            return delegate;
        });
    }

    async findByTournament(tournamentId: string) {
        return (this.prisma.teamDelegate as any).findMany({
            where: { tournamentId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                team: { select: { id: true, name: true, logoUrl: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async toggle(id: string, requestorId: string) {
        const delegate = await (this.prisma.teamDelegate as any).findUnique({
            where: { id },
            include: { tournament: { select: { status: true } } },
        });
        if (!delegate) throw new NotFoundException('Delegado no encontrado.');

        // No se puede reactivar si el torneo ya está activo o finalizado
        if (!delegate.isActive && delegate.tournament.status !== 'upcoming') {
            throw new BadRequestException(
                'No se puede reactivar un delegado mientras el torneo esté activo o finalizado.',
            );
        }

        return (this.prisma.teamDelegate as any).update({
            where: { id },
            data: { isActive: !delegate.isActive },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                team: { select: { id: true, name: true } },
            },
        });
    }

    async remove(id: string) {
        const delegate = await (this.prisma.teamDelegate as any).findUnique({
            where: { id },
        });
        if (!delegate) throw new NotFoundException('Delegado no encontrado.');

        // Eliminar el TeamDelegate y el User asociado en transacción
        return this.prisma.$transaction(async (tx: any) => {
            await (tx.teamDelegate as any).delete({ where: { id } });
            await tx.user.delete({ where: { id: delegate.userId } });
            return { deleted: true };
        });
    }

    /**
     * Hook llamado desde TournamentsService al cambiar status a 'active'.
     * Desactiva todos los delegados del torneo.
     */
    async deactivateAllForTournament(tournamentId: string): Promise<void> {
        await (this.prisma.teamDelegate as any).updateMany({
            where: { tournamentId, isActive: true },
            data: { isActive: false },
        });
    }

    /**
     * Verifica si el usuario es delegado activo del equipo y si el torneo está en "upcoming".
     * Usado por los guards de teams/ y players/.
     */
    async getActiveDelegateForUser(userId: string): Promise<{
        teamId: string;
        tournamentId: string;
    } | null> {
        const delegate = await (this.prisma.teamDelegate as any).findFirst({
            where: {
                userId,
                isActive: true,
                tournament: { status: 'upcoming' },
            },
            select: { teamId: true, tournamentId: true },
        });
        return delegate ?? null;
    }
}
