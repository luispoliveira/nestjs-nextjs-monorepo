import { SanitizeUtil } from './sanitize.util';

describe('SanitizeUtil', () => {
  describe('sanitize', () => {
    it('should replace sensitive keys with [SANITIZED]', () => {
      const input = { email: 'user@example.com', password: 'secret123' };
      const result = SanitizeUtil.sanitize(input);
      expect(result.password).toBe('[SANITIZED]');
      expect(result.email).toBe('user@example.com');
    });

    it('should sanitize nested objects recursively', () => {
      const input = {
        user: { name: 'Alice', token: 'abc', nested: { secret: 'shh' } },
      };
      const result = SanitizeUtil.sanitize(input);
      expect(result.user.token).toBe('[SANITIZED]');
      expect(result.user.nested.secret).toBe('[SANITIZED]');
      expect(result.user.name).toBe('Alice');
    });

    it('should sanitize case-insensitively (authorization header)', () => {
      const input = { Authorization: 'Bearer token' };
      const result = SanitizeUtil.sanitize(input);
      expect(result.Authorization).toBe('[SANITIZED]');
    });

    it('should return the same value when input is falsy', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(SanitizeUtil.sanitize(null as any)).toBeNull();
    });

    it('should not mutate the original object', () => {
      const input = { password: 'secret' };
      SanitizeUtil.sanitize(input);
      expect(input.password).toBe('secret');
    });

    it('should handle x-api-key sensitive key', () => {
      const input = { 'x-api-key': 'my-key', data: 'value' };
      const result = SanitizeUtil.sanitize(input);
      expect(result['x-api-key']).toBe('[SANITIZED]');
      expect(result.data).toBe('value');
    });

    it('should not sanitize non-sensitive string values in nested objects', () => {
      const input = { config: { host: 'localhost', port: 5432 } };
      const result = SanitizeUtil.sanitize(input);
      expect(result.config.host).toBe('localhost');
    });
  });
});
