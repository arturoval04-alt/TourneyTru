import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUmpireDto, UpdateUmpireDto } from './dto/umpire.dto';

@Injectable()
export class UmpiresService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateUmpireDto) {
        return this.prisma.umpire.create({ data });
    }

    async findAll() {
        return this.prisma.umpire.findMany({ include: { league: true } });
    }

    async findOne(id: string) {
        const umpire = await this.prisma.umpire.findUnique({
            where: { id },
            include: { league: true },
        });

        if (!umpire) {
            throw new NotFoundException(`Umpire with id ${id} not found`);
        }

        return umpire;
    }

    async update(id: string, updateData: UpdateUmpireDto) {
        await this.findOne(id);
        return this.prisma.umpire.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.umpire.delete({
            where: { id },
        });
    }
}
