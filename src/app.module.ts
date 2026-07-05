import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // ── ConfigModule ───────────────────────────────────────────────────────────
    // Loads your .env file and makes all env variables available everywhere.
    // isGlobal: true means you don't need to import ConfigModule in every module.
    ConfigModule.forRoot({ isGlobal: true }),

    // ── ThrottlerModule (Rate Limiting) ────────────────────────────────────────
    // Prevents abuse by limiting how many requests a client can make.
    // ttl: 60000ms = 1 minute window
    // limit: 20 = max 20 requests per minute per IP
    // If a client exceeds this, they get a 429 Too Many Requests error.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 1 minute (in milliseconds)
        limit: 20,   // max requests per ttl window
      },
    ]),

    // ── JwtModule ─────────────────────────────────────────────────────────────
    // Configures JWT globally — reads secret from .env so it's not hard-coded.
    // global: true → JwtService can be used in ANY module (auth, users, etc.)
    // registerAsync → waits until ConfigModule has loaded .env before setting up
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-change-me'),
        signOptions: {
          expiresIn: config.get<number>('JWT_EXPIRES_SECONDS', 86400), // 1 day default
        },
      }),
    }),

    // ── Feature Modules ───────────────────────────────────────────────────────
    DatabaseModule, // MySQL connection pool
    UsersModule,    // /users routes
    AuthModule,     // /auth routes (signup, login, refresh, logout)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
