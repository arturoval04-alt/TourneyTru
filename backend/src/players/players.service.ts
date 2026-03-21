import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayersService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreatePlayerDto) {
        return this.prisma.player.create({ data });
    }

    async findAll(filters?: { teamId?: string }) {
        const where: any = {};
        if (filters?.teamId) where.teamId = filters.teamId;
        return this.prisma.player.findMany({ where, include: { team: true }, orderBy: { lastName: 'asc' } });
    }

    async findOne(id: string) {
        const player = await this.prisma.player.findUnique({
            where: { id },
            include: { team: true },
        });

        if (!player) {
            throw new NotFoundException(`Player with id ${id} not found`);
        }

        return player;
    }

    async update(id: string, updateData: UpdatePlayerDto) {
        await this.findOne(id);
        return this.prisma.player.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.player.delete({
            where: { id },
        });
    }
}
