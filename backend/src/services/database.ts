import {
  connectMongoDB,
  connectRedis,
  closeDatabaseConnections,
  checkDatabaseHealth,
} from '../config/database';
import { MigrationRunner } from '../migrations';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static isInitialized = false;

  /**
   * Initialize all database connections and run migrations
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Database service already initialized');
      return;
    }

    try {
      logger.info('Initializing database service...');

      // Connect to MongoDB
      await connectMongoDB();

      // Connect to Redis
      await connectRedis();

      // Run database migrations
      // await MigrationRunner.runMigrations();

      // Verify database health
      const health = await checkDatabaseHealth();
      if (!health.mongodb || !health.redis) {
        throw new Error(
          `Database health check failed: MongoDB=${health.mongodb}, Redis=${health.redis}`
        );
      }

      this.isInitialized = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown database connections
   */
  static async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Database service not initialized');
      return;
    }

    try {
      logger.info('Shutting down database service...');
      await closeDatabaseConnections();
      this.isInitialized = false;
      logger.info('Database service shutdown completed');
    } catch (error) {
      logger.error('Error during database service shutdown:', error);
      throw error;
    }
  }

  /**
   * Check if database service is initialized
   */
  static isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get database health status
   */
  static async getHealthStatus(): Promise<{
    mongodb: boolean;
    redis: boolean;
    overall: boolean;
  }> {
    const health = await checkDatabaseHealth();
    return {
      ...health,
      overall: health.mongodb && health.redis,
    };
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus() {
    return await MigrationRunner.getMigrationStatus();
  }

  /**
   * Run pending migrations manually
   */
  static async runMigrations(): Promise<void> {
    await MigrationRunner.runMigrations();
  }

  /**
   * Rollback last migration
   */
  static async rollbackLastMigration(): Promise<void> {
    await MigrationRunner.rollbackLastMigration();
  }
}
