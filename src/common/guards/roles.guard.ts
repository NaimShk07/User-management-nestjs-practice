import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// The RolesGuard checks if the logged-in user has the right ROLE to access a route.
// IMPORTANT: This guard must always be used AFTER JwtAuthGuard,
//            because JwtAuthGuard is what sets req['user'] with the user's role.
//
// Usage example:
//   @UseGuards(JwtAuthGuard, RolesGuard)  ← both guards, order matters
//   @Roles('admin')
//   @Delete(':id')
//   remove(...) { ... }
@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector reads metadata that was set by @Roles() decorator
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Step 1: Read the required roles from the @Roles() decorator on this route
    // e.g. if the route has @Roles('admin'), requiredRoles = ['admin']
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    // Step 2: If no @Roles() decorator was used, everyone with a valid token can access it
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Step 3: Get the current user from the request
    // This was set by JwtAuthGuard when it decoded the JWT token
    const request = context.switchToHttp().getRequest();
    const user = request['user'];

    // Step 4: Check if the user's role is in the required roles list
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. This route requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true; // user has the right role — allow access
  }
}
