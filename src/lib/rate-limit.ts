/**
 * In-memory sliding-window rate limiter.
 *
 * IMPORTANT: Works for single-instance deployments only.
 * Replace the store with a Redis adapter for multi-instance / serverless.
 * 
 * TODO: Redis Rate Limiter Integration
 * 
 * For production multi-instance deployments:
 * 
 * 1. Install ioredis: npm install ioredis
 * 2. Create RedisRateLimiter class implementing same interface
 * 3. Use MULTI/EXEC for atomic increment + TTL
 * 4. Example implementation:
 * 
 *    async check(key: string, limit: number, windowMs: number) {
 *      const now = Date.now();
 *      const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
 *      
 *      const multi = redis.multi();
 *      multi.incr(windowKey);
 *      multi.pttl(windowKey);
 *      const [[, count], [, ttl]] = await multi.exec();
 *      
 *      if (ttl === -1) await redis.pexpire(windowKey, windowMs);
 *      
 *      return {
 *        allowed: count <= limit,
 *        remaining: Math.max(0, limit - count),
 *        retryAfterMs: count > limit ? ttl : 0,
 *      };
 *    }
 * 
 * 5. Use env variable REDIS_URL to conditionally select implementation
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodically evict expired entries to avoid unbounded memory growth
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    }
  }

  /**
   * Check whether `key` is within rate limits.
   *
   * @param key     Unique identifier (e.g. `chat:<userId>:<wsId>`)
   * @param limit   Max allowed requests in the window
   * @param windowMs  Window duration in milliseconds
   */
  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.resetAt - now,
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      retryAfterMs: 0,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry && now >= entry.resetAt) this.store.delete(key);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

/* ── Singleton – survives hot-reload in dev ───────────────── */

const globalWithRl = globalThis as typeof globalThis & {
  rateLimiter?: RateLimiter;
};

export const rateLimiter: RateLimiter =
  globalWithRl.rateLimiter ?? new RateLimiter();

if (process.env.NODE_ENV !== 'production') {
  globalWithRl.rateLimiter = rateLimiter;
}

/* ── Preset configurations ────────────────────────────────── */

export const RATE_LIMITS = {
  /** 5 messages per 10 seconds */
  CHAT_MESSAGE: { limit: 5, windowMs: 10_000 },
  /** 60 requests per minute */
  API_GENERAL: { limit: 60, windowMs: 60_000 },
  /** 10 attempts per 5 minutes */
  AUTH_ATTEMPT: { limit: 10, windowMs: 300_000 },
  /** 5 workspaces per hour */
  WORKSPACE_CREATE: { limit: 5, windowMs: 3_600_000 },
} as const;
