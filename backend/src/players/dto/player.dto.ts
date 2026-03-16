import { IsString, IsOptional, IsInt, IsUUID, IsIn } from 'class-validator';

export class CreatePlayerDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsOptional()
    @IsInt()
    number?: number;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional()
    @IsIn(['R', 'L'])
    throws?: string;

    @IsUUID()
    teamId: string;
}

export class UpdatePlayerDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsInt()
    number?: number;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsIn(['R', 'L', 'S'])
    bats?: string;

    @IsOptional()
    @IsIn(['R', 'L'])
    throws?: string;

    @IsOptional()
    @IsUUID()
    teamId?: string;
}
