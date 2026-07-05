import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// AuthModule groups everything related to authentication together.
// It imports UsersModule so AuthService can use UsersService (to find/create users).
// JwtService is already available globally (registered in AppModule), so no need to import it here.
@Module({
  imports: [
    UsersModule, // gives us access to UsersService inside AuthService
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
