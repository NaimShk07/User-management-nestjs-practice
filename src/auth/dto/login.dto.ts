import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// This DTO validates what the user sends when logging in.
export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password: string;
}
