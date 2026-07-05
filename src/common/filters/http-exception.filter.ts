import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

// @Catch() with no arguments means: catch ALL errors (not just HttpExceptions)
// An ExceptionFilter lets you control what gets sent back when an error occurs.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if it's a known NestJS HTTP error (404, 400, 401, etc.)
    // or an unexpected server crash
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong on the server';

    if (exception instanceof HttpException) {
      // Known error — e.g. NotFoundException, UnauthorizedException
      statusCode = exception.getStatus();

      // getResponse() can return a string or an object — handle both cases
      const exceptionBody = exception.getResponse();
      if (typeof exceptionBody === 'string') {
        message = exceptionBody;
      } else {
        // NestJS validation errors return { message: [...], error: '...' }
        message = (exceptionBody as any).message ?? exception.message;
      }
    } else if (exception instanceof Error) {
      // Unexpected error (e.g. database crash)
      message = exception.message;
      console.error('Unexpected error:', exception);
    }

    // Send a consistent error response every time
    response.status(statusCode).json({
      statusCode,
      message,
      path: request.url, // which route caused the error
      timestamp: new Date().toISOString(),
    });
  }
}
