import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateTournamentDto {
    @IsString()
    name: string;

    @IsString()
    season: string;

    @IsOptional()
    @IsString()
    rulesType?: string; // Ej: 'baseball_9' o 'softball_7'

    @IsUUID()
    leagueId: string;

    @IsString()
    adminId: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    locationCity?: string;

    @IsOptional()
    @IsString()
    locationState?: string;

    @IsOptional()
    @IsString()
    locationCountry?: string;
}

export class UpdateTournamentDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    season?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    rulesType?: string;

    @IsOptional()
    @IsUUID()
    leagueId?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    locationCity?: string;

    @IsOptional()
    @IsString()
    locationState?: string;

    @IsOptional()
    @IsString()
    locationCountry?: string;
}
