export const MESSAGE_PATTERNS = {
  AUTH_AUTHENTICATE: 'auth:authenticate',
} as const;

export const EVENT_PATTERNS = {
  USER_CREATED: 'user:created',
  USER_PASSWORD_RESET_REQUESTED: 'user:password_reset_requested',
  USER_PASSWORD_CHANGED: 'user:password_changed',
} as const;
