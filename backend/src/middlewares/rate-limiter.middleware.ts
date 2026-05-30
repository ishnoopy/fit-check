import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { StatusCodes } from "http-status-codes";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

let redisConnectionPromise: Promise<void> | null = null;

redisClient.on("error", (error) => {
  console.error("Rate limiter Redis error:", error);
});

const ensureRedisConnection = async () => {
  if (redisClient.isOpen) {
    return;
  }

  if (!redisConnectionPromise) {
    redisConnectionPromise = redisClient.connect().then(() => {
      console.log("Rate limiter Redis connected");
    }).catch((error) => {
      redisConnectionPromise = null;
      throw error;
    });
  }

  await redisConnectionPromise;
};

const redisStoreClient = {
  pTTL: async (key: string) => {
    await ensureRedisConnection();
    return redisClient.pTTL(key);
  },
  pExpire: async (key: string, milliseconds: number) => {
    await ensureRedisConnection();
    return redisClient.pExpire(key, milliseconds);
  },
  incr: async (key: string) => {
    await ensureRedisConnection();
    return redisClient.incr(key);
  },
  decr: async (key: string) => {
    await ensureRedisConnection();
    return redisClient.decr(key);
  },
  del: async (key: string) => {
    await ensureRedisConnection();
    return redisClient.del(key);
  },
  get: async (key: string) => {
    await ensureRedisConnection();
    return redisClient.get(key);
  },
};

const createRedisStore = (prefix: string) => {
  let windowMs = 15 * 60 * 1000;
  const redisPrefix = `rate-limit:${prefix}:`;

  const prefixKey = (key: string) => `${redisPrefix}${key}`;

  return {
    init: (options: { windowMs: number }) => {
      windowMs = options.windowMs;
    },
    increment: async (key: string) => {
      const redisKey = prefixKey(key);
      const totalHits = await redisStoreClient.incr(redisKey);
      const timeToExpire = await redisStoreClient.pTTL(redisKey);

      if (timeToExpire <= 0) {
        await redisStoreClient.pExpire(redisKey, windowMs);
        return {
          totalHits,
          resetTime: new Date(Date.now() + windowMs),
        };
      }

      return {
        totalHits,
        resetTime: new Date(Date.now() + timeToExpire),
      };
    },
    decrement: async (key: string) => {
      await redisStoreClient.decr(prefixKey(key));
    },
    resetKey: async (key: string) => {
      await redisStoreClient.del(prefixKey(key));
    },
    get: async (key: string) => {
      const redisKey = prefixKey(key);
      const [totalHits, timeToExpire] = await Promise.all([
        redisStoreClient.get(redisKey),
        redisStoreClient.pTTL(redisKey),
      ]);

      if (!totalHits || timeToExpire <= 0) {
        return undefined;
      }

      return {
        totalHits: Number.parseInt(totalHits, 10),
        resetTime: new Date(Date.now() + timeToExpire),
      };
    },
  };
};

// NOTE: x-forwarded-for and x-real-ip are trusted here unconditionally.
// This is safe only when a trusted reverse proxy (nginx, AWS ALB, Cloudflare, etc.)
// is always in front of this service. If the backend is ever exposed directly
// to the internet, clients can spoof these headers to bypass rate limiting.
const getClientIp = (c: Context): string => {
  const forwardedFor = c.req.header("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = c.req.header("x-real-ip");

  if (realIp) {
    return realIp;
  }

  // Fallback to direct connection IP (local dev)
  try {
    const connInfo = getConnInfo(c);
    if (connInfo?.remote?.address) {
      return connInfo.remote.address;
    }
  } catch {
    // connInfo might not be available in all contexts
  }
  return "unknown";
};

// General API rate limiter - 500 requests per 15 minutes
export const generalRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  keyGenerator: (c) => getClientIp(c),
  store: createRedisStore("general"),
  handler: (c) => {
    return c.json(
      {
        error: "Too many requests",
        message: "You have exceeded the rate limit. Please try again later.",
        retryAfter: `${c.res.headers.get("Retry-After")} seconds`,
      },
      StatusCodes.TOO_MANY_REQUESTS,
    );
  },
});

// Auth rate limiter - 20 requests per 15 minutes
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  keyGenerator: (c) => getClientIp(c),
  store: createRedisStore("auth"),
  handler: (c) => {
    return c.json(
      {
        error: "Too many authentication attempts",
        message: "You have exceeded the authentication rate limit. Please try again after 15 minutes.",
        retryAfter: `${c.res.headers.get("Retry-After")} seconds`,
      },
      StatusCodes.TOO_MANY_REQUESTS,
    );
  },
});

// Moderate rate limiter - 100 requests per 15 minutes
export const moderateRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  keyGenerator: (c) => getClientIp(c),
  store: createRedisStore("moderate"),
  handler: (c) => {
    return c.json(
      {
        error: "Too many requests",
        message: "You have exceeded the rate limit for this operation.",
        retryAfter: `${c.res.headers.get("Retry-After")} seconds`,
      },
      StatusCodes.TOO_MANY_REQUESTS,
    );
  },
});

export const connectRateLimiterRedis = async () => {
  await ensureRedisConnection();
};

export const closeRedisConnection = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};
