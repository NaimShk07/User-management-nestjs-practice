import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';

/**
 * Attach a custom success message to a route handler.
 * The ResponseInterceptor reads this and includes it in the response body.
 *
 * @example
 * @ResponseMessage('Users retrieved successfully')
 * @Get()
 * findAll() { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
