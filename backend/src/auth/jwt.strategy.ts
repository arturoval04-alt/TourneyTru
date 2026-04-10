import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

const extractAccessTokenFromCookie = (req: any): string | null => {
    return req?.cookies?.accessToken ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                extractAccessTokenFromCookie,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET!,
        });
    }

    async validate(payload: { sub: string; email: string; role: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                role: true,
                teamDelegates: {
                    where: { isActive: true },
                    include: { tournament: true }
                },
                scorekeeperTournaments: {
                    select: { tournamentId: true }
                }
            },
        });

        if (!user) throw new UnauthorizedException('Token inv?lido');

        const activeDelegate = (user as any).teamDelegates?.[0];
        const sktIds = (user as any).scorekeeperTournaments?.map((s: any) => s.tournamentId) || [];

        return {
            id: user.id,
            email: user.email,
            role: (user as any).role.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            profilePicture: user.profilePicture,
            scorekeeperLeagueId: (user as any).scorekeeperLeagueId ?? null,
            scorekeeperTournamentIds: sktIds,
            delegateTeamId: activeDelegate?.teamId ?? null,
            delegateTournamentId: activeDelegate?.tournamentId ?? null,
            isDelegateActive: !!activeDelegate,
        };
    }
}
