import * as cron from 'node-cron';
import { MailboxService } from './mailboxService';
import { logger } from '../utils/logger';

export class CleanupScheduler {
  private static cleanupJob: cron.ScheduledTask | null = null;
  private static isRunning = false;

  /**
   * 启动清理调度器
   * 每15分钟执行一次清理任务
   */
  static start(): void {
    if (this.cleanupJob) {
      logger.warn('Cleanup scheduler is already running');
      return;
    }

    // 每15分钟执行一次清理
    this.cleanupJob = cron.schedule(
      '*/15 * * * *',
      async () => {
        await this.runCleanup();
      },
      {
        timezone: 'UTC',
      }
    );

    this.cleanupJob.start();
    this.isRunning = true;

    logger.info('Cleanup scheduler started - running every 15 minutes');

    // 立即执行一次清理
    this.runCleanup();
  }

  /**
   * 停止清理调度器
   */
  static stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob.destroy();
      this.cleanupJob = null;
      this.isRunning = false;
      logger.info('Cleanup scheduler stopped');
    }
  }

  /**
   * 执行清理任务
   */
  private static async runCleanup(): Promise<void> {
    try {
      logger.info('Starting scheduled cleanup task');

      const startTime = Date.now();
      const cleanedCount = await MailboxService.cleanupExpiredMailboxes();
      const duration = Date.now() - startTime;

      logger.info(`Cleanup task completed`, {
        cleanedMailboxes: cleanedCount,
        durationMs: duration,
      });

      // 记录统计信息
      const stats = await MailboxService.getMailboxStats();
      logger.info('Current mailbox statistics', stats);
    } catch (error) {
      logger.error('Cleanup task failed:', error);
    }
  }

  /**
   * 手动触发清理任务
   */
  static async triggerCleanup(): Promise<number> {
    logger.info('Manual cleanup triggered');
    return await MailboxService.cleanupExpiredMailboxes();
  }

  /**
   * 获取调度器状态
   */
  static getStatus(): {
    isRunning: boolean;
    nextRun: string | null;
  } {
    return {
      isRunning: this.isRunning,
      nextRun: this.cleanupJob ? 'Every 15 minutes' : null,
    };
  }

  /**
   * 设置自定义清理间隔
   * @param cronExpression cron表达式
   */
  static setCustomSchedule(cronExpression: string): void {
    if (this.cleanupJob) {
      this.stop();
    }

    this.cleanupJob = cron.schedule(
      cronExpression,
      async () => {
        await this.runCleanup();
      },
      {
        timezone: 'UTC',
      }
    );

    this.isRunning = true;

    logger.info(
      `Cleanup scheduler updated with custom schedule: ${cronExpression}`
    );
  }
}
