import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

(async () => {
  await redisClient.connect();
})();

/**
 * Cache data with a specific key and optional expiration time.
 * @param key - The cache key.
 * @param value - The value to cache.
 * @param ttl - Time-to-live in seconds (default: 3600 seconds).
 */
export const cacheData = async (key: string, value: any, ttl: number = 3600) => {
  await redisClient.set(key, JSON.stringify(value), { EX: ttl });
};

/**
 * Retrieve cached data by key.
 * @param key - The cache key.
 * @returns The cached value or null if not found.
 */
export const getCachedData = async (key: string) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

/**
 * Delete cache keys.
 * @param keys - An array of keys to delete.
 */
export const deleteCacheKeys = async (keys: string[]) => {
  if (keys.length > 0) {
    await (redisClient.del as any)(...keys);
  }
};

/**
 * Delete cache keys matching a pattern.
 * @param pattern - The pattern to match keys.
 */
export const deleteCacheByPattern = async (pattern: string) => {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await (redisClient.del as any)(...keys);
  }
};

export default redisClient;