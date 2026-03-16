import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        try {
            const users = await this.prisma.user.findMany({
                include: { role: true }
            });
            return users.map(u => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`.trim(),
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

    async create(dto: any) {
        try {
            // Find or create role
            let role = await this.prisma.role.findUnique({
                where: { name: dto.role || 'general' },
            });

            if (!role) {
                role = await this.prisma.role.create({
                    data: { name: dto.role || 'general' },
                });
            }

            const names = dto.name ? dto.name.split(' ') : ['Usuario'];
            const firstName = names[0];
            const lastName = names.slice(1).join(' ') || '';

            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    passwordHash: dto.password || '123456',
                    firstName,
                    lastName,
                    roleId: role.id,
                },
            });

            return {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                role: role.name
            };
        } catch (e) {
            console.error('Error creating user', e);
            throw new InternalServerErrorException('Error creating user');
        }
    }

    async updateProfile(email: string, dto: { phone?: string; profilePicture?: string }) {
        try {
            const data: any = {};
            if (dto.phone !== undefined) data.phone = dto.phone;
            if (dto.profilePicture !== undefined) data.profilePicture = dto.profilePicture;

            const updated = await this.prisma.user.update({
                where: { email },
                data
            });

            return {
                id: updated.id,
                email: updated.email,
                phone: updated.phone,
                profilePicture: updated.profilePicture
            };
        } catch (e) {
            console.error('Error updating user profile', e);
            throw new InternalServerErrorException('Error updating user profile');
        }
    }
}
