import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/database';
import mongoose from 'mongoose';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retentionDays: number;
  backupPath: string;
  compressionLevel: number;
  notificationEmail?: string;
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  size?: number;
  duration: number;
  errors: string[];
  timestamp: Date;
}

export class BackupService {
  private static instance: BackupService;
  private config: BackupConfig;
  private backupJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  private constructor() {
    this.config = {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      backupPath: process.env.BACKUP_PATH || '/opt/tempmail/backups',
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6'),
      notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL,
    };
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * 启动备份调度器
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Backup service is disabled');
      return;
    }

    if (this.backupJob) {
      logger.warn('Backup scheduler is already running');
      return;
    }

    try {
      // 确保备份目录存在
      await fs.mkdir(this.config.backupPath, { recursive: true });

      // 创建调度任务
      this.backupJob = cron.schedule(
        this.config.schedule,
        async () => {
          await this.performBackup();
        },
        {
          timezone: 'UTC',
          scheduled: false,
        }
      );

      this.backupJob.start();
      this.isRunning = true;

      logger.info(
        `Backup scheduler started with schedule: ${this.config.schedule}`
      );

      // 启动时执行一次清理
      await this.cleanupOldBackups();
    } catch (error) {
      logger.error('Failed to start backup service:', error);
      throw error;
    }
  }

  /**
   * 停止备份调度器
   */
  stop(): void {
    if (this.backupJob) {
      this.backupJob.stop();
      this.backupJob.destroy();
      this.backupJob = null;
      this.isRunning = false;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * 手动执行备份
   */
  async performBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupId = timestamp.toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.config.backupPath, `backup_${backupId}`);

    const result: BackupResult = {
      success: false,
      duration: 0,
      errors: [],
      timestamp,
    };

    try {
      logger.info(`Starting backup process: ${backupId}`);

      // 创建备份目录
      await fs.mkdir(backupDir, { recursive: true });

      // 执行各种备份
      await Promise.all([
        this.backupMongoDB(backupDir),
        this.backupRedis(backupDir),
        this.backupApplicationLogs(backupDir),
        this.createBackupMetadata(backupDir, backupId),
      ]);

      // 压缩备份
      const compressedPath = await this.compressBackup(backupDir);

      // 验证备份完整性
      await this.verifyBackup(compressedPath);

      // 获取备份大小
      const stats = await fs.stat(compressedPath);
      result.backupPath = compressedPath;
      result.size = stats.size;
      result.success = true;

      // 清理临时目录
      await fs.rm(backupDir, { recursive: true, force: true });

      logger.info(`Backup completed successfully: ${compressedPath}`, {
        size: this.formatBytes(stats.size),
        duration: Date.now() - startTime,
      });

      // 发送成功通知
      await this.sendNotification('success', result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      logger.error(`Backup failed: ${errorMessage}`);

      // 清理失败的备份目录
      try {
        await fs.rm(backupDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.error('Failed to cleanup backup directory:', cleanupError);
      }

      // 发送失败通知
      await this.sendNotification('failure', result);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 备份 MongoDB 数据
   */
  private async backupMongoDB(backupDir: string): Promise<void> {
    const mongoBackupDir = path.join(backupDir, 'mongodb');
    await fs.mkdir(mongoBackupDir, { recursive: true });

    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/tempmail';
    const dbName = mongoose.connection.db?.databaseName || 'tempmail';

    // 使用 mongodump 备份
    const command = `mongodump --uri="${mongoUri}" --db="${dbName}" --out="${mongoBackupDir}"`;

    try {
      await execAsync(command);
      logger.info('MongoDB backup completed');
    } catch (error) {
      logger.error('MongoDB backup failed:', error);
      throw new Error(`MongoDB backup failed: ${error}`);
    }
  }

  /**
   * 备份 Redis 数据
   */
  private async backupRedis(backupDir: string): Promise<void> {
    const redisClient = getRedisClient();
    const redisBackupPath = path.join(backupDir, 'redis.rdb');

    try {
      // 触发 Redis 保存
      await redisClient.bgSave();

      // 等待保存完成
      let lastSave = await redisClient.lastSave();
      const startTime = Date.now();

      while (Date.now() - startTime < 30000) {
        // 最多等待30秒
        await new Promise(resolve => setTimeout(resolve, 1000));
        const currentSave = await redisClient.lastSave();
        if (currentSave > lastSave) {
          break;
        }
      }

      // 复制 Redis dump 文件
      const redisDataDir = process.env.REDIS_DATA_DIR || '/data';
      const sourcePath = path.join(redisDataDir, 'dump.rdb');

      // 如果在 Docker 环境中，使用 docker cp
      if (process.env.REDIS_CONTAINER_NAME) {
        const command = `docker cp ${process.env.REDIS_CONTAINER_NAME}:${sourcePath} ${redisBackupPath}`;
        await execAsync(command);
      } else {
        await fs.copyFile(sourcePath, redisBackupPath);
      }

      logger.info('Redis backup completed');
    } catch (error) {
      logger.error('Redis backup failed:', error);
      throw new Error(`Redis backup failed: ${error}`);
    }
  }

  /**
   * 备份应用程序日志
   */
  private async backupApplicationLogs(backupDir: string): Promise<void> {
    const logsBackupDir = path.join(backupDir, 'logs');
    const logsSourceDir = process.env.LOGS_DIR || './logs';

    try {
      await fs.mkdir(logsBackupDir, { recursive: true });

      // 复制日志文件
      const logFiles = await fs.readdir(logsSourceDir);

      for (const logFile of logFiles) {
        if (logFile.endsWith('.log')) {
          const sourcePath = path.join(logsSourceDir, logFile);
          const targetPath = path.join(logsBackupDir, logFile);
          await fs.copyFile(sourcePath, targetPath);
        }
      }

      logger.info('Application logs backup completed');
    } catch (error) {
      logger.warn('Application logs backup failed (non-critical):', error);
      // 日志备份失败不应该导致整个备份失败
    }
  }

  /**
   * 创建备份元数据
   */
  private async createBackupMetadata(
    backupDir: string,
    backupId: string
  ): Promise<void> {
    const metadata = {
      backupId,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      hostname: process.env.HOSTNAME || 'unknown',
      databases: {
        mongodb: {
          uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tempmail',
          database: mongoose.connection.db?.databaseName || 'tempmail',
        },
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        },
      },
      config: {
        retentionDays: this.config.retentionDays,
        compressionLevel: this.config.compressionLevel,
      },
    };

    const metadataPath = path.join(backupDir, 'backup_metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    logger.info('Backup metadata created');
  }

  /**
   * 压缩备份目录
   */
  private async compressBackup(backupDir: string): Promise<string> {
    const backupName = path.basename(backupDir);
    const compressedPath = `${backupDir}.tar.gz`;

    const command = `tar -czf "${compressedPath}" -C "${path.dirname(backupDir)}" "${backupName}"`;

    try {
      await execAsync(command);
      logger.info(`Backup compressed: ${compressedPath}`);
      return compressedPath;
    } catch (error) {
      logger.error('Backup compression failed:', error);
      throw new Error(`Backup compression failed: ${error}`);
    }
  }

  /**
   * 验证备份完整性
   */
  private async verifyBackup(backupPath: string): Promise<void> {
    try {
      // 验证压缩文件完整性
      const command = `tar -tzf "${backupPath}" > /dev/null`;
      await execAsync(command);

      logger.info('Backup integrity verification passed');
    } catch (error) {
      logger.error('Backup integrity verification failed:', error);
      throw new Error(`Backup integrity verification failed: ${error}`);
    }
  }

  /**
   * 清理过期备份
   */
  async cleanupOldBackups(): Promise<number> {
    try {
      const files = await fs.readdir(this.config.backupPath);
      const backupFiles = files.filter(
        file => file.startsWith('backup_') && file.endsWith('.tar.gz')
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      let deletedCount = 0;

      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old backup: ${file}`);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old backup(s)`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
      return 0;
    }
  }

  /**
   * 获取备份列表
   */
  async listBackups(): Promise<
    Array<{
      filename: string;
      size: number;
      created: Date;
      path: string;
    }>
  > {
    try {
      const files = await fs.readdir(this.config.backupPath);
      const backupFiles = files.filter(
        file => file.startsWith('backup_') && file.endsWith('.tar.gz')
      );

      const backups = [];

      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.stat(filePath);

        backups.push({
          filename: file,
          size: stats.size,
          created: stats.mtime,
          path: filePath,
        });
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(
    type: 'success' | 'failure',
    result: BackupResult
  ): Promise<void> {
    if (!this.config.notificationEmail) {
      return;
    }

    const subject =
      type === 'success'
        ? '✅ TempMail Backup Completed Successfully'
        : '❌ TempMail Backup Failed';

    const message =
      type === 'success'
        ? `Backup completed successfully:
- Backup Path: ${result.backupPath}
- Size: ${result.size ? this.formatBytes(result.size) : 'Unknown'}
- Duration: ${Math.round(result.duration / 1000)}s
- Timestamp: ${result.timestamp.toISOString()}`
        : `Backup failed:
- Errors: ${result.errors.join(', ')}
- Duration: ${Math.round(result.duration / 1000)}s
- Timestamp: ${result.timestamp.toISOString()}`;

    // 这里可以集成邮件发送服务
    logger.info(`Backup notification: ${subject}\n${message}`);
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    schedule: string;
    nextRun: string | null;
    lastBackup: Date | null;
    config: BackupConfig;
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      schedule: this.config.schedule,
      nextRun: this.backupJob ? 'Scheduled' : null,
      lastBackup: null, // 可以从日志或数据库中获取
      config: this.config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.isRunning) {
      this.stop();
      this.start();
    }

    logger.info('Backup service configuration updated');
  }
}
