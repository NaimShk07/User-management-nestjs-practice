import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// A Guard decides: can this request pass through? (true = yes, false = blocked)
// This guard checks if the request has a valid JWT token in the Authorization header.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the incoming HTTP request
    const request = context.switchToHttp().getRequest<Request>();

    // Read the Authorization header  e.g. "Bearer eyJhbGci..."
    const authHeader = request.headers['authorization'];

    // If there is no Authorization header, block the request
    if (!authHeader) {
      throw new UnauthorizedException('Please login first. No token provided.');
    }

    // The token comes after "Bearer ", so we split and take the second part
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token is missing after "Bearer".');
    }

    // Verify the token using the JWT secret
    try {
      const decoded = this.jwtService.verify(token);
      // Attach the decoded user info to the request so controllers can use it later
      request['user'] = decoded;
      return true; // allow the request
    } catch {
      throw new UnauthorizedException('Token is invalid or has expired.');
    }
  }
}
