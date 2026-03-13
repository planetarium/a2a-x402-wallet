// In-memory fixed-window rate limiter.
// Single-instance only — same caveat as device-store: replace with a
// Redis/Upstash-backed implementation for horizontally-scaled deployments.

import { NextRequest, NextResponse } from 'next/server';

interface Entry {
  count: number;
  resetAt: number; // Unix ms
}

class MemoryRateLimiter {
  private readonly map = new Map<string, Entry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    // Purge expired entries every window interval
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.map) {
        if (entry.resetAt < now) this.map.delete(key);
      }
    }, windowMs).unref();
  }

  /** Returns whether the request is allowed and the remaining quota. */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.map.get(key);

    if (!entry || entry.resetAt < now) {
      const resetAt = now + this.windowMs;
      this.map.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.limit - 1, resetAt };
    }

    entry.count += 1;
    const remaining = Math.max(0, this.limit - entry.count);
    return { allowed: entry.count <= this.limit, remaining, resetAt: entry.resetAt };
  }
}

// One limiter instance per logical endpoint.
// /start              — 10 req/min: creating sessions is the most abusable action
// /complete           — 10 req/min: same as start
// /poll               — 60 req/min: CLI polls every ~2 s, allow up to 1 req/s with headroom
// /sign               — 30 req/min: authenticated signing, rate-limit per token holder
// /faucet             —  3 req/hr: prevent draining; real balance gate provides secondary guard
// a2a /start          — 10 req/min: same as /start
// a2a /poll           — 60 req/min: same as /poll
// a2a /complete       — 10 req/min: same as /complete
// /api/device/authorize — 10 req/min: RFC 8628 session creation
// /api/device/token     — 60 req/min: RFC 8628 polling (same cadence as /poll)
// /api/device/complete  — 10 req/min: RFC 8628 browser callback
export const startLimiter          = new MemoryRateLimiter(10,    60_000);
export const completeLimiter       = new MemoryRateLimiter(10,    60_000);
export const pollLimiter           = new MemoryRateLimiter(60,    60_000);
export const signLimiter           = new MemoryRateLimiter(30,    60_000);
export const faucetLimiter         = new MemoryRateLimiter( 3, 3_600_000);
export const a2aStartLimiter       = new MemoryRateLimiter(10,    60_000);
export const a2aPollLimiter        = new MemoryRateLimiter(60,    60_000);
export const a2aCompleteLimiter    = new MemoryRateLimiter(10,    60_000);
export const cliV2AuthorizeLimiter = new MemoryRateLimiter(10,    60_000);
export const cliV2TokenLimiter     = new MemoryRateLimiter(60,    60_000);
export const cliV2CompleteLimiter  = new MemoryRateLimiter(10,    60_000);

/** Extract the best available client IP from a Next.js request. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Build a 429 response with standard Retry-After and X-RateLimit-Reset headers. */
export function tooManyRequests(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}
