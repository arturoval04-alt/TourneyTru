import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateUmpireDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsUUID()
    leagueId: string;
}

export class UpdateUmpireDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsUUID()
    leagueId?: string;
}
