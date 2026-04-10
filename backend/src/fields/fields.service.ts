import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto, UpdateFieldDto, CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/field.dto';
import { Requestor } from '../common/types';

@Injectable()
export class FieldsService {
    constructor(private prisma: PrismaService) {}

    private async assertLeagueAccess(leagueId: string, requestor?: Requestor) {
        if (!requestor?.userId) throw new ForbiddenException('Se requiere autenticación.');
        if (requestor.role === 'admin') return;

        const league = await this.prisma.league.findUnique({ where: { id: leagueId } }) as any;
        if (!league) throw new NotFoundException('Liga no encontrada.');

        if (league.adminId === requestor.userId) return;

        const organizer = await this.prisma.tournamentOrganizer.findFirst({
            where: { userId: requestor.userId, tournament: { leagueId } },
        });
        if (!organizer) {
            throw new ForbiddenException('No tienes permiso para gestionar campos de esta liga.');
        }
    }

    // ─── Fields ─────────────────────────────────────────────────────────

    async findAllByLeague(leagueId: string, sportsUnitId?: string) {
        return this.prisma.field.findMany({
            where: {
                leagueId,
                ...(sportsUnitId ? { sportsUnitId } : {}),
                isActive: true,
            },
            include: {
                sportsUnit: { select: { id: true, name: true } },
            },
            orderBy: [{ sportsUnitId: 'asc' }, { name: 'asc' }],
        });
    }

    async findOne(id: string) {
        const field = await this.prisma.field.findUnique({
            where: { id },
            include: {
                sportsUnit: true,
                league: { select: { id: true, name: true } },
            },
        });
        if (!field) throw new NotFoundException('Campo no encontrado.');
        return field;
    }

    async create(dto: CreateFieldDto, requestor?: Requestor) {
        await this.assertLeagueAccess(dto.leagueId, requestor);
        return this.prisma.field.create({
            data: {
                name: dto.name,
                location: dto.location,
                leagueId: dto.leagueId,
                sportsUnitId: dto.sportsUnitId ?? null,
                isActive: dto.isActive ?? true,
            },
        });
    }

    async update(id: string, dto: UpdateFieldDto, requestor?: Requestor) {
        const field = await this.prisma.field.findUnique({ where: { id } }) as any;
        if (!field) throw new NotFoundException('Campo no encontrado.');
        await this.assertLeagueAccess(field.leagueId, requestor);
        return this.prisma.field.update({ where: { id }, data: dto });
    }

    async remove(id: string, requestor?: Requestor) {
        const field = await this.prisma.field.findUnique({ where: { id } }) as any;
        if (!field) throw new NotFoundException('Campo no encontrado.');
        await this.assertLeagueAccess(field.leagueId, requestor);
        // Soft delete — no borramos para preservar historial de juegos
        return this.prisma.field.update({ where: { id }, data: { isActive: false } });
    }

    // ─── Availability ────────────────────────────────────────────────────

    async getAvailability(fieldId: string, date?: string) {
        const field = await this.prisma.field.findUnique({ where: { id: fieldId } });
        if (!field) throw new NotFoundException('Campo no encontrado.');

        return this.prisma.fieldAvailability.findMany({
            where: {
                fieldId,
                ...(date ? { date: new Date(date) } : {}),
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }

    async createAvailability(fieldId: string, dto: CreateAvailabilityDto, requestor?: Requestor) {
        const field = await this.prisma.field.findUnique({ where: { id: fieldId } }) as any;
        if (!field) throw new NotFoundException('Campo no encontrado.');
        await this.assertLeagueAccess(field.leagueId, requestor);

        const date = new Date(dto.date);
        const startTime = this.parseTime(dto.date, dto.startTime);
        const endTime = this.parseTime(dto.date, dto.endTime);

        // Detectar conflicto de horario en el mismo campo/fecha
        const conflict = await this.prisma.fieldAvailability.findFirst({
            where: {
                fieldId,
                date,
                startTime: { lt: endTime },
                endTime: { gt: startTime },
            },
        });
        if (conflict) {
            throw new ConflictException('Ya existe un bloque en ese horario para este campo.');
        }

        return this.prisma.fieldAvailability.create({
            data: {
                fieldId,
                date,
                startTime,
                endTime,
                type: dto.type ?? 'available',
                notes: dto.notes,
            },
        });
    }

    async updateAvailability(id: string, dto: UpdateAvailabilityDto, requestor?: Requestor) {
        const block = await this.prisma.fieldAvailability.findUnique({
            where: { id },
            include: { field: true },
        }) as any;
        if (!block) throw new NotFoundException('Bloque de disponibilidad no encontrado.');
        await this.assertLeagueAccess(block.field.leagueId, requestor);

        const data: any = { ...dto };
        if (dto.date) data.date = new Date(dto.date);
        if (dto.startTime) data.startTime = this.parseTime(dto.date ?? block.date.toISOString().slice(0, 10), dto.startTime);
        if (dto.endTime) data.endTime = this.parseTime(dto.date ?? block.date.toISOString().slice(0, 10), dto.endTime);

        return this.prisma.fieldAvailability.update({ where: { id }, data });
    }

    async deleteAvailability(id: string, requestor?: Requestor) {
        const block = await this.prisma.fieldAvailability.findUnique({
            where: { id },
            include: { field: true },
        }) as any;
        if (!block) throw new NotFoundException('Bloque de disponibilidad no encontrado.');
        await this.assertLeagueAccess(block.field.leagueId, requestor);
        return this.prisma.fieldAvailability.delete({ where: { id } });
    }

    /**
     * Verifica si hay juegos programados en un campo en un horario dado (nivel liga).
     * Útil para validación de conflictos al asignar campo a un juego.
     */
    async checkGameConflict(fieldId: string, scheduledDate: Date, startTime?: Date, endTime?: Date): Promise<boolean> {
        const where: any = { fieldId, scheduledDate };
        if (startTime && endTime) {
            where.startTime = { lt: endTime };
            where.endTime = { gt: startTime };
        }
        const count = await this.prisma.game.count({ where });
        return count > 0;
    }

    private parseTime(date: string, time: string): Date {
        return new Date(`${date}T${time}:00`);
    }
}
