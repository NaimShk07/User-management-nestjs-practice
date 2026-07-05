import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';

// AuthModule groups everything related to authentication.
//
// PassportModule is required to use AuthGuard('google') in the controller.
// It is the bridge between NestJS and the Passport library.
//
// GoogleStrategy is registered as a provider — NestJS creates it on startup,
// which automatically registers it with Passport under the name 'google'.
@Module({
  imports: [
    UsersModule, // gives AuthService access to UsersService
    PassportModule, // required for AuthGuard('google') to work
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy, // registers the Google OAuth strategy with Passport
  ],
})
export class AuthModule {}
