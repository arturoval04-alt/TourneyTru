import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async register(dto: RegisterDto) {
        // Verificar si el email ya existe
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing) {
            throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
        }

        // Hash de contraseña
        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Buscar o crear el rol 'general'
        let role = await this.prisma.role.findUnique({ where: { name: 'general' } });
        if (!role) {
            role = await this.prisma.role.create({ data: { name: 'general' } });
        }

        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    firstName: dto.firstName.trim(),
                    lastName: dto.lastName.trim(),
                    phone: dto.phone,
                    roleId: role.id,
                },
                include: { role: true },
            });

            const tokens = this.generateTokens(user.id, user.email, user.role.name);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role.name,
                },
                ...tokens,
            };
        } catch {
            throw new InternalServerErrorException('Error al crear la cuenta');
        }
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            include: { role: true },
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const tokens = this.generateTokens(user.id, user.email, user.role.name);

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                profilePicture: user.profilePicture,
                role: user.role.name,
            },
            ...tokens,
        };
    }

    async refreshToken(token: string) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { role: true },
            });

            if (!user) throw new UnauthorizedException();

            return this.generateTokens(user.id, user.email, user.role.name);
        } catch {
            throw new UnauthorizedException('Token de refresco inválido o expirado');
        }
    }

    private generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }
}
