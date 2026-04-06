import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';

type Requestor = { userId?: string; role?: string };

@Injectable()
export class LeaguesService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateLeagueDto) {
        const { isPrivate, ...rest } = data as any;
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
        
        const league = await this.prisma.league.create({ data: rest as any });

        // isPrivate not in Prisma client type (not exported correctly) — update via raw SQL
        if (isPrivate !== undefined) {
            await this.prisma.$executeRaw`UPDATE leagues SET is_private = ${isPrivate ? 1 : 0} WHERE id = ${league.id}`;
        }
        
        return { ...league, isPrivate };
    }

    async findAll(adminId?: string, requestor?: Requestor) {
        const isSystemAdmin = requestor?.role === 'admin';
        const where: any = {};

        if (adminId) {
            where.adminId = adminId;
        } else if (!isSystemAdmin) {
            where.isPrivate = false;
        }

        const results = await this.prisma.league.findMany({
            where: Object.keys(where).length > 0 ? where : undefined,
            include: {
                admin: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { tournaments: true, umpires: true } },
            },
            orderBy: { name: 'asc' },
        }) as any[];

        // If scoped to a user's own leagues or system admin — no privacy filter
        if (adminId || isSystemAdmin) return results;

        // Public listing: filter private leagues in-memory (Prisma client not regenerated)
        return results.filter((l: any) => {
            if (!(l.isPrivate ?? false)) return true;
            return requestor?.userId === l.adminId;
        });
    }

    async findOne(id: string, requestor?: Requestor) {
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
        }) as any;

        if (!league) {
            throw new NotFoundException(`League with id ${id} not found`);
        }

        // Privacy check
        if (league.isPrivate) {
            const isSystemAdmin = requestor?.role === 'admin';
            const isOwner = requestor?.userId === league.adminId;
            if (!isSystemAdmin && !isOwner) {
                throw new ForbiddenException({
                    code: 'PRIVATE',
                    message: 'Esta liga es privada.',
                });
            }
        }

        return league;
    }

    async update(id: string, updateData: UpdateLeagueDto, requestor?: Requestor) {
        await this.findOne(id, requestor);
        const { isPrivate, ...rest } = updateData as any;

        const result = await this.prisma.league.update({
            where: { id },
            data: rest as any,
        });

        // isPrivate not in Prisma client type (not regenerated) — update via raw SQL
        if (isPrivate !== undefined) {
            await this.prisma.$executeRaw`UPDATE leagues SET is_private = ${isPrivate ? 1 : 0} WHERE id = ${id}`;
        }

        return result;
    }

    async remove(id: string, requestor?: Requestor) {
        await this.findOne(id, requestor);
        return this.prisma.league.delete({
            where: { id },
        });
    }
}
