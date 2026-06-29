import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AuthTrpcMiddleware } from './auth-trpc.middleware';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthService: class MockAuthService {
    api = { getSession: jest.fn() };
  },
  BetterAuthModule: { forRoot: jest.fn() },
  InjectBetterAuth: () => () => undefined,
}));

describe('AuthTrpcMiddleware', () => {
  let middleware: AuthTrpcMiddleware;
  let authService: { api: { getSession: jest.Mock } };

  beforeEach(async () => {
    authService = { api: { getSession: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTrpcMiddleware,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    middleware = module.get<AuthTrpcMiddleware>(AuthTrpcMiddleware);
  });

  describe('use()', () => {
    it('should call next with user merged into context on valid session', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockSession = { user: mockUser, session: { id: 'session-1' } };
      authService.api.getSession.mockResolvedValue(mockSession);

      const ctx = { req: { headers: {} }, res: {} };
      const next = jest.fn().mockResolvedValue({ result: 'ok' });

      const result = await middleware.use({ ctx, next } as never);

      expect(next).toHaveBeenCalledWith({
        ctx: { ...ctx, user: mockUser },
      });
      expect(result).toEqual({ result: 'ok' });
    });

    it('should throw Unauthorized when session is null', async () => {
      authService.api.getSession.mockResolvedValue(null);

      const ctx = { req: { headers: {} }, res: {} };
      const next = jest.fn();

      await expect(
        middleware.use({ ctx, next } as never),
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized when session has no user', async () => {
      authService.api.getSession.mockResolvedValue({ user: null, session: {} });

      const ctx = { req: { headers: {} }, res: {} };
      const next = jest.fn();

      await expect(
        middleware.use({ ctx, next } as never),
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized when getSession throws', async () => {
      authService.api.getSession.mockRejectedValue(new Error('Network error'));

      const ctx = { req: { headers: {} }, res: {} };
      const next = jest.fn();

      await expect(
        middleware.use({ ctx, next } as never),
      ).rejects.toThrow('Unauthorized');
    });
  });
});
