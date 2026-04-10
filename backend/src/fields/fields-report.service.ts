import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FieldsReportService {
    constructor(private prisma: PrismaService) {}

    /**
     * Reporte de ocupación por campo/unidad para un rango de fechas en una liga.
     * Devuelve: total juegos, % ocupación, desglose por campo y por unidad.
     */
    async getOccupancyReport(leagueId: string, from: string, to: string, round?: string) {
        const fromDate = new Date(from + 'T00:00:00');
        const toDate = new Date(to + 'T23:59:59');

        // Traer campos activos de la liga con su unidad
        const fields = await this.prisma.field.findMany({
            where: { leagueId, isActive: true },
            include: { sportsUnit: { select: { id: true, name: true, scheduleConfig: true } } },
        }) as any[];

        if (fields.length === 0) return { from, to, fields: [], units: [], totalGames: 0 };

        const fieldIds = fields.map((f: any) => f.id);

        // Juegos en ese rango por campo (excluyendo draft y cancelados)
        const games = await this.prisma.game.findMany({
            where: {
                fieldId: { in: fieldIds },
                ...(round ? { round } : { scheduledDate: { gte: fromDate, lte: toDate } }),
                status: { notIn: ['draft', 'cancelled'] },
            },
            select: {
                id: true,
                fieldId: true,
                scheduledDate: true,
                startTime: true,
                status: true,
                homeScore: true,
                awayScore: true,
                tournamentId: true,
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } },
                tournament: { select: { name: true } },
            },
            orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
        }) as any[];

        // Calcular días en el rango para % ocupación
        let effectiveFrom = fromDate;
        let effectiveTo = toDate;
        
        if (round && games.length > 0) {
            const times = games.map((g: any) => new Date(g.scheduledDate).getTime());
            effectiveFrom = new Date(Math.min(...times));
            effectiveFrom.setHours(0, 0, 0, 0);
            effectiveTo = new Date(Math.max(...times));
            effectiveTo.setHours(23, 59, 59, 999);
        }
        
        const days = Math.max(1, Math.ceil((effectiveTo.getTime() - effectiveFrom.getTime()) / (1000 * 60 * 60 * 24)));

        // Agrupar por campo
        const fieldReport = fields.map((field: any) => {
            const cfg = field.sportsUnit?.scheduleConfig ? JSON.parse(field.sportsUnit.scheduleConfig) : null;
            const slotsPerDay = cfg?.slots?.length ?? 2;
            const totalSlots = slotsPerDay * days;

            const fieldGames = games.filter((g: any) => g.fieldId === field.id);
            const occupancyPct = totalSlots > 0 ? Math.round((fieldGames.length / totalSlots) * 100) : 0;

            return {
                fieldId: field.id,
                fieldName: field.name,
                location: field.location,
                unitId: field.sportsUnit?.id ?? null,
                unitName: field.sportsUnit?.name ?? 'Sin Unidad',
                totalGames: fieldGames.length,
                totalSlots,
                occupancyPct,
                games: fieldGames,
            };
        });

        // Agrupar por unidad
        const unitMap = new Map<string, { unitId: string; unitName: string; fields: any[]; totalGames: number }>();
        for (const f of fieldReport) {
            const key = f.unitId ?? '__none__';
            if (!unitMap.has(key)) {
                unitMap.set(key, { unitId: f.unitId, unitName: f.unitName, fields: [], totalGames: 0 });
            }
            const entry = unitMap.get(key)!;
            entry.fields.push(f);
            entry.totalGames += f.totalGames;
        }

        return {
            from: round && games.length > 0 ? effectiveFrom.toISOString().slice(0, 10) : from,
            to: round && games.length > 0 ? effectiveTo.toISOString().slice(0, 10) : to,
            days,
            totalGames: games.length,
            fields: fieldReport,
            units: [...unitMap.values()].sort((a, b) => b.totalGames - a.totalGames),
        };
    }

    /**
     * Reporte de juegos de un campo específico por fecha.
     */
    async getFieldSchedule(fieldId: string, from: string, to?: string) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
            include: { sportsUnit: { select: { id: true, name: true } }, league: { select: { id: true, name: true } } },
        });
        if (!field) throw new NotFoundException('Campo no encontrado.');

        const fromDate = new Date(from + 'T00:00:00');
        const toDate = to ? new Date(to + 'T23:59:59') : new Date(from + 'T23:59:59');

        const games = await this.prisma.game.findMany({
            where: {
                fieldId,
                scheduledDate: { gte: fromDate, lte: toDate },
                status: { not: 'cancelled' },
            },
            select: {
                id: true,
                scheduledDate: true,
                startTime: true,
                endTime: true,
                status: true,
                homeScore: true,
                awayScore: true,
                round: true,
                homeTeam: { select: { id: true, name: true, shortName: true } },
                awayTeam: { select: { id: true, name: true, shortName: true } },
                tournament: { select: { id: true, name: true } },
            },
            orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
        });

        return { field, games };
    }
}
