import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';

@Injectable()
export class LeaguesService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateLeagueDto) {
        // Verificar cuota de ligas del usuario (skip para admin: maxLeagues >= 999)
        if (data.adminId) {
            const user = await this.prisma.user.findUnique({ where: { id: data.adminId } }) as any;
            if (user && user.maxLeagues < 999) {
                const count = await this.prisma.league.count({ where: { adminId: data.adminId } });
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
        }
        return this.prisma.league.create({ data });
    }

    async findAll(adminId?: string) {
        return this.prisma.league.findMany({
            where: adminId ? { adminId } : undefined,
            include: {
                admin: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { tournaments: true, umpires: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const league = await this.prisma.league.findUnique({
            where: { id },
            include: {
                admin: { select: { id: true, firstName: true, lastName: true, email: true } },
                tournaments: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: { select: { teams: true, games: true } },
                    },
                },
                umpires: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { tournaments: true, umpires: true } },
            },
        });

        if (!league) {
            throw new NotFoundException(`League with id ${id} not found`);
        }

        return league;
    }

    async update(id: string, updateData: UpdateLeagueDto) {
        await this.findOne(id); // Valida que existe
        return this.prisma.league.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Valida
        return this.prisma.league.delete({
            where: { id },
        });
    }
}
