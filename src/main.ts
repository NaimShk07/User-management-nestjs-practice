import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);

  // ── Global Guard ── protect all routes by default; use @Public() to opt-out
  app.useGlobalGuards(new JwtAuthGuard(jwtService, reflector));

  // ── Global Interceptor ── wrap all success responses in { statusCode, message, data }
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // ── Global Exception Filter ── structured error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Validation Pipe ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
