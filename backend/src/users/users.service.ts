import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        try {
            const users = await this.prisma.user.findMany({
                include: { role: true },
            });
            return users.map(u => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                role: u.role ? u.role.name : 'general',
                phone: u.phone,
                profilePicture: u.profilePicture,
            }));
        } catch (e) {
            console.error('Error fetching users', e);
            return [];
        }
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user) return null;
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role.name,
            phone: user.phone,
            profilePicture: user.profilePicture,
        };
    }

    // Solo para uso interno (ej. seed de admin)
    async createAdmin(dto: { email: string; password: string; firstName: string; lastName: string }) {
        try {
            let role = await this.prisma.role.findUnique({ where: { name: 'admin' } });
            if (!role) {
                role = await this.prisma.role.create({ data: { name: 'admin' } });
            }

            const passwordHash = await bcrypt.hash(dto.password, 12);

            const user = await this.prisma.user.create({
                data: {
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    roleId: role.id,
                },
                include: { role: true },
            });

            return {
                id: user.id,
                email: user.email,
                role: user.role.name,
            };
        } catch (e) {
            console.error('Error creating admin user', e);
            throw new InternalServerErrorException('Error creating admin user');
        }
    }

    async updateProfile(userId: string, dto: { phone?: string; profilePicture?: string }) {
        try {
            const data: any = {};
            if (dto.phone !== undefined) data.phone = dto.phone;
            if (dto.profilePicture !== undefined) data.profilePicture = dto.profilePicture;

            const updated = await this.prisma.user.update({
                where: { id: userId },
                data,
            });

            return {
                id: updated.id,
                email: updated.email,
                phone: updated.phone,
                profilePicture: updated.profilePicture,
            };
        } catch (e) {
            console.error('Error updating user profile', e);
            throw new InternalServerErrorException('Error al actualizar el perfil');
        }
    }
}
