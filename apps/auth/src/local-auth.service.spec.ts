import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@repo/database';
import { NotificationsPublisher } from '@repo/shared';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { LocalAuthService, publisherProxy } from './local-auth.service';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthService: class MockAuthService {
    api = { getSession: jest.fn(), signUpEmail: jest.fn() };
  },
  BetterAuthModule: { forRoot: jest.fn() },
  InjectBetterAuth: () => () => undefined,
  Hook: () => () => undefined,
  AfterHook: () => () => undefined,
}));

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let configService: jest.Mocked<ConfigService>;
  let authService: { api: { getSession: jest.Mock; signUpEmail: jest.Mock } };
  let databaseService: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let notificationsPublisher: jest.Mocked<NotificationsPublisher>;

  beforeEach(async () => {
    configService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    authService = {
      api: {
        getSession: jest.fn(),
        signUpEmail: jest.fn().mockResolvedValue({}),
      },
    };

    databaseService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    notificationsPublisher = {
      emitUserPasswordChanged: jest.fn(),
      emitUserTwoFactorEnabled: jest.fn(),
      emitUserTwoFactorDisabled: jest.fn(),
      emitUserCreated: jest.fn(),
      emitUserPasswordResetRequested: jest.fn(),
      emitUserEmailVerificationRequested: jest.fn(),
    } as unknown as jest.Mocked<NotificationsPublisher>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalAuthService,
        { provide: ConfigService, useValue: configService },
        { provide: AuthService, useValue: authService },
        { provide: DatabaseService, useValue: databaseService },
        { provide: NotificationsPublisher, useValue: notificationsPublisher },
      ],
    }).compile();

    service = module.get<LocalAuthService>(LocalAuthService);
  });

  // ===========================================================================
  // onModuleInit() Tests
  // ===========================================================================

  describe('onModuleInit()', () => {
    it('should set publisherProxy.instance and call ensureAdminUser', async () => {
      configService.getOrThrow.mockReturnValue('admin@example.com');
      databaseService.user.findUnique.mockResolvedValue({ id: 'admin-id' });

      await service.onModuleInit();

      expect(publisherProxy.instance).toBe(notificationsPublisher);
    });
  });

  // ===========================================================================
  // ensureAdminUser() Tests
  // ===========================================================================

  describe('ensureAdminUser()', () => {
    it('should skip creation when admin user already exists', async () => {
      configService.getOrThrow.mockReturnValue('admin@example.com');
      databaseService.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await service.ensureAdminUser();

      expect(authService.api.signUpEmail).not.toHaveBeenCalled();
      expect(databaseService.user.update).not.toHaveBeenCalled();
    });

    it('should create admin and promote to admin role when user does not exist', async () => {
      configService.getOrThrow
        .mockReturnValueOnce('admin@example.com')
        .mockReturnValueOnce('securepassword');
      databaseService.user.findUnique.mockResolvedValue(null);

      await service.ensureAdminUser();

      expect(authService.api.signUpEmail).toHaveBeenCalledWith({
        body: {
          email: 'admin@example.com',
          password: 'securepassword',
          name: 'Admin',
        },
      });
      expect(databaseService.user.update).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
        data: { emailVerified: true, role: 'admin' },
      });
    });
  });

  // ===========================================================================
  // handlePasswordChanged() Tests
  // ===========================================================================

  describe('handlePasswordChanged()', () => {
    it('should emit emitUserPasswordChanged for a valid session', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      authService.api.getSession.mockResolvedValue({
        user: mockUser,
        session: {},
      });

      await service.handlePasswordChanged({ headers: {} } as never);

      expect(
        notificationsPublisher.emitUserPasswordChanged,
      ).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        reason: 'User changed password',
      });
    });

    it('should throw when session is null', async () => {
      authService.api.getSession.mockResolvedValue(null);

      await expect(
        service.handlePasswordChanged({ headers: {} } as never),
      ).rejects.toThrow('Session not found');
    });

    it('should throw when session has no user', async () => {
      authService.api.getSession.mockResolvedValue({ user: null });

      await expect(
        service.handlePasswordChanged({ headers: {} } as never),
      ).rejects.toThrow('Session not found');
    });
  });

  // ===========================================================================
  // handleTwoFactorEnabled() Tests
  // ===========================================================================

  describe('handleTwoFactorEnabled()', () => {
    it('should emit emitUserTwoFactorEnabled for a valid session', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      authService.api.getSession.mockResolvedValue({
        user: mockUser,
        session: {},
      });

      await service.handleTwoFactorEnabled({ headers: {} } as never);

      expect(
        notificationsPublisher.emitUserTwoFactorEnabled,
      ).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw when session is null', async () => {
      authService.api.getSession.mockResolvedValue(null);

      await expect(
        service.handleTwoFactorEnabled({ headers: {} } as never),
      ).rejects.toThrow('Session not found');
    });
  });

  // ===========================================================================
  // handleTwoFactorDisabled() Tests
  // ===========================================================================

  describe('handleTwoFactorDisabled()', () => {
    it('should emit emitUserTwoFactorDisabled for a valid session', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      authService.api.getSession.mockResolvedValue({
        user: mockUser,
        session: {},
      });

      await service.handleTwoFactorDisabled({ headers: {} } as never);

      expect(
        notificationsPublisher.emitUserTwoFactorDisabled,
      ).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw when session is null', async () => {
      authService.api.getSession.mockResolvedValue(null);

      await expect(
        service.handleTwoFactorDisabled({ headers: {} } as never),
      ).rejects.toThrow('Session not found');
    });
  });
});
