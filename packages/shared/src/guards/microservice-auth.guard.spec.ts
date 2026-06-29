import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators';
import { ContextUtil } from '../utils';
import { MicroserviceAuthGuard } from './microservice-auth.guard';

jest.mock('../utils', () => ({
  ContextUtil: { extractToken: jest.fn() },
}));

const makeContext = (isPublic: boolean, authHeader?: string) => {
  const getHandler = jest.fn();
  const getClass = jest.fn();
  const getRequest = jest.fn().mockReturnValue({
    headers: authHeader ? { authorization: authHeader } : {},
    cookies: {},
  });
  return {
    getHandler,
    getClass,
    getType: jest.fn().mockReturnValue('http'),
    switchToHttp: jest.fn().mockReturnValue({ getRequest }),
  } as unknown as ExecutionContext;
};

describe('MicroserviceAuthGuard', () => {
  let guard: MicroserviceAuthGuard;
  let authClient: jest.Mocked<ClientProxy>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    authClient = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new MicroserviceAuthGuard(authClient, reflector);
    jest.clearAllMocks();
  });

  it('should return true immediately for public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = makeContext(true);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(authClient.send).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when no token is found', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    (ContextUtil.extractToken as jest.Mock).mockReturnValue(null);
    const context = makeContext(false);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(authClient.send).not.toHaveBeenCalled();
  });

  it('should return true and attach user when auth succeeds', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    reflector.getAllAndOverride.mockReturnValue(false);
    (ContextUtil.extractToken as jest.Mock).mockReturnValue('valid-token');
    authClient.send.mockReturnValue(of(mockUser) as ReturnType<ClientProxy['send']>);

    const context = makeContext(false, 'Bearer valid-token');
    const result$ = guard.canActivate(context) as ReturnType<typeof of>;
    const result = await firstValueFrom(result$);

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when auth client returns an error', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    (ContextUtil.extractToken as jest.Mock).mockReturnValue('bad-token');
    authClient.send.mockReturnValue(
      throwError(() => new Error('Unauthorized')) as ReturnType<ClientProxy['send']>,
    );

    const context = makeContext(false, 'Bearer bad-token');
    const result$ = guard.canActivate(context) as ReturnType<typeof of>;

    await expect(firstValueFrom(result$)).rejects.toThrow(UnauthorizedException);
  });

  it('should check IS_PUBLIC_KEY on handler and class', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = makeContext(true);

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );
  });
});
