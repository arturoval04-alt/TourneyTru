import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, Res, Req, UnauthorizedException, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const isProduction = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
};

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
};

@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    private applyAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
        res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTIONS);
        res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    }

    private clearAuthCookies(res: Response) {
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
    }

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Get('verify-email')
    @HttpCode(HttpStatus.OK)
    verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    resendVerification(@Body() body: { email: string }) {
        return this.authService.resendVerification(body.email);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(dto);
        this.applyAuthCookies(res, result);
        const { refreshToken: _, ...safeResult } = result;
        return safeResult;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
        const token = (req as any).cookies?.refreshToken as string | undefined;
        if (!token) throw new UnauthorizedException('Sesi?n expirada. Inicia sesi?n de nuevo.');
        const result = await this.authService.refreshToken(token);
        this.applyAuthCookies(res, result);
        const { refreshToken: _, ...safeResult } = result;
        return safeResult;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) res: Response) {
        this.clearAuthCookies(res);
        return { message: 'Sesi?n cerrada correctamente.' };
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
