import { ExecutionContext } from '@nestjs/common';
import { CustomThrottlerGuard } from './custom-throttler.guard';

// CustomThrottlerGuard extends ThrottlerGuard which requires DI.
// We bypass the constructor to test the protected methods directly.
function makeGuardInstance(): CustomThrottlerGuard {
  const instance = Object.create(CustomThrottlerGuard.prototype) as CustomThrottlerGuard;
  (instance as unknown as Record<string, unknown>).logger = { warn: jest.fn() };
  return instance;
}

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  beforeEach(() => {
    guard = makeGuardInstance();
  });

  describe('getTracker', () => {
    it('should return user-based key when user.id is present', async () => {
      const req = { user: { id: 'user-123' }, ip: '192.168.1.1' };
      const tracker = await guard['getTracker'](req as Record<string, unknown>);
      expect(tracker).toBe('user:user-123');
    });

    it('should return IP-based key when no user is present', async () => {
      const req = { ip: '10.0.0.1' };
      const tracker = await guard['getTracker'](req as Record<string, unknown>);
      expect(tracker).toBe('ip:10.0.0.1');
    });

    it('should return ip:unknown when IP is null/undefined', async () => {
      const req = {};
      const tracker = await guard['getTracker'](req as Record<string, unknown>);
      expect(tracker).toBe('ip:unknown');
    });
  });

  describe('generateKey', () => {
    it('should return a SHA256 hex hash of name-tracker', () => {
      const context = {} as ExecutionContext;
      const key = guard['generateKey'](context, 'user:123', 'throttle-limit');
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent output for the same inputs', () => {
      const context = {} as ExecutionContext;
      const key1 = guard['generateKey'](context, 'tracker', 'name');
      const key2 = guard['generateKey'](context, 'tracker', 'name');
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different inputs', () => {
      const context = {} as ExecutionContext;
      const key1 = guard['generateKey'](context, 'tracker1', 'name');
      const key2 = guard['generateKey'](context, 'tracker2', 'name');
      expect(key1).not.toBe(key2);
    });
  });
});
