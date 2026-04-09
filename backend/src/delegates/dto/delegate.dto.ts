import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDelegateDto {
    @IsString() @IsNotEmpty()
    firstName: string;

    @IsString() @IsNotEmpty()
    lastName: string;

    @IsEmail()
    email: string;

    @IsString() @MinLength(6)
    password: string;

    @IsString() @IsOptional()
    phone?: string;

    @IsString() @IsNotEmpty()
    teamId: string;

    @IsString() @IsNotEmpty()
    tournamentId: string;
}
