import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// ─── Queue Helpers ────────────────────────────────────────────────────────────

export const QUEUE_COUNTER_KEY = "afyacall:queue:counter";
export const QUEUE_DAILY_RESET_KEY = "afyacall:queue:last_reset";

export async function getNextQueueNumber(): Promise<number> {
  const today = new Date().toDateString();
  const lastReset = await redis.get(QUEUE_DAILY_RESET_KEY);

  if (lastReset !== today) {
    await redis.set(QUEUE_COUNTER_KEY, "0");
    await redis.set(QUEUE_DAILY_RESET_KEY, today);
  }

  return redis.incr(QUEUE_COUNTER_KEY);
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;

  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.pexpire(windowKey, windowMs);
  }

  const ttl = await redis.pttl(windowKey);
  const remaining = Math.max(0, maxRequests - count);

  return {
    allowed: count <= maxRequests,
    remaining,
    resetMs: ttl > 0 ? ttl : windowMs,
  };
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = 60
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}
