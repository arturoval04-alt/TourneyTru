import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateDelegateDto {
    @ValidateIf(o => !o.linkExistingAccount)
    @IsString()
    @IsNotEmpty()
    firstName?: string;

    @ValidateIf(o => !o.linkExistingAccount)
    @IsString()
    @IsNotEmpty()
    lastName?: string;

    @IsEmail()
    email: string;

    @ValidateIf(o => !o.linkExistingAccount)
    @IsString()
    @MinLength(6)
    password?: string;

    @IsString() @IsOptional()
    phone?: string;

    @IsBoolean()
    @IsOptional()
    linkExistingAccount?: boolean;

    @IsString() @IsNotEmpty()
    teamId: string;

    @IsString() @IsNotEmpty()
    tournamentId: string;
}
