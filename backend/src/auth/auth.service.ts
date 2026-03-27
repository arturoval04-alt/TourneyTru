import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async register(dto: RegisterDto) {
        // Verificar si el email ya existe
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
        });
        if (existing) {
            throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
        }

        // Hash de contraseña
        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Buscar o crear el rol especificado (o default 'general')
        const roleName = dto.role || 'general';
        let role = await this.prisma.role.findUnique({ where: { name: roleName } });
        if (!role) {
            role = await this.prisma.role.create({ data: { name: roleName } });
        }

        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email.toLowerCase().trim(),
                    passwordHash,
                    firstName: dto.firstName.trim(),
                    lastName: (dto.lastName || '').trim(),
                    phone: dto.phone,
                    roleId: role.id,
                    ...(dto.organizerRequestNote ? {
                        organizerRequestNote: dto.organizerRequestNote,
                        organizerRequestedAt: new Date(),
                    } : {}),
                },
                include: { role: true },
            });

            // Si se proporciona un torneo, vincularlo como organizador/scorekeeper
            if (dto.tournamentId) {
                try {
                    await this.prisma.tournamentOrganizer.create({
                        data: {
                            userId: user.id,
                            tournamentId: dto.tournamentId,
                        }
                    });
                } catch (err) {
                    console.error('[Register] Error vinculando torneo:', err);
                    // No fallamos el registro completo si solo falla la vinculación
                }
            }

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
        } catch (err) {
            console.error('[Register Error]', err);
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
                scorekeeperLeagueId: (user as any).scorekeeperLeagueId ?? null,
                forcePasswordChange: (user as any).forcePasswordChange ?? false,
                maxLeagues: (user as any).maxLeagues ?? 0,
                maxTournamentsPerLeague: (user as any).maxTournamentsPerLeague ?? 0,
                maxTeamsPerTournament: (user as any).maxTeamsPerTournament ?? 0,
                maxPlayersPerTeam: (user as any).maxPlayersPerTeam ?? 25,
                planLabel: (user as any).planLabel ?? 'public',
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

    async forgotPassword(email: string): Promise<{ token: string; message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        const message = 'Si el correo está registrado, recibirás las instrucciones.';

        if (!user) {
            return { token: '', message };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: token, passwordResetExpiry: expiry },
        });

        console.log(`[DEV] Reset token para ${email}: ${token}`);

        return { token, message };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            throw new BadRequestException('Token inválido o expirado.');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });

        return { message: 'Contraseña actualizada correctamente.' };
    }

    async forceChangePassword(userId: string, newPassword: string): Promise<{ message: string }> {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                forcePasswordChange: false,
            },
        });
        return { message: 'Contraseña actualizada correctamente.' };
    }

    private generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: '24h',
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }
}
