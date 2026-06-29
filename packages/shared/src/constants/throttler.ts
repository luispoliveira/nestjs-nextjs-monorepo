export const THROTTLE_TIERS = {
  default: { limit: 60, ttl: 60_000 },
  strict: { limit: 10, ttl: 60_000 },
} as const;
