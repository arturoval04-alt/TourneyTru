import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeagueDto, UpdateLeagueDto } from './dto/league.dto';

@Injectable()
export class LeaguesService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateLeagueDto) {
        return this.prisma.league.create({ data });
    }

    async findAll() {
        return this.prisma.league.findMany({ include: { admin: true } });
    }

    async findOne(id: string) {
        const league = await this.prisma.league.findUnique({
            where: { id },
            include: {
                admin: true,
                tournaments: true,
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
