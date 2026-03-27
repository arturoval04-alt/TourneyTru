import { IsString, MinLength, MaxLength, Matches, Length } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    @Length(64, 64)
    token: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
        message: 'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
    })
    newPassword: string;
}
