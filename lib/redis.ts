import { createClient } from "redis"

const globalForRedis = global as unknown as { redisClient: ReturnType<typeof createClient> }

export const redis =
  globalForRedis.redisClient ||
  createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis
}

// Connect to redis automatically
if (!redis.isOpen) {
  redis.connect().catch((err) => console.error("Redis Connection Failed", err))
}
