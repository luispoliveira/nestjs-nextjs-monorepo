import { UseMiddlewares } from 'nestjs-trpc-v2';
import { AuthTrpcMiddleware, LoggingTrpcMiddleware } from '../middlewares';

/**
 * Abstract base router that applies logging and auth middlewares to all
 * concrete subclasses via prototype chain inheritance (Reflect.getMetadata).
 *
 * Each concrete subclass MUST apply @Router() itself — @Router() captures the
 * caller file path at decoration time, so it cannot live here.
 *
 * @example
 * ```ts
 * @Router()
 * export class UsersRouter extends BaseRouter { ... }
 * ```
 */
@UseMiddlewares(LoggingTrpcMiddleware, AuthTrpcMiddleware)
export abstract class BaseRouter {}
