import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public — the JwtAuthGuard will skip it.
 *
 * @example
 * @Public()
 * @Post('register')
 * register(@Body() dto: CreateUserDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
