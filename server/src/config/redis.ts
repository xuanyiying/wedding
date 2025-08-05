import Redis from 'ioredis';
import { config } from './config';
import { logger } from '../utils/logger';

// Redis 客户端实例
export let redisClient: Redis;

// Redis 连接配置
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  retryDelayOnFailover: config.redis.retryDelayOnFailover,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300,
  retryDelayOnClusterFailover: 100,
};

// 连接 Redis
export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = new Redis({
      ...redisConfig,
      password: redisConfig.password || '', // 确保 password 不为 undefined
    });

    // 连接事件监听
    redisClient.on('connect', () => {
      logger.info('Redis client connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready to use');
    });

    redisClient.on('error', error => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
    });

    // 建立连接
    await redisClient.connect();

    // 测试连接
    await redisClient.ping();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

// 关闭 Redis 连接
export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
};

// Redis 健康检查
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    if (!redisClient) {
      return false;
    }
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};

// Redis 缓存工具类
export class RedisCache {
  // 设置缓存
  static async set(key: string, value: string | object, ttl?: number): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await redisClient.setex(key, ttl, serializedValue);
      } else {
        await redisClient.set(key, serializedValue);
      }
    } catch (error) {
      logger.error(`Failed to set cache for key ${key}:`, error);
      throw error;
    }
  }

  // 获取缓存
  static async get<T = string>(key: string, parseJson = false): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (value === null) {
        return null;
      }
      return parseJson ? JSON.parse(value) : (value as T);
    } catch (error) {
      logger.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  // 删除缓存
  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Failed to delete cache for key ${key}:`, error);
      throw error;
    }
  }

  // 检查键是否存在
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check existence for key ${key}:`, error);
      return false;
    }
  }

  // 设置过期时间
  static async expire(key: string, ttl: number): Promise<void> {
    try {
      await redisClient.expire(key, ttl);
    } catch (error) {
      logger.error(`Failed to set expiration for key ${key}:`, error);
      throw error;
    }
  }

  // 获取剩余过期时间
  static async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error(`Failed to get TTL for key ${key}:`, error);
      return -1;
    }
  }

  // 批量删除
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error(`Failed to delete keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  // 增加计数器
  static async incr(key: string): Promise<number> {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error(`Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  // 减少计数器
  static async decr(key: string): Promise<number> {
    try {
      return await redisClient.decr(key);
    } catch (error) {
      logger.error(`Failed to decrement key ${key}:`, error);
      throw error;
    }
  }
}
