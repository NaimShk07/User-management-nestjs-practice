import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser'); // reads cookies from requests
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet'); // adds secure HTTP headers automatically
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Helmet ──────────────────────────────────────────────────────────────────
  // Helmet sets security-related HTTP headers automatically.
  // For example it prevents clickjacking, XSS attacks, etc.
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  // CORS (Cross-Origin Resource Sharing) lets a browser on one domain
  // talk to your API on a different domain.
  // credentials: true is needed so the browser sends cookies (refresh token).
  app.enableCors({
    origin: 'http://localhost:5173', // your frontend URL (change if needed)
    credentials: true, // allow cookies to be sent
  });

  // ── Cookie Parser ────────────────────────────────────────────────────────────
  // Without this, req.cookies is always empty.
  // This parses the Cookie header and fills req.cookies with key-value pairs.
  app.use(cookieParser());

  // ── Validation Pipe ──────────────────────────────────────────────────────────
  // Validates incoming request bodies against our DTOs automatically.
  // whitelist: true  → remove fields not defined in the DTO
  // transform: true  → auto-convert types (e.g. string "5" → number 5)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ── Response Interceptor ─────────────────────────────────────────────────────
  // Wraps every successful response in { statusCode, message, data }
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Exception Filter ─────────────────────────────────────────────────────────
  // Catches all errors and returns a consistent { statusCode, message, ... } shape
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`,
  );
}
bootstrap();
