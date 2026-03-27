import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateUmpireDto {
    @IsString()
    @MaxLength(50)
    firstName: string;

    @IsString()
    @MaxLength(50)
    lastName: string;

    @IsUUID()
    leagueId: string;
}

export class UpdateUmpireDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @IsOptional()
    @IsUUID()
    leagueId?: string;
}
