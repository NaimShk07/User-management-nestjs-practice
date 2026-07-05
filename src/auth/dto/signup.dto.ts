import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// This DTO (Data Transfer Object) defines what fields are required for signup.
// class-validator decorators automatically validate the request body.
export class SignupDto {
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  // Password must be at least 6 characters
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
