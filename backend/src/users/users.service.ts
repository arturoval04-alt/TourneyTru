import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaguesService } from '../leagues/leagues.service';
import * as bcrypt from 'bcrypt';

// Cuotas por defecto según planLabel
const PLAN_QUOTAS: Record<string, { maxLeagues: number; maxTournamentsPerLeague: number; maxTeamsPerTournament: number; maxPlayersPerTeam: number }> = {
    public:   { maxLeagues: 0, maxTournamentsPerLeague: 0, maxTeamsPerTournament: 0,  maxPlayersPerTeam: 25 },
    demo:     { maxLeagues: 1, maxTournamentsPerLeague: 1, maxTeamsPerTournament: 6,  maxPlayersPerTeam: 25 },
    standard: { maxLeagues: 1, maxTournamentsPerLeague: 3, maxTeamsPerTournament: 10, maxPlayersPerTeam: 30 },
    pro:      { maxLeagues: 1, maxTournamentsPerLeague: 10, maxTeamsPerTournament: 50, maxPlayersPerTeam: 50 },
    admin:    { maxLeagues: 999, maxTournamentsPerLeague: 999, maxTeamsPerTournament: 999, maxPlayersPerTeam: 999 },
};

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private leaguesService: LeaguesService,
    ) {}

    async findAll() {
        try {
            const users = await (this.prisma.user.findMany as any)({
                include: {
                    role: true,
                    _count: { select: { leaguesAdmin: true } },
                },
                orderBy: { createdAt: 'asc' },
            }) as any[];
            // Para cada organizador, contar torneos en sus ligas
            const tournamentCounts = await this.prisma.tournament.groupBy({
                by: ['adminId'],
                _count: { id: true },
            });
            const tournCountMap: Record<string, number> = {};
            tournamentCounts.forEach((t: any) => { if (t.adminId) tournCountMap[t.adminId] = t._count.id; });
            return users.map(u => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                role: u.role ? u.role.name : 'general',
                phone: u.phone,
                profilePicture: u.profilePicture,
                planLabel: u.planLabel,
                maxLeagues: u.maxLeagues,
                maxTournamentsPerLeague: u.maxTournamentsPerLeague,
                maxTeamsPerTournament: u.maxTeamsPerTournament,
                maxPlayersPerTeam: u.maxPlayersPerTeam,
                organizerRequestNote: u.organizerRequestNote,
                organizerRequestedAt: u.organizerRequestedAt,
                scorekeeperLeagueId: u.scorekeeperLeagueId,
                usedLeagues: u._count?.leaguesAdmin ?? 0,
                usedTournaments: tournCountMap[u.id] ?? 0,
            }));
        } catch (e) {
            console.error('Error fetching users', e);
            return [];
        }
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user) return null;
        const u2 = user as any;
        return {
            id: u2.id,
            firstName: u2.firstName,
            lastName: u2.lastName,
            email: u2.email,
            role: u2.role.name,
            phone: u2.phone,
            profilePicture: u2.profilePicture,
            planLabel: u2.planLabel,
            maxLeagues: u2.maxLeagues,
            maxTournamentsPerLeague: u2.maxTournamentsPerLeague,
            maxTeamsPerTournament: u2.maxTeamsPerTournament,
            maxPlayersPerTeam: u2.maxPlayersPerTeam,
        };
    }

    // Admin: cambiar rol, plan y cuotas de un usuario
    async updateAccess(targetUserId: string, dto: {
        role?: string;
        planLabel?: string;
        maxLeagues?: number;
        maxTournamentsPerLeague?: number;
        maxTeamsPerTournament?: number;
        maxPlayersPerTeam?: number;
        scorekeeperLeagueId?: string | null;
    }) {
        const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const data: any = {};

        // Si se cambia planLabel y no se enviaron cuotas manuales, aplicar defaults del plan
        if (dto.planLabel) {
            const planKey = dto.planLabel.toLowerCase();
            const quotas = PLAN_QUOTAS[planKey] ?? PLAN_QUOTAS['public'];
            data.planLabel = dto.planLabel;
            // Aplicar cuotas default del plan, a menos que vengan sobreescritas manualmente
            data.maxLeagues = dto.maxLeagues ?? quotas.maxLeagues;
            data.maxTournamentsPerLeague = dto.maxTournamentsPerLeague ?? quotas.maxTournamentsPerLeague;
            data.maxTeamsPerTournament = dto.maxTeamsPerTournament ?? quotas.maxTeamsPerTournament;
            data.maxPlayersPerTeam = dto.maxPlayersPerTeam ?? quotas.maxPlayersPerTeam;
        } else {
            // Solo cuotas manuales → planLabel = custom
            if (dto.maxLeagues !== undefined || dto.maxTournamentsPerLeague !== undefined ||
                dto.maxTeamsPerTournament !== undefined || dto.maxPlayersPerTeam !== undefined) {
                data.planLabel = 'custom';
                if (dto.maxLeagues !== undefined) data.maxLeagues = dto.maxLeagues;
                if (dto.maxTournamentsPerLeague !== undefined) data.maxTournamentsPerLeague = dto.maxTournamentsPerLeague;
                if (dto.maxTeamsPerTournament !== undefined) data.maxTeamsPerTournament = dto.maxTeamsPerTournament;
                if (dto.maxPlayersPerTeam !== undefined) data.maxPlayersPerTeam = dto.maxPlayersPerTeam;
            }
        }

        if (dto.scorekeeperLeagueId !== undefined) {
            data.scorekeeperLeagueId = dto.scorekeeperLeagueId;
        }

        // Cambiar rol si se especifica
        if (dto.role) {
            let role = await this.prisma.role.findUnique({ where: { name: dto.role } });
            if (!role) role = await this.prisma.role.create({ data: { name: dto.role } });
            data.roleId = role.id;
        }

        const updated = await this.prisma.user.update({ where: { id: targetUserId }, data, include: { role: true } }) as any;
        return {
            id: updated.id,
            email: updated.email,
            role: updated.role.name,
            planLabel: updated.planLabel,
            maxLeagues: updated.maxLeagues,
            maxTournamentsPerLeague: updated.maxTournamentsPerLeague,
            maxTeamsPerTournament: updated.maxTeamsPerTournament,
            maxPlayersPerTeam: updated.maxPlayersPerTeam,
        };
    }

    // Admin: crear cuenta de scorekeeper vinculada a una liga
    async createScorekeeper(dto: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        leagueId: string;
    }) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (existing) throw new ForbiddenException('Ya existe una cuenta con ese correo');

        const league = await this.prisma.league.findUnique({ where: { id: dto.leagueId } });
        if (!league) throw new NotFoundException('Liga no encontrada');

        let role = await this.prisma.role.findUnique({ where: { name: 'scorekeeper' } });
        if (!role) role = await this.prisma.role.create({ data: { name: 'scorekeeper' } });

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await (this.prisma.user.create as any)({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                roleId: role.id,
                scorekeeperLeagueId: dto.leagueId,
                forcePasswordChange: true,
                emailVerified: true,
            },
            include: { role: true },
        });

        const sc = user as any;
        return {
            id: sc.id,
            email: sc.email,
            firstName: sc.firstName,
            lastName: sc.lastName,
            role: sc.role.name,
            scorekeeperLeagueId: sc.scorekeeperLeagueId,
        };
    }

    // Solo para uso interno (ej. seed de admin)
    async createAdmin(dto: { email: string; password: string; firstName: string; lastName: string }) {
        try {
            let role = await this.prisma.role.findUnique({ where: { name: 'admin' } });
            if (!role) {
                role = await this.prisma.role.create({ data: { name: 'admin' } });
            }

            const passwordHash = await bcrypt.hash(dto.password, 12);

            const user = await (this.prisma.user.create as any)({
                data: {
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    roleId: role.id,
                    planLabel: 'admin',
                    maxLeagues: 999,
                    maxTournamentsPerLeague: 999,
                    maxTeamsPerTournament: 999,
                    maxPlayersPerTeam: 999,
                },
                include: { role: true },
            });

            const adm = user as any;
            return {
                id: adm.id,
                email: adm.email,
                role: adm.role.name,
            };
        } catch (e) {
            console.error('Error creating admin user', e);
            throw new InternalServerErrorException('Error creating admin user');
        }
    }

    async updateProfile(userId: string, dto: { phone?: string; profilePicture?: string }) {
        try {
            const data: any = {};
            if (dto.phone !== undefined) data.phone = dto.phone;
            if (dto.profilePicture !== undefined) data.profilePicture = dto.profilePicture;

            const updated = await this.prisma.user.update({
                where: { id: userId },
                data,
            });

            return {
                id: updated.id,
                email: updated.email,
                phone: updated.phone,
                profilePicture: updated.profilePicture,
            };
        } catch (e) {
            console.error('Error updating user profile', e);
            throw new InternalServerErrorException('Error al actualizar el perfil');
        }
    }

    // Organizer: obtener personal vinculado a sus ligas
    async findStaffByOrganizer(organizerId: string) {
        const leagues = await this.prisma.league.findMany({
            where: { adminId: organizerId },
            select: { id: true },
        });
        const leagueIds = leagues.map(l => l.id);
        if (leagueIds.length === 0) return [];

        const users = await (this.prisma.user as any).findMany({
            where: { 
                scorekeeperLeagueId: { in: leagueIds },
                role: { name: { in: ['scorekeeper', 'presi'] } } 
            },
            include: { role: true, tournamentOrganizers: { include: { tournament: { select: { name: true } } } } },
        });
        return users.map((u: any) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role?.name ?? 'scorekeeper',
            scorekeeperLeagueId: u.scorekeeperLeagueId,
            planLabel: u.planLabel ?? 'public',
            maxLeagues: u.maxLeagues ?? 0,
            maxTournamentsPerLeague: u.maxTournamentsPerLeague ?? 0,
            maxTeamsPerTournament: u.maxTeamsPerTournament ?? 0,
            maxPlayersPerTeam: u.maxPlayersPerTeam ?? 25,
            assignedTournaments: u.tournamentOrganizers?.map((t: any) => ({
                id: t.tournamentId,
                name: t.tournament.name,
            })) || [],
        }));
    }

    // Admin/Organizer: crear cuenta de Presi vinculada a una liga y torneos específicos
    async createPresident(dto: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        leagueId: string;
        tournamentIds: string[];
    }) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (existing) throw new ForbiddenException('Ya existe una cuenta con ese correo');

        const league = await this.prisma.league.findUnique({ where: { id: dto.leagueId } });
        if (!league) throw new NotFoundException('Liga no encontrada');

        let role = await this.prisma.role.findUnique({ where: { name: 'presi' } });
        if (!role) role = await this.prisma.role.create({ data: { name: 'presi' } });

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await (this.prisma.user.create as any)({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                roleId: role.id,
                scorekeeperLeagueId: dto.leagueId,
                forcePasswordChange: true,
                emailVerified: true,
            },
            include: { role: true },
        });

        // Loop over tournamentIds and add them to TournamentOrganizer
        if (dto.tournamentIds && dto.tournamentIds.length > 0) {
            for (const tourneyId of dto.tournamentIds) {
                await this.prisma.tournamentOrganizer.create({
                    data: {
                        userId: user.id,
                        tournamentId: tourneyId
                    }
                }).catch(() => {});
            }
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role.name,
            scorekeeperLeagueId: user.scorekeeperLeagueId,
        };
    }

    // Verificar cuota antes de crear un recurso
    async checkQuota(userId: string, resource: 'leagues' | 'tournaments' | 'teams' | 'players', leagueId?: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
        if (!user) throw new NotFoundException('Usuario no encontrado');

        if (resource === 'leagues') {
            const count = await this.prisma.league.count({ where: { adminId: userId } });
            if (count >= user.maxLeagues) {
                throw new ForbiddenException({
                    code: 'QUOTA_EXCEEDED',
                    resource: 'leagues',
                    message: `Alcanzaste el límite de ligas de tu plan (${user.maxLeagues}).`,
                    limit: user.maxLeagues,
                    current: count,
                });
            }
        }

        if (resource === 'tournaments' && leagueId) {
            const count = await this.prisma.tournament.count({ where: { leagueId } });
            if (count >= user.maxTournamentsPerLeague) {
                throw new ForbiddenException({
                    code: 'QUOTA_EXCEEDED',
                    resource: 'tournaments',
                    message: `Alcanzaste el límite de torneos por liga de tu plan (${user.maxTournamentsPerLeague}).`,
                    limit: user.maxTournamentsPerLeague,
                    current: count,
                });
            }
        }
    }

    // Eliminar una cuenta de usuario (admin only) — cascade completo
    async deleteStaff(requesterId: string, staffId: string) {
        const requester = await this.prisma.user.findUnique({ where: { id: requesterId } }) as any;
        if (!requester) throw new NotFoundException('Solicitante no encontrado');

        const staff = await this.prisma.user.findUnique({ where: { id: staffId } }) as any;
        if (!staff) throw new NotFoundException('Usuario no encontrado');

        const allowedRoles = ['scorekeeper', 'presi'];
        if (!allowedRoles.includes(staff.roleId)) {
            throw new ForbiddenException('Solo puedes eliminar cuentas de scorekeeper o presidente');
        }

        // Organizer can delete staff from their own leagues
        if (requester.roleId === 'organizer') {
            const requesterLeagues = await this.prisma.league.findMany({
                where: { adminId: requesterId },
                select: { id: true },
            });
            const leagueIds = requesterLeagues.map((l: any) => l.id);
            if (!leagueIds.includes(staff.scorekeeperLeagueId)) {
                throw new ForbiddenException('Este usuario no pertenece a tu liga');
            }
        } else if (requester.roleId === 'presi') {
            // Presi can only delete scorekeepers from their same league
            if (staff.roleId !== 'scorekeeper') {
                throw new ForbiddenException('Un presidente solo puede eliminar cuentas de scorekeeper');
            }
            if (requester.scorekeeperLeagueId !== staff.scorekeeperLeagueId) {
                throw new ForbiddenException('Este scorekeeper no pertenece a tu liga');
            }
        } else {
            throw new ForbiddenException('No tienes permisos para eliminar personal');
        }

        await this.prisma.tournamentOrganizer.deleteMany({ where: { userId: staffId } });
        await this.prisma.user.delete({ where: { id: staffId } });
        return { message: 'Cuenta eliminada correctamente.' };
    }

    async deleteUser(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // Cascade delete todas las ligas que administra (y todo lo que contienen)
        const leagues = await this.prisma.league.findMany({
            where: { adminId: userId },
            select: { id: true },
        });
        for (const league of leagues) {
            await this.leaguesService.cascadeDeleteLeague(league.id);
        }

        // Desvincular autoría de noticias
        await this.prisma.tournamentNews.updateMany({
            where: { authorId: userId },
            data: { authorId: null },
        });

        // Desvincular como co-organizador de torneos ajenos
        await this.prisma.tournamentOrganizer.deleteMany({ where: { userId } });

        await this.prisma.user.delete({ where: { id: userId } });
        return { message: 'Cuenta eliminada correctamente.' };
    }
}
