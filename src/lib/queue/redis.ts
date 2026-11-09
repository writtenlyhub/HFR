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
    });

    globalForRedis.redisClient.on("error", (err) => {
      console.error("[Redis] Client Error:", err.message);
    });
  }
  return globalForRedis.redisClient;
};

