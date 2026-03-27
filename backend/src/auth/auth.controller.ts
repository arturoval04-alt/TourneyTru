import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/',
};

@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.register(dto);
        res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
        const { refreshToken: _, ...safeResult } = result;
        return safeResult;
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(dto);
        res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
        const { refreshToken: _, ...safeResult } = result;
        return safeResult;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
        const token = (req as any).cookies?.refreshToken as string | undefined;
        if (!token) throw new UnauthorizedException('Sesión expirada. Inicia sesión de nuevo.');
        const result = await this.authService.refreshToken(token);
        res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
        const { refreshToken: _, ...safeResult } = result;
        return safeResult;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('refreshToken', { path: '/' });
        return { message: 'Sesión cerrada correctamente.' };
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }

    @Post('force-change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    forceChangePassword(@Request() req: any, @Body() dto: { newPassword: string }) {
        return this.authService.forceChangePassword(req.user.id, dto.newPassword);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    getMe(@Request() req: any) {
        return req.user;
    }

    @Post('me')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    postMe(@Request() req: any) {
        return req.user;
    }
}
