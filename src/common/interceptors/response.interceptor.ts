import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// An Interceptor runs before AND after a route handler.
// This one wraps every successful response in a consistent format:
// { statusCode, message, data }
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get the HTTP response object so we can read the status code
    const response = context.switchToHttp().getResponse();

    // next.handle() calls the actual route handler (e.g. findAll, create)
    // .pipe(map(...)) transforms the return value before sending it to the client
    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode, // e.g. 200, 201
        message: 'Success',
        data: data, // the actual data returned by the controller
      })),
    );
  }
}
