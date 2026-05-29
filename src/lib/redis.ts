import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

/**
 * Lazily-initialized Upstash Redis REST client.
 * Returns null when env vars are absent (e.g. local dev without Upstash).
 */
export function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  _redis = new Redis({ url, token });
  return _redis;
}

export function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}