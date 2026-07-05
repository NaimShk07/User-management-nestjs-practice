import { SetMetadata } from '@nestjs/common';

// This decorator lets you mark a route with required roles.
// Example usage on a controller method:
//
//   @Roles('admin')
//   @Get()
//   findAll() { ... }
//
// SetMetadata saves the roles under the key 'roles' so the RolesGuard can read them.
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
