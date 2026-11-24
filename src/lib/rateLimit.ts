import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __campusfixRateLimits?: Map<string, MemoryBucket>;
  __campusfixRedisClient?: Redis;
  __campusfixRedisUrl?: string;
  __campusfixRedisConnectPromise?: Promise<boolean> | null;
};

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

export function normalizeRedisUrl(raw?: string): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^redis-cli\s+(?:--tls\s+)?(?:-u\s+)?/i, '')
    .trim();
  if (!cleaned || !/^rediss?:\/\//i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export function resetRateLimitStore(): void {
  globalForRateLimit.__campusfixRateLimits?.clear();
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  return 'unknown';
}

function checkMemoryRateLimit(options: RateLimitOptions, nowMs = Date.now()): RateLimitResult {
  const store = (() => {
    if (!globalForRateLimit.__campusfixRateLimits) {
      globalForRateLimit.__campusfixRateLimits = new Map<string, MemoryBucket>();
    }
    return globalForRateLimit.__campusfixRateLimits;
  })();

  // Prune expired buckets occasionally to bound memory usage.
  if (store.size > 1000) {
    for (const [bucketKey, entry] of store.entries()) {
      if (entry.resetAt <= nowMs) {
        store.delete(bucketKey);
      }
    }
  }

  const existing = store.get(options.key);
  const windowMs = options.windowSeconds * 1000;

  if (!existing || existing.resetAt <= nowMs) {
    const resetAt = nowMs + windowMs;
    store.set(options.key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
      retryAfter: 0,
    };
  }

  existing.count += 1;
  store.set(options.key, existing);

  const allowed = existing.count <= options.limit;
  const remaining = Math.max(0, options.limit - existing.count);
  const retryAfter = allowed ? 0 : Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000));

  return {
    allowed,
    remaining,
    resetAt: existing.resetAt,
    retryAfter,
  };
}

function isRedisReady(client: Redis): boolean {
  return client.status === 'ready';
}

async function getRedisClient(redisUrl: string): Promise<Redis | null> {
  const existing = globalForRateLimit.__campusfixRedisClient;
  if (
    existing &&
    globalForRateLimit.__campusfixRedisUrl === redisUrl &&
    existing.status !== 'end'
  ) {
    if (isRedisReady(existing)) return existing;
    if (globalForRateLimit.__campusfixRedisConnectPromise) {
      const ok = await globalForRateLimit.__campusfixRedisConnectPromise;
      return ok && isRedisReady(existing) ? existing : null;
    }
    if (existing.status === 'wait') {
      const connectPromise = existing
        .connect()
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          globalForRateLimit.__campusfixRedisConnectPromise = null;
        });
      globalForRateLimit.__campusfixRedisConnectPromise = connectPromise;
      const ok = await connectPromise;
      return ok && isRedisReady(existing) ? existing : null;
    }
    return null;
  }

  if (existing) {
    try {
      existing.disconnect();
    } catch {
      // Ignore cleanup failures
    }
  }

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 1500,
    enableOfflineQueue: false,
    retryStrategy: (times) => (times <= 2 ? 250 : null),
  });

  client.on('error', () => {
    // Prevent unhandled 'error' events from crashing Node; checkRateLimit falls back safely.
  });

  globalForRateLimit.__campusfixRedisClient = client;
  globalForRateLimit.__campusfixRedisUrl = redisUrl;

  const connectPromise = client
    .connect()
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      globalForRateLimit.__campusfixRedisConnectPromise = null;
    });
  globalForRateLimit.__campusfixRedisConnectPromise = connectPromise;

  const ok = await connectPromise;
  return ok && isRedisReady(client) ? client : null;
}

async function checkRedisTcpRateLimit(
  redisUrl: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const redisKey = `cf:rl:${options.key}`;
  try {
    const client = await getRedisClient(redisUrl);
    if (!client) return null;

    const raw = (await client.eval(
      RATE_LIMIT_LUA,
      1,
      redisKey,
      String(options.windowSeconds)
    )) as [number | string, number | string];

    const count = Number(raw?.[0] ?? 1);
    const ttlRaw = Number(raw?.[1] ?? options.windowSeconds);
    const ttlSeconds = ttlRaw > 0 ? ttlRaw : options.windowSeconds;
    const allowed = count <= options.limit;

    return {
      allowed,
      remaining: Math.max(0, options.limit - count),
      resetAt: Date.now() + ttlSeconds * 1000,
      retryAfter: allowed ? 0 : ttlSeconds,
    };
  } catch {
    return null;
  }
}

async function checkUpstashRateLimit(
  url: string,
  token: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const cleanUrl = url.replace(/\/+$/, '');
  const redisKey = `cf:rl:${options.key}`;

  try {
    const response = await fetch(`${cleanUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, String(options.windowSeconds), 'NX'],
        ['TTL', redisKey],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const results = (await response.json()) as Array<{ result?: number }>;
    const count = Number(results?.[0]?.result ?? 1);
    const ttlRaw = Number(results?.[2]?.result ?? options.windowSeconds);
    const ttlSeconds = ttlRaw > 0 ? ttlRaw : options.windowSeconds;
    const allowed = count <= options.limit;

    return {
      allowed,
      remaining: Math.max(0, options.limit - count),
      resetAt: Date.now() + ttlSeconds * 1000,
      retryAfter: allowed ? 0 : ttlSeconds,
    };
  } catch {
    return null;
  }
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redisUrl = normalizeRedisUrl(process.env.REDIS_URL);
  if (redisUrl) {
    const tcpResult = await checkRedisTcpRateLimit(redisUrl, options);
    if (tcpResult) return tcpResult;
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (upstashUrl && upstashToken) {
    const remoteResult = await checkUpstashRateLimit(upstashUrl, upstashToken, options);
    if (remoteResult) return remoteResult;
  }

  return checkMemoryRateLimit(options);
}

export function rateLimitErrorResponse(
  retryAfter: number,
  format: 'api' | 'simple' = 'api'
): NextResponse {
  const safeRetryAfter = Math.max(1, Math.ceil(retryAfter));
  const body =
    format === 'simple'
      ? { error: 'Too many requests, please try again later.' }
      : {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later.',
          },
        };

  return NextResponse.json(body, {
    status: 429,
    headers: {
      'Retry-After': String(safeRetryAfter),
    },
  });
}
