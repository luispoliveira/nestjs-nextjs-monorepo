import { Request } from 'express';
import { ContextUtil } from './context.util';

const makeRequest = (
  authHeader?: string,
  cookies: Record<string, string> = {},
): Request =>
  ({
    headers: authHeader ? { authorization: authHeader } : {},
    cookies,
  }) as unknown as Request;

describe('ContextUtil', () => {
  describe('extractToken', () => {
    it('should extract token from Bearer Authorization header', () => {
      const req = makeRequest('Bearer my-secret-token');
      expect(ContextUtil.extractToken(req)).toBe('my-secret-token');
    });

    it('should return null when Authorization header has no Bearer prefix', () => {
      const req = makeRequest('Basic dXNlcjpwYXNz');
      expect(ContextUtil.extractToken(req)).toBeNull();
    });

    it('should extract token from better-auth.session_token cookie', () => {
      const req = makeRequest(undefined, { 'better-auth.session_token': 'cookie-token' });
      expect(ContextUtil.extractToken(req)).toBe('cookie-token');
    });

    it('should extract token from __Secure-better-auth.session_token cookie', () => {
      const req = makeRequest(undefined, {
        '__Secure-better-auth.session_token': 'secure-cookie-token',
      });
      expect(ContextUtil.extractToken(req)).toBe('secure-cookie-token');
    });

    it('should return null when no token is present', () => {
      const req = makeRequest(undefined, {});
      expect(ContextUtil.extractToken(req)).toBeNull();
    });

    it('should prefer Authorization header over cookie', () => {
      const req = makeRequest('Bearer header-token', {
        'better-auth.session_token': 'cookie-token',
      });
      expect(ContextUtil.extractToken(req)).toBe('header-token');
    });
  });

  describe('newCorrelationId', () => {
    it('has the <timestamp>-<uuid> shape the request middleware uses', () => {
      expect(ContextUtil.newCorrelationId()).toMatch(/^\d{13,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('is unique per call', () => {
      expect(ContextUtil.newCorrelationId()).not.toBe(ContextUtil.newCorrelationId());
    });
  });
});
