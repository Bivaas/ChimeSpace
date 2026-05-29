/**
 * Rate limiter with two backends:
 *   - Upstash Redis (production / multi-instance) — used when UPSTASH_REDIS_REST_*
 *     env vars are set.
 *   - In-memory sliding window (local dev / single-instance fallback).
 *
 * Public API is synchronous-looking (returns a Promise-or-value union via
 * the `RateLimitResult | Promise<RateLimitResult>` type) so callers can `await`
 * uniformly. All existing callers already do `const rl = await rateLimiter.check(...)`
 * or treat the result as a value — since we always return a Promise from `check()`,
 * `await` works in both cases.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedis, hasRedis } from '@/lib/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/* ── Preset configurations ────────────────────────────────── */

export const RATE_LIMITS = {
  /** 5 messages per 10 seconds */
  CHAT_MESSAGE:     { limit: 5,  windowMs: 10_000 },
  /** 60 requests per minute */
  API_GENERAL:      { limit: 60, windowMs: 60_000 },
  /** 10 attempts per 5 minutes */
  AUTH_ATTEMPT:     { limit: 10, windowMs: 300_000 },
  /** 5 workspaces per hour */
  WORKSPACE_CREATE: { limit: 5,  windowMs: 3_600_000 },
  /** 20 image uploads per minute (each one costs a Cloudinary call) */
  GALLERY_UPLOAD:   { limit: 20, windowMs: 60_000 },
} as const;

/* ── In-memory backend (fallback) ─────────────────────────── */

interface MemEntry { count: number; resetAt: number }

class MemoryLimiter {
  private store = new Map<string, MemEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    }
  }

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
    }
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
    }
    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
  }

  private cleanup() {
    const now = Date.now();
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry && now >= entry.resetAt) this.store.delete(key);
    }
  }

  destroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

/* ── Upstash backend ──────────────────────────────────────── */

/**
 * Cache of Ratelimit instances per (limit, windowMs) tuple.
 * @upstash/ratelimit is configured per-window-config, not per-request.
 */
const upstashCache = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${limit}:${windowMs}`;
  let rl = upstashCache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: 'chimespace:rl',
    });
    upstashCache.set(cacheKey, rl);
  }
  return rl;
}

/* ── Unified facade ───────────────────────────────────────── */

class HybridLimiter {
  private memory = new MemoryLimiter();

  async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    if (hasRedis()) {
      const upstash = getUpstashLimiter(limit, windowMs);
      if (upstash) {
        try {
          const r = await upstash.limit(key);
          return {
            allowed: r.success,
            remaining: r.remaining,
            retryAfterMs: r.success ? 0 : Math.max(0, r.reset - Date.now()),
          };
        } catch (err) {
          // Network blip → fail open via in-memory fallback rather than 500-ing
          console.error('Upstash rate-limit error, falling back to memory:', err);
        }
      }
    }
    return this.memory.check(key, limit, windowMs);
  }
}

/* ── Singleton ────────────────────────────────────────────── */

const globalWithRl = globalThis as typeof globalThis & {
  rateLimiter?: HybridLimiter;
};

export const rateLimiter: HybridLimiter =
  globalWithRl.rateLimiter ?? new HybridLimiter();

if (process.env.NODE_ENV !== 'production') {
  globalWithRl.rateLimiter = rateLimiter;
}