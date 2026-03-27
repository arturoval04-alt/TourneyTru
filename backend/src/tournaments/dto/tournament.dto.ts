import { IsString, IsOptional, IsUUID, IsDateString, MaxLength, IsIn } from 'class-validator';

export class CreateTournamentDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsString()
    @MaxLength(50)
    season: string;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    rulesType?: string; // Ej: 'baseball_9' o 'softball_7'

    @IsUUID()
    leagueId: string;

    @IsUUID()
    adminId: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    category?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    locationCity?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    locationState?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    locationCountry?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;
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

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsIn(['upcoming', 'active', 'finished', 'cancelled'])
    status?: string;
}
