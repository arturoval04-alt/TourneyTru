import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class CreateTeamDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    shortName?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    managerName?: string;

    @IsOptional()
    @IsString()
    homeFieldId?: string;

    @IsUUID()
    tournamentId: string;
}

export class UpdateTeamDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    shortName?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    managerName?: string;

    @IsOptional()
    @IsString()
    homeFieldId?: string;
}

export class CreateTeamBulkDto extends CreateTeamDto {
    players: {
        firstName: string;
        lastName: string;
        number?: number;
        position?: string;
        photoUrl?: string;
    }[];
}
