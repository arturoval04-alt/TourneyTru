import { IsString, IsOptional, IsUrl, IsUUID, IsInt, IsBoolean, IsIn, MaxLength, Min, Max } from 'class-validator';

export class CreateLeagueDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    shortName?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsIn(['baseball', 'softball', 'both'])
    sport?: string;

    @IsOptional()
    @IsInt()
    @Min(1900)
    @Max(2100)
    foundedYear?: number;

    @IsOptional()
    @IsString()
    websiteUrl?: string;

    @IsOptional()
    @IsString()
    facebookUrl?: string;

    @IsUUID()
    adminId: string;
}

export class UpdateLeagueDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    shortName?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsIn(['baseball', 'softball', 'both'])
    sport?: string;

    @IsOptional()
    @IsInt()
    @Min(1900)
    @Max(2100)
    foundedYear?: number;

    @IsOptional()
    @IsString()
    websiteUrl?: string;

    @IsOptional()
    @IsString()
    facebookUrl?: string;

    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;
}
