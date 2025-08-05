import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { checkDatabaseHealth } from '../config/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';

const execAsync = promisify(exec);

export interface MonitoringConfig {
  enabled: boolean;
  checkInterval: string; // cron expression
  alertThresholds: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
    responseTime: number; // milliseconds
    errorRate: number; // errors per minute
    connectionCount: number; // max concurrent connections
  };
  notifications: {
    email?: string;
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    webhook?: string;
  };
  healthChecks: {
    endpoints: string[];
    timeout: number; // milliseconds
  };
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    connections: number;
    bytesIn: number;
    bytesOut: number;
  };
  application: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  database: {
    mongodb: boolean;
    redis: boolean;
    connectionPool: number;
  };
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private config: MonitoringConfig;
  private monitoringJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsHistory: SystemMetrics[] = [];
  private maxHistorySize = 1440; // 24 hours of minute-by-minute data

  private constructor() {
    this.config = {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      checkInterval: process.env.MONITORING_CHECK_INTERVAL || '* * * * *', // Every minute
      alertThresholds: {
        cpuUsage: parseInt(process.env.ALERT_CPU_THRESHOLD || '80'),
        memoryUsage: parseInt(process.env.ALERT_MEMORY_THRESHOLD || '85'),
        diskUsage: parseInt(process.env.ALERT_DISK_THRESHOLD || '90'),
        responseTime: parseInt(
          process.env.ALERT_RESPONSE_TIME_THRESHOLD || '2000'
        ),
        errorRate: parseInt(process.env.ALERT_ERROR_RATE_THRESHOLD || '10'),
        connectionCount: parseInt(
          process.env.ALERT_CONNECTION_COUNT_THRESHOLD || '1000'
        ),
      },
      notifications: {
        email: process.env.ALERT_EMAIL,
        slack: process.env.SLACK_WEBHOOK_URL
          ? {
              webhookUrl: process.env.SLACK_WEBHOOK_URL,
              channel: process.env.SLACK_CHANNEL || '#alerts',
            }
          : undefined,
        webhook: process.env.ALERT_WEBHOOK_URL,
      },
      healthChecks: {
        endpoints: (
          process.env.HEALTH_CHECK_ENDPOINTS ||
          'http://localhost:3001/api/health'
        ).split(','),
        timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
      },
    };
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 启动监控服务
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Monitoring service is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('Monitoring service is already running');
      return;
    }

    try {
      // 创建监控任务
      this.monitoringJob = cron.schedule(
        this.config.checkInterval,
        async () => {
          await this.performHealthCheck();
        },
        {
          timezone: 'UTC',
        }
      );

      this.monitoringJob.start();
      this.isRunning = true;

      logger.info(
        `Monitoring service started with interval: ${this.config.checkInterval}`
      );

      // 启动时执行一次健康检查
      await this.performHealthCheck();
    } catch (error) {
      logger.error('Failed to start monitoring service:', error);
      throw error;
    }
  }

  /**
   * 停止监控服务
   */
  stop(): void {
    if (this.monitoringJob) {
      this.monitoringJob.stop();
      this.monitoringJob.destroy();
      this.monitoringJob = null;
      this.isRunning = false;
      logger.info('Monitoring service stopped');
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<SystemMetrics> {
    try {
      const metrics = await this.collectSystemMetrics();

      // 添加到历史记录
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      // 检查告警条件
      await this.checkAlertConditions(metrics);

      return metrics;
    } catch (error) {
      logger.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * 收集系统指标
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const [
      cpuMetrics,
      memoryMetrics,
      diskMetrics,
      networkMetrics,
      applicationMetrics,
      databaseMetrics,
    ] = await Promise.all([
      this.getCpuMetrics(),
      this.getMemoryMetrics(),
      this.getDiskMetrics(),
      this.getNetworkMetrics(),
      this.getApplicationMetrics(),
      this.getDatabaseMetrics(),
    ]);

    return {
      timestamp: new Date(),
      cpu: cpuMetrics,
      memory: memoryMetrics,
      disk: diskMetrics,
      network: networkMetrics,
      application: applicationMetrics,
      database: databaseMetrics,
    };
  }

  /**
   * 获取 CPU 指标
   */
  private async getCpuMetrics(): Promise<{
    usage: number;
    loadAverage: number[];
  }> {
    try {
      // 获取 CPU 使用率
      const { stdout } = await execAsync(
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'"
      );
      const usage = parseFloat(stdout.trim()) || 0;

      // 获取负载平均值
      const loadAverage = os.loadavg();

      return {
        usage,
        loadAverage,
      };
    } catch (error) {
      logger.error('Failed to get CPU metrics:', error);
      return { usage: 0, loadAverage: [0, 0, 0] };
    }
  }

  /**
   * 获取内存指标
   */
  private async getMemoryMetrics(): Promise<{
    total: number;
    used: number;
    free: number;
    usage: number;
  }> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usage = (usedMem / totalMem) * 100;

      return {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage,
      };
    } catch (error) {
      logger.error('Failed to get memory metrics:', error);
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  /**
   * 获取磁盘指标
   */
  private async getDiskMetrics(): Promise<{
    total: number;
    used: number;
    free: number;
    usage: number;
  }> {
    try {
      const { stdout } = await execAsync(
        "df / | awk 'NR==2 {print $2,$3,$4,$5}' | sed 's/%//'"
      );
      const [total, used, free, usage] = stdout.trim().split(' ').map(Number);

      return {
        total: total * 1024, // Convert from KB to bytes
        used: used * 1024,
        free: free * 1024,
        usage,
      };
    } catch (error) {
      logger.error('Failed to get disk metrics:', error);
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  /**
   * 获取网络指标
   */
  private async getNetworkMetrics(): Promise<{
    connections: number;
    bytesIn: number;
    bytesOut: number;
  }> {
    try {
      // 获取活跃连接数
      const { stdout: connectionsOutput } = await execAsync(
        'netstat -an | grep ESTABLISHED | wc -l'
      );
      const connections = parseInt(connectionsOutput.trim()) || 0;

      // 获取网络流量（简化版本）
      const networkInterfaces = os.networkInterfaces();
      let bytesIn = 0;
      let bytesOut = 0;

      // 这里可以实现更详细的网络流量统计
      // 目前返回基本值
      return {
        connections,
        bytesIn,
        bytesOut,
      };
    } catch (error) {
      logger.error('Failed to get network metrics:', error);
      return { connections: 0, bytesIn: 0, bytesOut: 0 };
    }
  }

  /**
   * 获取应用程序指标
   */
  private async getApplicationMetrics(): Promise<{
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  }> {
    try {
      const uptime = process.uptime();

      // 测试响应时间
      const responseTime = await this.measureResponseTime();

      // 获取错误率（从日志中统计）
      const errorRate = await this.calculateErrorRate();

      // 获取活跃连接数（WebSocket 连接等）
      const activeConnections = await this.getActiveConnections();

      return {
        uptime,
        responseTime,
        errorRate,
        activeConnections,
      };
    } catch (error) {
      logger.error('Failed to get application metrics:', error);
      return { uptime: 0, responseTime: 0, errorRate: 0, activeConnections: 0 };
    }
  }

  /**
   * 获取数据库指标
   */
  private async getDatabaseMetrics(): Promise<{
    mongodb: boolean;
    redis: boolean;
    connectionPool: number;
  }> {
    try {
      const health = await checkDatabaseHealth();

      // 获取 MongoDB 连接池信息
      const connectionPool = process.env.NODE_ENV === 'production' ? 10 : 5; // 简化版本

      return {
        mongodb: health.mongodb,
        redis: health.redis,
        connectionPool,
      };
    } catch (error) {
      logger.error('Failed to get database metrics:', error);
      return { mongodb: false, redis: false, connectionPool: 0 };
    }
  }

  /**
   * 测量响应时间
   */
  private async measureResponseTime(): Promise<number> {
    try {
      const startTime = Date.now();

      // 测试主要端点
      const endpoint = this.config.healthChecks.endpoints[0];
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.healthChecks.timeout),
      });

      if (response.ok) {
        return Date.now() - startTime;
      } else {
        return this.config.healthChecks.timeout; // 返回超时值表示响应异常
      }
    } catch (error) {
      return this.config.healthChecks.timeout;
    }
  }

  /**
   * 计算错误率
   */
  private async calculateErrorRate(): Promise<number> {
    try {
      // 从日志文件中统计最近一分钟的错误数
      const logPath = process.env.LOG_FILE || './logs/app.log';

      try {
        const logContent = await fs.readFile(logPath, 'utf-8');
        const lines = logContent.split('\n');

        const oneMinuteAgo = new Date(Date.now() - 60000);
        let errorCount = 0;

        for (const line of lines.slice(-1000)) {
          // 检查最后1000行
          if (line.includes('ERROR') || line.includes('error')) {
            // 简化的时间戳解析
            const timestampMatch = line.match(
              /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
            );
            if (timestampMatch) {
              const logTime = new Date(timestampMatch[0]);
              if (logTime > oneMinuteAgo) {
                errorCount++;
              }
            }
          }
        }

        return errorCount;
      } catch (fileError) {
        return 0; // 如果无法读取日志文件，返回0
      }
    } catch (error) {
      logger.error('Failed to calculate error rate:', error);
      return 0;
    }
  }

  /**
   * 获取活跃连接数
   */
  private async getActiveConnections(): Promise<number> {
    try {
      // 这里可以从 WebSocket 服务或其他连接管理器获取实际连接数
      // 目前返回一个估算值
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 检查告警条件
   */
  private async checkAlertConditions(metrics: SystemMetrics): Promise<void> {
    const checks = [
      {
        key: 'cpu_usage',
        value: metrics.cpu.usage,
        threshold: this.config.alertThresholds.cpuUsage,
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
      },
      {
        key: 'memory_usage',
        value: metrics.memory.usage,
        threshold: this.config.alertThresholds.memoryUsage,
        message: `High memory usage: ${metrics.memory.usage.toFixed(1)}%`,
      },
      {
        key: 'disk_usage',
        value: metrics.disk.usage,
        threshold: this.config.alertThresholds.diskUsage,
        message: `High disk usage: ${metrics.disk.usage.toFixed(1)}%`,
      },
      {
        key: 'response_time',
        value: metrics.application.responseTime,
        threshold: this.config.alertThresholds.responseTime,
        message: `Slow response time: ${metrics.application.responseTime}ms`,
      },
      {
        key: 'error_rate',
        value: metrics.application.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        message: `High error rate: ${metrics.application.errorRate} errors/min`,
      },
    ];

    for (const check of checks) {
      if (check.value > check.threshold) {
        await this.triggerAlert(
          check.key,
          check.value,
          check.threshold,
          check.message
        );
      } else {
        await this.resolveAlert(check.key);
      }
    }

    // 检查数据库连接
    if (!metrics.database.mongodb || !metrics.database.redis) {
      await this.triggerAlert(
        'database_connection',
        0,
        1,
        `Database connection failed: MongoDB=${metrics.database.mongodb}, Redis=${metrics.database.redis}`
      );
    } else {
      await this.resolveAlert('database_connection');
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(
    key: string,
    value: number,
    threshold: number,
    message: string
  ): Promise<void> {
    const existingAlert = this.activeAlerts.get(key);

    if (existingAlert && !existingAlert.resolved) {
      // 告警已存在且未解决，不重复发送
      return;
    }

    const alert: Alert = {
      id: `${key}_${Date.now()}`,
      type: this.getAlertType(key, value, threshold),
      metric: key,
      value,
      threshold,
      message,
      timestamp: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(key, alert);

    logger.warn(`Alert triggered: ${message}`, {
      alertId: alert.id,
      type: alert.type,
      metric: key,
      value,
      threshold,
    });

    // 发送通知
    await this.sendNotification(alert);
  }

  /**
   * 解决告警
   */
  private async resolveAlert(key: string): Promise<void> {
    const alert = this.activeAlerts.get(key);

    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      logger.info(`Alert resolved: ${alert.message}`, {
        alertId: alert.id,
        resolvedAt: alert.resolvedAt,
      });

      // 发送解决通知
      await this.sendResolutionNotification(alert);
    }
  }

  /**
   * 获取告警类型
   */
  private getAlertType(
    key: string,
    value: number,
    threshold: number
  ): 'warning' | 'critical' {
    const criticalThresholds = {
      cpu_usage: 95,
      memory_usage: 95,
      disk_usage: 95,
      response_time: 5000,
      error_rate: 50,
    };

    const criticalThreshold =
      criticalThresholds[key as keyof typeof criticalThresholds];
    return criticalThreshold && value > criticalThreshold
      ? 'critical'
      : 'warning';
  }

  /**
   * 发送通知
   */
  private async sendNotification(alert: Alert): Promise<void> {
    const emoji = alert.type === 'critical' ? '🚨' : '⚠️';
    const message = `${emoji} TempMail Alert [${alert.type.toUpperCase()}]\n${alert.message}\nTime: ${alert.timestamp.toISOString()}`;

    // 发送邮件通知
    if (this.config.notifications.email) {
      // 这里可以集成邮件发送服务
      logger.info(
        `Email notification would be sent to: ${this.config.notifications.email}`
      );
    }

    // 发送 Slack 通知
    if (this.config.notifications.slack) {
      try {
        await fetch(this.config.notifications.slack.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: this.config.notifications.slack.channel,
            text: message,
            username: 'TempMail Monitor',
            icon_emoji: ':warning:',
          }),
        });
      } catch (error) {
        logger.error('Failed to send Slack notification:', error);
      }
    }

    // 发送 Webhook 通知
    if (this.config.notifications.webhook) {
      try {
        await fetch(this.config.notifications.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert,
            message,
            timestamp: alert.timestamp.toISOString(),
          }),
        });
      } catch (error) {
        logger.error('Failed to send webhook notification:', error);
      }
    }
  }

  /**
   * 发送解决通知
   */
  private async sendResolutionNotification(alert: Alert): Promise<void> {
    const message = `✅ TempMail Alert Resolved\n${alert.message}\nResolved at: ${alert.resolvedAt?.toISOString()}`;

    // 发送 Slack 解决通知
    if (this.config.notifications.slack) {
      try {
        await fetch(this.config.notifications.slack.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: this.config.notifications.slack.channel,
            text: message,
            username: 'TempMail Monitor',
            icon_emoji: ':white_check_mark:',
          }),
        });
      } catch (error) {
        logger.error('Failed to send Slack resolution notification:', error);
      }
    }
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(hours: number = 1): SystemMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(
      alert => !alert.resolved
    );
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(hours: number = 24): Alert[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.activeAlerts.values()).filter(
      alert => alert.timestamp > cutoffTime
    );
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    checkInterval: string;
    activeAlerts: number;
    lastCheck: Date | null;
    config: MonitoringConfig;
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      checkInterval: this.config.checkInterval,
      activeAlerts: this.getActiveAlerts().length,
      lastCheck: this.getCurrentMetrics()?.timestamp || null,
      config: this.config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.isRunning) {
      this.stop();
      this.start();
    }

    logger.info('Monitoring service configuration updated');
  }
}
