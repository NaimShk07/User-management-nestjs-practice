import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Loads environment variables so NestJS can use them.
    // isGlobal: true allows you to use it in any module without importing ConfigModule again.
    ConfigModule.forRoot({ isGlobal: true }),

    // configures the JWT security system for your entire application.
    JwtModule.registerAsync({
      global: true, // makes JwtService injectable everywhere without re-importing
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-change-me'),
        signOptions: {
          expiresIn: config.get<number>('JWT_EXPIRES_SECONDS', 86400), // 1 day in seconds
        },
      }),
    }),
    DatabaseModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
