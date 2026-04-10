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

type ActiveDelegateAssignment = {
    id: string;
    teamId: string;
    tournamentId: string;
};

@Injectable()
export class DelegatesService {
    constructor(private prisma: PrismaService) {}

    private async getOrCreateDelegateRole() {
        let role = await this.prisma.role.findUnique({ where: { name: 'delegado' } });
        if (!role) {
            role = await this.prisma.role.create({ data: { name: 'delegado' } });
        }
        return role;
    }

    private async assertDelegateSlotAvailable(teamId: string, tournamentId: string) {
        const existing = await (this.prisma.teamDelegate as any).findFirst({
            where: { teamId, tournamentId },
        });
        if (existing) {
            throw new ConflictException('Este equipo ya tiene un delegado asignado en este torneo.');
        }
    }

    private async assertTournamentIsUpcoming(tournamentId: string) {
        const tournament = await (this.prisma.tournament.findUnique as any)({
            where: { id: tournamentId },
        });
        if (!tournament) throw new NotFoundException('Torneo no encontrado.');
        if (tournament.status !== 'upcoming') {
            throw new ForbiddenException('Solo se pueden crear delegados en torneos con estado "Próximo".');
        }
        return tournament;
    }

    private async assertTeamBelongsToTournament(teamId: string, tournamentId: string) {
        const team = await this.prisma.team.findFirst({
            where: { id: teamId, tournamentId },
        });
        if (!team) {
            throw new NotFoundException('Equipo no encontrado en ese torneo.');
        }
        return team;
    }

    async create(dto: CreateDelegateDto, createdById: string) {
        await this.assertTeamBelongsToTournament(dto.teamId, dto.tournamentId);
        await this.assertTournamentIsUpcoming(dto.tournamentId);
        await this.assertDelegateSlotAvailable(dto.teamId, dto.tournamentId);

        const delegateRole = await this.getOrCreateDelegateRole();
        const normalizedEmail = dto.email.trim().toLowerCase();

        return this.prisma.$transaction(async (tx: any) => {
            let user: any;

            if (dto.linkExistingAccount) {
                user = await tx.user.findUnique({
                    where: { email: normalizedEmail },
                    include: {
                        role: true,
                        teamDelegates: {
                            select: { id: true, teamId: true, tournamentId: true },
                        },
                    },
                });

                if (!user) {
                    throw new NotFoundException('No existe una cuenta registrada con ese correo.');
                }

                if (!user.emailVerified) {
                    throw new BadRequestException('La cuenta debe tener el correo verificado antes de poder vincularse.');
                }

                const currentRole = user.role?.name;
                if (!['general', 'delegado'].includes(currentRole)) {
                    throw new ConflictException('Solo se pueden vincular cuentas públicas o cuentas de delegado.');
                }

                const sameTournamentAssignment = user.teamDelegates?.find(
                    (assignment: { tournamentId: string; teamId: string }) =>
                        assignment.tournamentId === dto.tournamentId && assignment.teamId !== dto.teamId,
                );

                if (sameTournamentAssignment) {
                    throw new ConflictException('Esta cuenta ya está vinculada como delegado de otro equipo dentro de este mismo torneo.');
                }

                const exactAssignment = user.teamDelegates?.find(
                    (assignment: { tournamentId: string; teamId: string }) =>
                        assignment.tournamentId === dto.tournamentId && assignment.teamId === dto.teamId,
                );

                if (exactAssignment) {
                    throw new ConflictException('Esta cuenta ya está vinculada a este equipo en este torneo.');
                }

                if (currentRole !== 'delegado') {
                    user = await tx.user.update({
                        where: { id: user.id },
                        data: { roleId: delegateRole.id },
                        include: {
                            role: true,
                            teamDelegates: {
                                select: { id: true, teamId: true, tournamentId: true },
                            },
                        },
                    });
                }
            } else {
                const emailTaken = await tx.user.findUnique({ where: { email: normalizedEmail } });
                if (emailTaken) {
                    throw new ConflictException('El email ya está registrado. Usa "Vincular cuenta" si esa persona ya tiene acceso.');
                }

                const passwordHash = await bcrypt.hash(dto.password!, 12);

                user = await tx.user.create({
                    data: {
                        firstName: dto.firstName!,
                        lastName: dto.lastName!,
                        email: normalizedEmail,
                        phone: dto.phone ?? null,
                        passwordHash,
                        roleId: delegateRole.id,
                        emailVerified: true,
                        forcePasswordChange: false,
                        planLabel: 'public',
                        maxLeagues: 0,
                        maxTournamentsPerLeague: 0,
                        maxTeamsPerTournament: 0,
                        maxPlayersPerTeam: 0,
                    },
                });
            }

            return (tx.teamDelegate as any).create({
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

        const requestor = await this.prisma.user.findUnique({
            where: { id: requestorId },
            include: { role: true },
        });
        const isAdminOrOrga = requestor?.role?.name === 'admin' || requestor?.role?.name === 'organizer';

        if (!delegate.isActive && !isAdminOrOrga && delegate.tournament.status !== 'upcoming') {
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

        await (this.prisma.teamDelegate as any).delete({ where: { id } });
        return { deleted: true };
    }

    async deactivateAllForTournament(tournamentId: string): Promise<void> {
        await (this.prisma.teamDelegate as any).updateMany({
            where: { tournamentId, isActive: true },
            data: { isActive: false },
        });
    }

    async getActiveDelegatesForUser(userId: string): Promise<ActiveDelegateAssignment[]> {
        return (this.prisma.teamDelegate as any).findMany({
            where: {
                userId,
                isActive: true,
                tournament: { status: { in: ['upcoming', 'active'] } },
            },
            select: { id: true, teamId: true, tournamentId: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async getActiveDelegateForUser(userId: string): Promise<{
        teamId: string;
        tournamentId: string;
    } | null> {
        const [delegate] = await this.getActiveDelegatesForUser(userId);
        return delegate ?? null;
    }

    async hasActiveDelegateAccess(userId: string, teamId: string, tournamentId?: string): Promise<boolean> {
        const delegate = await (this.prisma.teamDelegate as any).findFirst({
            where: {
                userId,
                teamId,
                ...(tournamentId ? { tournamentId } : {}),
                isActive: true,
                tournament: { status: { in: ['upcoming', 'active'] } },
            },
            select: { id: true },
        });
        return !!delegate;
    }
}
