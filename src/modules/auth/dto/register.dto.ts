import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character(@, !, *, ?)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!*?])[A-Za-z\d@!*?]{8,50}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character(@, !, *, ?)',
  })
  password: string;
}
