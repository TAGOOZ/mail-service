import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { Mailbox } from '../models/Mailbox';
import { Mail } from '../models/Mail';
import { getRedisClient } from '../config/database';
import mongoose from 'mongoose';

export interface CleanupConfig {
  enabled: boolean;
  schedules: {
    expiredMailboxes: string; // cron expression for expired mailboxes cleanup
    oldMails: string; // cron expression for old mails cleanup
    orphanedData: string; // cron expression for orphaned data cleanup
    redisCleanup: string; // cron expression for Redis cleanup
  };
  retentionPolicies: {
    expiredMailboxGracePeriod: number; // hours to keep expired mailboxes
    oldMailsRetentionDays: number; // days to keep old mails
    logRetentionDays: number; // days to keep logs
    sessionRetentionHours: number; // hours to keep inactive sessions
  };
  batchSize: number; // number of records to process in each batch
}

export interface CleanupResult {
  type: string;
  processed: number;
  deleted: number;
  errors: number;
  duration: number;
  timestamp: Date;
}

export class DataCleanupService {
  private static instance: DataCleanupService;
  private config: CleanupConfig;
  private cleanupJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  private constructor() {
    this.config = {
      enabled: process.env.CLEANUP_ENABLED !== 'false',
      schedules: {
        expiredMailboxes:
          process.env.CLEANUP_EXPIRED_MAILBOXES_SCHEDULE || '*/15 * * * *', // Every 15 minutes
        oldMails: process.env.CLEANUP_OLD_MAILS_SCHEDULE || '0 3 * * *', // Daily at 3 AM
        orphanedData: process.env.CLEANUP_ORPHANED_DATA_SCHEDULE || '0 4 * * 0', // Weekly on Sunday at 4 AM
        redisCleanup: process.env.CLEANUP_REDIS_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      },
      retentionPolicies: {
        expiredMailboxGracePeriod: parseInt(
          process.env.EXPIRED_MAILBOX_GRACE_PERIOD || '2'
        ), // 2 hours
        oldMailsRetentionDays: parseInt(
          process.env.OLD_MAILS_RETENTION_DAYS || '7'
        ), // 7 days
        logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30'), // 30 days
        sessionRetentionHours: parseInt(
          process.env.SESSION_RETENTION_HOURS || '24'
        ), // 24 hours
      },
      batchSize: parseInt(process.env.CLEANUP_BATCH_SIZE || '100'),
    };
  }

  static getInstance(): DataCleanupService {
    if (!DataCleanupService.instance) {
      DataCleanupService.instance = new DataCleanupService();
    }
    return DataCleanupService.instance;
  }

  /**
   * 启动数据清理调度器
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Data cleanup service is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('Data cleanup service is already running');
      return;
    }

    try {
      // 创建各种清理任务
      this.createCleanupJob(
        'expiredMailboxes',
        this.config.schedules.expiredMailboxes,
        () => this.cleanupExpiredMailboxes()
      );

      this.createCleanupJob('oldMails', this.config.schedules.oldMails, () =>
        this.cleanupOldMails()
      );

      this.createCleanupJob(
        'orphanedData',
        this.config.schedules.orphanedData,
        () => this.cleanupOrphanedData()
      );

      this.createCleanupJob(
        'redisCleanup',
        this.config.schedules.redisCleanup,
        () => this.cleanupRedisData()
      );

      // 启动所有任务
      this.cleanupJobs.forEach((job, name) => {
        job.start();
        logger.info(`Started cleanup job: ${name}`);
      });

      this.isRunning = true;
      logger.info('Data cleanup service started successfully');

      // 启动时执行一次过期邮箱清理
      await this.cleanupExpiredMailboxes();
    } catch (error) {
      logger.error('Failed to start data cleanup service:', error);
      throw error;
    }
  }

  /**
   * 停止数据清理调度器
   */
  stop(): void {
    this.cleanupJobs.forEach((job, name) => {
      job.stop();
      job.destroy();
      logger.info(`Stopped cleanup job: ${name}`);
    });

    this.cleanupJobs.clear();
    this.isRunning = false;
    logger.info('Data cleanup service stopped');
  }

  /**
   * 创建清理任务
   */
  private createCleanupJob(
    name: string,
    schedule: string,
    task: () => Promise<CleanupResult>
  ): void {
    const job = cron.schedule(
      schedule,
      async () => {
        try {
          const result = await task();
          logger.info(`Cleanup job '${name}' completed`, {
            processed: result.processed,
            deleted: result.deleted,
            errors: result.errors,
            duration: result.duration,
          });
        } catch (error) {
          logger.error(`Cleanup job '${name}' failed:`, error);
        }
      },
      {
        timezone: 'UTC',
      }
    );

    this.cleanupJobs.set(name, job);
  }

  /**
   * 清理过期邮箱
   */
  async cleanupExpiredMailboxes(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      type: 'expiredMailboxes',
      processed: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date(),
    };

    try {
      logger.info('Starting expired mailboxes cleanup');

      // 计算过期时间（包含宽限期）
      const gracePeriodMs =
        this.config.retentionPolicies.expiredMailboxGracePeriod *
        60 *
        60 *
        1000;
      const cutoffTime = new Date(Date.now() - gracePeriodMs);

      // 分批处理过期邮箱
      let hasMore = true;

      while (hasMore) {
        const expiredMailboxes = await Mailbox.find({
          expiresAt: { $lt: cutoffTime },
          isActive: true,
        }).limit(this.config.batchSize);

        if (expiredMailboxes.length === 0) {
          hasMore = false;
          break;
        }

        result.processed += expiredMailboxes.length;

        for (const mailbox of expiredMailboxes) {
          try {
            // 删除邮箱相关的邮件
            await Mail.deleteMany({ mailboxId: mailbox.id });

            // 删除 Redis 中的会话数据
            const redisClient = getRedisClient();
            const sessionKeys = await redisClient.keys(
              `session:${mailbox.id}:*`
            );
            if (sessionKeys.length > 0) {
              await redisClient.del(sessionKeys);
            }

            // 标记邮箱为非活跃状态
            mailbox.isActive = false;
            await mailbox.save();

            result.deleted++;

            logger.debug(`Cleaned up expired mailbox: ${mailbox.address}`);
          } catch (error) {
            result.errors++;
            logger.error(
              `Failed to cleanup mailbox ${mailbox.address}:`,
              error
            );
          }
        }

        // 避免长时间运行阻塞其他操作
        if (expiredMailboxes.length === this.config.batchSize) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(
        `Expired mailboxes cleanup completed: ${result.deleted} mailboxes cleaned`
      );
    } catch (error) {
      logger.error('Expired mailboxes cleanup failed:', error);
      result.errors++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 清理旧邮件
   */
  async cleanupOldMails(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      type: 'oldMails',
      processed: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date(),
    };

    try {
      logger.info('Starting old mails cleanup');

      // 计算保留截止时间
      const retentionMs =
        this.config.retentionPolicies.oldMailsRetentionDays *
        24 *
        60 *
        60 *
        1000;
      const cutoffTime = new Date(Date.now() - retentionMs);

      // 分批删除旧邮件
      let hasMore = true;

      while (hasMore) {
        const oldMails = await Mail.find({
          receivedAt: { $lt: cutoffTime },
        }).limit(this.config.batchSize);

        if (oldMails.length === 0) {
          hasMore = false;
          break;
        }

        result.processed += oldMails.length;

        try {
          const mailIds = oldMails.map(mail => mail._id);
          const deleteResult = await Mail.deleteMany({ _id: { $in: mailIds } });
          result.deleted += deleteResult.deletedCount || 0;

          logger.debug(`Deleted ${deleteResult.deletedCount} old mails`);
        } catch (error) {
          result.errors++;
          logger.error('Failed to delete batch of old mails:', error);
        }

        // 避免长时间运行阻塞其他操作
        if (oldMails.length === this.config.batchSize) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(
        `Old mails cleanup completed: ${result.deleted} mails deleted`
      );
    } catch (error) {
      logger.error('Old mails cleanup failed:', error);
      result.errors++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 清理孤立数据
   */
  async cleanupOrphanedData(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      type: 'orphanedData',
      processed: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date(),
    };

    try {
      logger.info('Starting orphaned data cleanup');

      // 清理没有对应邮箱的邮件
      const orphanedMailsResult = await this.cleanupOrphanedMails();
      result.processed += orphanedMailsResult.processed;
      result.deleted += orphanedMailsResult.deleted;
      result.errors += orphanedMailsResult.errors;

      // 清理无效的邮箱记录
      const invalidMailboxesResult = await this.cleanupInvalidMailboxes();
      result.processed += invalidMailboxesResult.processed;
      result.deleted += invalidMailboxesResult.deleted;
      result.errors += invalidMailboxesResult.errors;

      logger.info(
        `Orphaned data cleanup completed: ${result.deleted} records cleaned`
      );
    } catch (error) {
      logger.error('Orphaned data cleanup failed:', error);
      result.errors++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 清理孤立邮件
   */
  private async cleanupOrphanedMails(): Promise<{
    processed: number;
    deleted: number;
    errors: number;
  }> {
    const result = { processed: 0, deleted: 0, errors: 0 };

    try {
      // 使用聚合查询找到没有对应邮箱的邮件
      const orphanedMails = await Mail.aggregate([
        {
          $lookup: {
            from: 'mailboxes',
            localField: 'mailboxId',
            foreignField: '_id',
            as: 'mailbox',
          },
        },
        {
          $match: {
            mailbox: { $size: 0 },
          },
        },
        {
          $limit: this.config.batchSize,
        },
      ]);

      result.processed = orphanedMails.length;

      if (orphanedMails.length > 0) {
        const mailIds = orphanedMails.map(mail => mail._id);
        const deleteResult = await Mail.deleteMany({ _id: { $in: mailIds } });
        result.deleted = deleteResult.deletedCount || 0;

        logger.debug(`Deleted ${result.deleted} orphaned mails`);
      }
    } catch (error) {
      result.errors++;
      logger.error('Failed to cleanup orphaned mails:', error);
    }

    return result;
  }

  /**
   * 清理无效邮箱记录
   */
  private async cleanupInvalidMailboxes(): Promise<{
    processed: number;
    deleted: number;
    errors: number;
  }> {
    const result = { processed: 0, deleted: 0, errors: 0 };

    try {
      // 查找已过期且非活跃的邮箱记录
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7天前

      const invalidMailboxes = await Mailbox.find({
        isActive: false,
        expiresAt: { $lt: cutoffTime },
      }).limit(this.config.batchSize);

      result.processed = invalidMailboxes.length;

      if (invalidMailboxes.length > 0) {
        const mailboxIds = invalidMailboxes.map(mailbox => mailbox._id);
        const deleteResult = await Mailbox.deleteMany({
          _id: { $in: mailboxIds },
        });
        result.deleted = deleteResult.deletedCount || 0;

        logger.debug(`Deleted ${result.deleted} invalid mailbox records`);
      }
    } catch (error) {
      result.errors++;
      logger.error('Failed to cleanup invalid mailboxes:', error);
    }

    return result;
  }

  /**
   * 清理 Redis 数据
   */
  async cleanupRedisData(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      type: 'redisCleanup',
      processed: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date(),
    };

    try {
      logger.info('Starting Redis data cleanup');

      const redisClient = getRedisClient();

      // 清理过期会话
      const sessionResult = await this.cleanupExpiredSessions(redisClient);
      result.processed += sessionResult.processed;
      result.deleted += sessionResult.deleted;
      result.errors += sessionResult.errors;

      // 清理临时缓存
      const cacheResult = await this.cleanupTemporaryCache(redisClient);
      result.processed += cacheResult.processed;
      result.deleted += cacheResult.deleted;
      result.errors += cacheResult.errors;

      logger.info(`Redis cleanup completed: ${result.deleted} keys cleaned`);
    } catch (error) {
      logger.error('Redis cleanup failed:', error);
      result.errors++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 清理过期会话
   */
  private async cleanupExpiredSessions(
    redisClient: any
  ): Promise<{ processed: number; deleted: number; errors: number }> {
    const result = { processed: 0, deleted: 0, errors: 0 };

    try {
      const sessionKeys = await redisClient.keys('session:*');
      result.processed = sessionKeys.length;

      const cutoffTime =
        Date.now() -
        this.config.retentionPolicies.sessionRetentionHours * 60 * 60 * 1000;

      for (const key of sessionKeys) {
        try {
          const sessionData = await redisClient.get(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (
              session.lastAccessAt &&
              new Date(session.lastAccessAt).getTime() < cutoffTime
            ) {
              await redisClient.del(key);
              result.deleted++;
            }
          }
        } catch (error) {
          result.errors++;
          logger.error(`Failed to process session key ${key}:`, error);
        }
      }
    } catch (error) {
      result.errors++;
      logger.error('Failed to cleanup expired sessions:', error);
    }

    return result;
  }

  /**
   * 清理临时缓存
   */
  private async cleanupTemporaryCache(
    redisClient: any
  ): Promise<{ processed: number; deleted: number; errors: number }> {
    const result = { processed: 0, deleted: 0, errors: 0 };

    try {
      // 清理临时缓存键
      const tempKeys = await redisClient.keys('temp:*');
      const cacheKeys = await redisClient.keys('cache:*');

      const allTempKeys = [...tempKeys, ...cacheKeys];
      result.processed = allTempKeys.length;

      // 删除所有临时键（它们应该有TTL，但以防万一）
      if (allTempKeys.length > 0) {
        const deleteResult = await redisClient.del(allTempKeys);
        result.deleted = deleteResult;
      }
    } catch (error) {
      result.errors++;
      logger.error('Failed to cleanup temporary cache:', error);
    }

    return result;
  }

  /**
   * 手动触发特定类型的清理
   */
  async triggerCleanup(
    type: 'expiredMailboxes' | 'oldMails' | 'orphanedData' | 'redisCleanup'
  ): Promise<CleanupResult> {
    logger.info(`Manual cleanup triggered: ${type}`);

    switch (type) {
      case 'expiredMailboxes':
        return await this.cleanupExpiredMailboxes();
      case 'oldMails':
        return await this.cleanupOldMails();
      case 'orphanedData':
        return await this.cleanupOrphanedData();
      case 'redisCleanup':
        return await this.cleanupRedisData();
      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStats(): Promise<{
    totalMailboxes: number;
    activeMailboxes: number;
    expiredMailboxes: number;
    totalMails: number;
    oldMails: number;
    redisKeys: number;
  }> {
    try {
      const [
        totalMailboxes,
        activeMailboxes,
        expiredMailboxes,
        totalMails,
        oldMails,
      ] = await Promise.all([
        Mailbox.countDocuments(),
        Mailbox.countDocuments({
          isActive: true,
          expiresAt: { $gt: new Date() },
        }),
        Mailbox.countDocuments({ expiresAt: { $lt: new Date() } }),
        Mail.countDocuments(),
        Mail.countDocuments({
          receivedAt: {
            $lt: new Date(
              Date.now() -
                this.config.retentionPolicies.oldMailsRetentionDays *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          },
        }),
      ]);

      const redisClient = getRedisClient();
      const redisInfo = await redisClient.info('keyspace');
      const redisKeys = this.parseRedisKeyCount(redisInfo);

      return {
        totalMailboxes,
        activeMailboxes,
        expiredMailboxes,
        totalMails,
        oldMails,
        redisKeys,
      };
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error);
      return {
        totalMailboxes: 0,
        activeMailboxes: 0,
        expiredMailboxes: 0,
        totalMails: 0,
        oldMails: 0,
        redisKeys: 0,
      };
    }
  }

  /**
   * 解析 Redis 键数量
   */
  private parseRedisKeyCount(info: string): number {
    const match = info.match(/keys=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    activeJobs: string[];
    config: CleanupConfig;
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      activeJobs: Array.from(this.cleanupJobs.keys()),
      config: this.config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CleanupConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.isRunning) {
      this.stop();
      this.start();
    }

    logger.info('Data cleanup service configuration updated');
  }
}
