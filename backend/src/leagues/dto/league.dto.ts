import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class CreateLeagueDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsUrl()
    logoUrl?: string;

    @IsUUID()
    adminId: string;
}

export class UpdateLeagueDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsUrl()
    logoUrl?: string;
}
