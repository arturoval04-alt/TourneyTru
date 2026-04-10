import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSportsUnitDto,
  UpdateSportsUnitDto,
  UpdateScheduleConfigDto,
  ScheduleConfig,
  DEFAULT_SCHEDULE_CONFIG,
} from './dto/sports-unit.dto';
import { Requestor } from '../common/types';

@Injectable()
export class SportsUnitsService {
  constructor(private prisma: PrismaService) {}

  private async assertLeagueAccess(leagueId: string, requestor?: Requestor) {
    if (!requestor?.userId)
      throw new ForbiddenException('Se requiere autenticación.');
    if (requestor.role === 'admin') return;

    const league = (await this.prisma.league.findUnique({
      where: { id: leagueId },
    })) as any;
    if (!league) throw new NotFoundException('Liga no encontrada.');

    const isLeagueAdmin = league.adminId === requestor.userId;
    if (isLeagueAdmin) return;

    // presi u organizer asignado a un torneo de esta liga
    const organizer = await this.prisma.tournamentOrganizer.findFirst({
      where: {
        userId: requestor.userId,
        tournament: { leagueId },
      },
    });

    // El administrador del torneo también debe poder editar
    const tournamentAdmin = await this.prisma.tournament.findFirst({
      where: {
        adminId: requestor.userId,
        leagueId: leagueId,
      },
    });

    if (!organizer && !tournamentAdmin && requestor.role !== 'scorekeeper') {
      throw new ForbiddenException(
        'No tienes permiso para gestionar esta liga.',
      );
    }
  }

  async findAll(leagueId: string) {
    const units = await this.prisma.sportsUnit.findMany({
      where: { leagueId },
      include: {
        fields: {
          where: { isActive: true },
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return units.map((u) => ({
      ...u,
      scheduleConfig: this.parseScheduleConfig(u),
    }));
  }

  async findOne(id: string) {
    const unit = await this.prisma.sportsUnit.findUnique({
      where: { id },
      include: { fields: true },
    });
    if (!unit) throw new NotFoundException('Unidad deportiva no encontrada.');
    return { ...unit, scheduleConfig: this.parseScheduleConfig(unit) };
  }

  async create(dto: CreateSportsUnitDto, requestor?: Requestor) {
    await this.assertLeagueAccess(dto.leagueId, requestor);
    return this.prisma.sportsUnit.create({
      data: {
        leagueId: dto.leagueId,
        name: dto.name,
        location: dto.location,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateSportsUnitDto, requestor?: Requestor) {
    const unit = (await this.prisma.sportsUnit.findUnique({
      where: { id },
    })) as any;
    if (!unit) throw new NotFoundException('Unidad deportiva no encontrada.');
    await this.assertLeagueAccess(unit.leagueId, requestor);
    return this.prisma.sportsUnit.update({ where: { id }, data: dto });
  }

  parseScheduleConfig(unit: any): ScheduleConfig {
    let parsed: Partial<ScheduleConfig> = {};
    try {
      if (unit.scheduleConfig) {
        parsed = JSON.parse(unit.scheduleConfig);
      }
    } catch {
      /* fallback */
    }

    return {
      slots: Array.isArray(parsed.slots)
        ? parsed.slots
        : DEFAULT_SCHEDULE_CONFIG.slots,
      avgDurationMinutes:
        typeof parsed.avgDurationMinutes === 'number'
          ? parsed.avgDurationMinutes
          : DEFAULT_SCHEDULE_CONFIG.avgDurationMinutes,
      minGapMinutes:
        typeof parsed.minGapMinutes === 'number'
          ? parsed.minGapMinutes
          : DEFAULT_SCHEDULE_CONFIG.minGapMinutes,
      allowOverlap:
        typeof parsed.allowOverlap === 'boolean'
          ? parsed.allowOverlap
          : DEFAULT_SCHEDULE_CONFIG.allowOverlap,
    };
  }

  async getScheduleConfig(id: string): Promise<ScheduleConfig> {
    const unit = await this.prisma.sportsUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad deportiva no encontrada.');
    return this.parseScheduleConfig(unit);
  }

  async updateScheduleConfig(
    id: string,
    dto: UpdateScheduleConfigDto,
    requestor?: Requestor,
  ): Promise<ScheduleConfig> {
    const unit = (await this.prisma.sportsUnit.findUnique({
      where: { id },
    })) as any;
    if (!unit) throw new NotFoundException('Unidad deportiva no encontrada.');
    await this.assertLeagueAccess(unit.leagueId, requestor);

    const current = this.parseScheduleConfig(unit);
    const updated: ScheduleConfig = {
      slots: dto.slots ?? current.slots,
      avgDurationMinutes: dto.avgDurationMinutes ?? current.avgDurationMinutes,
      minGapMinutes: dto.minGapMinutes ?? current.minGapMinutes,
      allowOverlap: dto.allowOverlap ?? current.allowOverlap,
    };

    // Ordenar slots cronológicamente
    updated.slots = [...updated.slots].sort();

    await this.prisma.sportsUnit.update({
      where: { id },
      data: { scheduleConfig: JSON.stringify(updated) },
    });

    return updated;
  }

  async remove(id: string, requestor?: Requestor) {
    const unit = (await this.prisma.sportsUnit.findUnique({
      where: { id },
      include: { fields: { select: { id: true } } },
    })) as any;
    if (!unit) throw new NotFoundException('Unidad deportiva no encontrada.');
    await this.assertLeagueAccess(unit.leagueId, requestor);

    if (unit.fields.length > 0) {
      throw new ForbiddenException(
        'No se puede eliminar una unidad deportiva que tiene campos activos. Desactívalos primero.',
      );
    }

    return this.prisma.sportsUnit.delete({ where: { id } });
  }
}
