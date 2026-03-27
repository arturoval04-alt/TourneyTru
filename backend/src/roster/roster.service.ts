import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddRosterEntryDto } from './dto/roster.dto';

@Injectable()
export class RosterService {
    constructor(private prisma: PrismaService) {}

    async addToRoster(dto: AddRosterEntryDto) {
        const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } }) as any;
        if (!player) throw new NotFoundException('Jugador no encontrado');
        if (!player.isVerified) {
            throw new ForbiddenException('Solo jugadores verificados pueden participar en múltiples equipos');
        }

        // Verificar que el equipo y torneo existen
        const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
        if (!team) throw new NotFoundException('Equipo no encontrado');

        // Verificar si ya existe la entrada (activa o inactiva)
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
            return (this.prisma as any).rosterEntry.update({
                where: { id: existing.id },
                data: { isActive: true, leftAt: null, number: dto.number, position: dto.position },
                include: { player: { select: { id: true, firstName: true, lastName: true, photoUrl: true, isVerified: true } }, team: { select: { id: true, name: true } } },
            });
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
                const directCount = await this.prisma.player.count({ where: { teamId: dto.teamId } });
                const rosterCount = await (this.prisma as any).rosterEntry.count({
                    where: { teamId: dto.teamId, tournamentId: dto.tournamentId, isActive: true },
                });
                if (directCount + rosterCount >= admin.maxPlayersPerTeam) {
                    throw new ForbiddenException({
                        code: 'QUOTA_EXCEEDED',
                        resource: 'players',
                        message: `El equipo ya alcanzó el límite de jugadores de tu plan (${admin.maxPlayersPerTeam}).`,
                        limit: admin.maxPlayersPerTeam,
                        current: directCount + rosterCount,
                    });
                }
            }
        }

        return (this.prisma as any).rosterEntry.create({
            data: {
                playerId: dto.playerId,
                teamId: dto.teamId,
                tournamentId: dto.tournamentId,
                number: dto.number ?? player.number,
                position: dto.position ?? player.position,
            },
            include: {
                player: { select: { id: true, firstName: true, lastName: true, photoUrl: true, position: true, number: true, isVerified: true } },
                team: { select: { id: true, name: true } },
                tournament: { select: { id: true, name: true, season: true } },
            },
        });
    }

    async removeFromRoster(id: string) {
        const entry = await (this.prisma as any).rosterEntry.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Entrada de roster no encontrada');
        return (this.prisma as any).rosterEntry.update({
            where: { id },
            data: { isActive: false, leftAt: new Date() },
        });
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
