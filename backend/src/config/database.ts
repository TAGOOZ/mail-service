import mongoose from 'mongoose';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// MongoDB connection configuration
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/tempmail';

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    });

    logger.info('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', error => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Redis client instance
let redisClient: ReturnType<typeof createClient> | null = null;

// Redis connection configuration
export const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: retries => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return false;
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    // Handle Redis events
    redisClient.on('error', error => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready for operations');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};

// Get Redis client instance
export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

// Graceful shutdown for database connections
export const closeDatabaseConnections = async (): Promise<void> => {
  try {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }

    // Close Redis connection
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
};

// Database health check
export const checkDatabaseHealth = async (): Promise<{
  mongodb: boolean;
  redis: boolean;
}> => {
  const health = {
    mongodb: false,
    redis: false,
  };

  try {
    // Check MongoDB health
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.mongodb = true;
    }
  } catch (error) {
    logger.error('MongoDB health check failed:', error);
  }

  try {
    // Check Redis health
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      health.redis = true;
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }

  return health;
};
