import { IsString, IsOptional, IsUUID, IsArray, IsInt, ValidateNested, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamDto {
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
    @MaxLength(100)
    managerName?: string;

    @IsOptional()
    @IsUUID()
    homeFieldId?: string;

    @IsUUID()
    tournamentId: string;
}

export class UpdateTeamDto {
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
    @MaxLength(100)
    managerName?: string;

    @IsOptional()
    @IsUUID()
    homeFieldId?: string;
}

export class BulkPlayerDto {
    @IsString()
    @MaxLength(50)
    firstName: string;

    @IsString()
    @MaxLength(50)
    lastName: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(99)
    number?: number;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    position?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;
}

export class CreateTeamBulkDto extends CreateTeamDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkPlayerDto)
    players: BulkPlayerDto[];
}
