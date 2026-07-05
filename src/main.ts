import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ValidationPipe checks incoming request bodies against our DTOs
  // whitelist: true  → strips out any fields not in the DTO
  // transform: true  → converts types automatically (e.g. "5" → 5)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ResponseInterceptor wraps every success response in { statusCode, message, data }
  app.useGlobalInterceptors(new ResponseInterceptor());

  // HttpExceptionFilter gives a consistent shape to every error response
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
