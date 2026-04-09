import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddRosterEntryDto } from './dto/roster.dto';

@Injectable()
export class RosterService {
    constructor(private prisma: PrismaService) {}

    async addToRoster(dto: AddRosterEntryDto) {
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

        // Verificar cuota de jugadores en el equipo (jugadores directos + roster entries activos)
        const tournament = await (this.prisma as any).tournament.findUnique({
            where: { id: dto.tournamentId },
            include: { league: true },
        });
        const adminId = tournament?.league?.adminId ?? tournament?.adminId;
        if (adminId) {
            const admin = await this.prisma.user.findUnique({ where: { id: adminId } }) as any;
            if (admin && admin.maxPlayersPerTeam > 0) {
                const rosterCount = await (this.prisma as any).rosterEntry.count({
                    where: { teamId: dto.teamId, tournamentId: dto.tournamentId, isActive: true },
                });
                if (rosterCount >= admin.maxPlayersPerTeam) {
                    throw new ForbiddenException({
                        code: 'QUOTA_EXCEEDED',
                        resource: 'players',
                        message: `El equipo ya alcanzó el límite de jugadores de tu plan (${admin.maxPlayersPerTeam}).`,
                        limit: admin.maxPlayersPerTeam,
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

    async removeFromRoster(id: string) {
        const entry = await (this.prisma as any).rosterEntry.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Entrada de roster no encontrada');
        return (this.prisma as any).rosterEntry.update({
            where: { id },
            data: { isActive: false, leftAt: new Date() },
        });
    }

    async hardDeleteFromRoster(id: string) {
        const entry = await (this.prisma as any).rosterEntry.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Entrada de roster no encontrada');
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
