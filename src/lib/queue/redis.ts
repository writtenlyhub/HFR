import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

export const getRedisClient = (): Redis => {
  if (!globalForRedis.redisClient) {
    globalForRedis.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 3) return null; // Stop infinite reconnect spam when Redis is not running
        return Math.min(times * 1000, 3000);
      },
      lazyConnect: true,
    });

    globalForRedis.redisClient.on("error", (err) => {
      // Suppress spam in local dev if Redis is offline
      if (err.message.includes("ECONNREFUSED")) {
        return;
      }
      console.error("[Redis] Client Error:", err.message);
    });
  }
  return globalForRedis.redisClient;
};

