import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddRosterEntryDto } from './dto/roster.dto';
import { DelegatesService } from '../delegates/delegates.service';
import { LeaguesService } from '../leagues/leagues.service';

type RequestingUser = { id: string; role: string };

@Injectable()
export class RosterService {
    constructor(
        private prisma: PrismaService,
        private delegatesService: DelegatesService,
        private leaguesService: LeaguesService,
    ) {}

    private async assertRosterAccess(teamId: string, requestingUser?: RequestingUser) {
        if (!requestingUser) throw new ForbiddenException('Se requiere autenticación.');
        if (requestingUser.role === 'admin') return;

        if (requestingUser.role === 'delegado') {
            const activeDelegate = await this.delegatesService.getActiveDelegateForUser(requestingUser.id);
            if (!activeDelegate || activeDelegate.teamId !== teamId) {
                throw new ForbiddenException('No tienes permisos para modificar el roster de este equipo.');
            }
            return;
        }

        if (requestingUser.role === 'scorekeeper' || requestingUser.role === 'streamer') {
            throw new ForbiddenException('No tienes permisos para modificar rosters.');
        }

        // organizer / presi: verificar que el equipo pertenece a un torneo de su liga
        const team = await (this.prisma as any).team.findUnique({
            where: { id: teamId },
            include: { tournament: { include: { league: { select: { adminId: true } }, organizers: { select: { userId: true } } } } },
        });
        if (!team) throw new NotFoundException('Equipo no encontrado.');
        const leagueAdminId = team.tournament?.league?.adminId;
        const isOrganizer = team.tournament?.organizers?.some((o: any) => o.userId === requestingUser.id);
        if (requestingUser.id !== leagueAdminId && !isOrganizer) {
            throw new ForbiddenException('No tienes permisos para modificar el roster de este equipo.');
        }
    }

    async addToRoster(dto: AddRosterEntryDto, requestingUser?: RequestingUser) {
        await this.assertRosterAccess(dto.teamId, requestingUser);
        const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } }) as any;
        if (!player) throw new NotFoundException('Jugador no encontrado');

        // Verificar que el equipo y torneo existen
        const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
        if (!team) throw new NotFoundException('Equipo no encontrado');

        // Verificar si el jugador ya está activo en OTRO equipo del mismo torneo
        const activeInOtherTeam = await (this.prisma as any).rosterEntry.findFirst({
            where: {
                playerId: dto.playerId,
                tournamentId: dto.tournamentId,
                teamId: { not: dto.teamId },
                isActive: true,
            },
            include: { team: { select: { name: true } } },
        });
        if (activeInOtherTeam) {
            throw new ConflictException(
                `El jugador ya está activo en "${activeInOtherTeam.team.name}" en este torneo. Debe ser dado de baja primero.`
            );
        }

        // Verificar si ya existe la entrada (activa o inactiva) en este mismo equipo
        const existing = await (this.prisma as any).rosterEntry.findUnique({
            where: {
                playerId_teamId_tournamentId: {
                    playerId: dto.playerId,
                    teamId: dto.teamId,
                    tournamentId: dto.tournamentId,
                },
            },
        });

        if (existing) {
            if (existing.isActive) {
                throw new ConflictException('El jugador ya está registrado en este equipo para este torneo');
            }
            // Reactivar si fue removido antes
            const reactivated = await (this.prisma as any).rosterEntry.update({
                where: { id: existing.id },
                data: { isActive: true, leftAt: null, number: dto.number, position: dto.position },
                include: { player: { select: { id: true, firstName: true, lastName: true, photoUrl: true, isVerified: true } }, team: { select: { id: true, name: true } } },
            });
            // Auto-verificar al jugador (ya aparece en 2+ equipos)
            if (!player.isVerified) {
                await this.prisma.player.update({ where: { id: dto.playerId }, data: { isVerified: true, verifiedAt: new Date(), verificationMethod: 'auto_roster' } });
            }
            return reactivated;
        }

        // Verificar cuota de jugadores en el equipo
        const tournament = await (this.prisma as any).tournament.findUnique({
            where: { id: dto.tournamentId },
            include: { league: { select: { id: true } } },
        });
        const leagueId = tournament?.leagueId;
        if (leagueId) {
            const plan = await this.leaguesService.getPlanForLeague(leagueId);
            if (plan && plan.maxPlayersPerTeam > 0) {
                const rosterCount = await (this.prisma as any).rosterEntry.count({
                    where: { teamId: dto.teamId, tournamentId: dto.tournamentId, isActive: true },
                });
                if (rosterCount >= plan.maxPlayersPerTeam) {
                    throw new ForbiddenException({
                        code: 'QUOTA_EXCEEDED',
                        resource: 'players',
                        message: `El equipo ya alcanzó el límite de jugadores de tu plan (${plan.maxPlayersPerTeam}).`,
                        limit: plan.maxPlayersPerTeam,
                        current: rosterCount,
                    });
                }
            }
        }

        const entry = await (this.prisma as any).rosterEntry.create({
            data: {
                playerId: dto.playerId,
                teamId: dto.teamId,
                tournamentId: dto.tournamentId,
                number: dto.number ?? null,
                position: dto.position ?? player.position,
            },
            include: {
                player: { select: { id: true, firstName: true, lastName: true, photoUrl: true, position: true, isVerified: true } },
                team: { select: { id: true, name: true } },
                tournament: { select: { id: true, name: true, season: true } },
            },
        });

        // Auto-verificar al jugador (ya aparece en 2+ equipos)
        if (!player.isVerified) {
            await this.prisma.player.update({ where: { id: dto.playerId }, data: { isVerified: true, verifiedAt: new Date(), verificationMethod: 'auto_roster' } });
        }

        return entry;
    }

    async removeFromRoster(id: string, requestingUser?: RequestingUser) {
        const entry = await (this.prisma as any).rosterEntry.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Entrada de roster no encontrada');
        await this.assertRosterAccess(entry.teamId, requestingUser);
        return (this.prisma as any).rosterEntry.update({
            where: { id },
            data: { isActive: false, leftAt: new Date() },
        });
    }

    async removeFromRosterByPlayerAndTeam(playerId: string, teamId: string, requestingUser?: RequestingUser) {
        const entry = await (this.prisma as any).rosterEntry.findFirst({
            where: { playerId, teamId, isActive: true },
        });
        if (!entry) throw new NotFoundException('Jugador no está activo en este equipo');
        await this.assertRosterAccess(entry.teamId, requestingUser);
        return (this.prisma as any).rosterEntry.update({
            where: { id: entry.id },
            data: { isActive: false, leftAt: new Date() },
        });
    }

    async hardDeleteFromRoster(id: string, requestingUser?: RequestingUser) {
        const entry = await (this.prisma as any).rosterEntry.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Entrada de roster no encontrada');
        await this.assertRosterAccess(entry.teamId, requestingUser);
        return (this.prisma as any).rosterEntry.delete({ where: { id } });
    }

    async getPlayerHistory(playerId: string) {
        return (this.prisma as any).rosterEntry.findMany({
            where: { playerId },
            include: {
                team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
                tournament: { select: { id: true, name: true, season: true, logoUrl: true } },
            },
            orderBy: { joinedAt: 'desc' },
        });
    }

    async getTeamRoster(teamId: string, tournamentId: string) {
        return (this.prisma as any).rosterEntry.findMany({
            where: { teamId, tournamentId, isActive: true },
            include: {
                player: {
                    select: {
                        id: true, firstName: true, lastName: true,
                        number: true, position: true, photoUrl: true,
                        bats: true, throws: true, isVerified: true,
                        team: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
    }
}
