/**
 * Backend performance monitoring utilities
 */
import { Request, Response, NextFunction } from 'express';

export interface ApiPerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequest: ApiPerformanceMetrics | null;
  fastestRequest: ApiPerformanceMetrics | null;
  errorRate: number;
  requestsPerSecond: number;
  memoryTrend: Array<{ timestamp: Date; usage: NodeJS.MemoryUsage }>;
}

class BackendPerformanceMonitor {
  private metrics: ApiPerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;
  private performanceThresholds = {
    slowResponseTime: 2000, // 2 seconds
    highMemoryUsage: 500 * 1024 * 1024, // 500MB
    highErrorRate: 0.05, // 5%
  };

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startCpuUsage = process.cpuUsage();
      const startMemory = process.memoryUsage();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function (chunk?: any, encoding?: any) {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemory = process.memoryUsage();

        const metric: ApiPerformanceMetrics = {
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: new Date(),
          memoryUsage: endMemory,
          cpuUsage: endCpuUsage,
        };

        BackendPerformanceMonitor.getInstance().recordMetric(metric);

        // Log slow requests
        if (
          responseTime >
          BackendPerformanceMonitor.getInstance().performanceThresholds
            .slowResponseTime
        ) {
          console.warn(
            `Slow request detected: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`
          );
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  private static instance: BackendPerformanceMonitor;

  public static getInstance(): BackendPerformanceMonitor {
    if (!BackendPerformanceMonitor.instance) {
      BackendPerformanceMonitor.instance = new BackendPerformanceMonitor();
    }
    return BackendPerformanceMonitor.instance;
  }

  public recordMetric(metric: ApiPerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check for performance issues
    this.checkPerformanceIssues(metric);
  }

  private checkPerformanceIssues(metric: ApiPerformanceMetrics): void {
    // Check for slow responses
    if (metric.responseTime > this.performanceThresholds.slowResponseTime) {
      console.warn(
        `Performance Alert: Slow response time ${metric.responseTime.toFixed(2)}ms for ${metric.method} ${metric.endpoint}`
      );
    }

    // Check for high memory usage
    if (
      metric.memoryUsage.heapUsed > this.performanceThresholds.highMemoryUsage
    ) {
      console.warn(
        `Performance Alert: High memory usage ${(metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Check for errors
    if (metric.statusCode >= 500) {
      console.error(
        `Performance Alert: Server error ${metric.statusCode} for ${metric.method} ${metric.endpoint}`
      );
    }
  }

  public getStats(timeWindow?: number): PerformanceStats {
    const now = new Date();
    const windowStart = timeWindow
      ? new Date(now.getTime() - timeWindow)
      : new Date(0);

    const relevantMetrics = this.metrics.filter(
      m => m.timestamp >= windowStart
    );

    if (relevantMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowestRequest: null,
        fastestRequest: null,
        errorRate: 0,
        requestsPerSecond: 0,
        memoryTrend: [],
      };
    }

    const totalRequests = relevantMetrics.length;
    const averageResponseTime =
      relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
      totalRequests;
    const slowestRequest = relevantMetrics.reduce(
      (slowest, current) =>
        current.responseTime > (slowest?.responseTime || 0) ? current : slowest,
      null as ApiPerformanceMetrics | null
    );
    const fastestRequest = relevantMetrics.reduce(
      (fastest, current) =>
        current.responseTime < (fastest?.responseTime || Infinity)
          ? current
          : fastest,
      null as ApiPerformanceMetrics | null
    );

    const errorCount = relevantMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / totalRequests;

    const timeSpanMs =
      timeWindow || now.getTime() - relevantMetrics[0].timestamp.getTime();
    const requestsPerSecond = totalRequests / (timeSpanMs / 1000);

    // Memory trend (sample every 10 requests or so)
    const memoryTrend = relevantMetrics
      .filter(
        (_, index) =>
          index % Math.max(1, Math.floor(relevantMetrics.length / 20)) === 0
      )
      .map(m => ({
        timestamp: m.timestamp,
        usage: m.memoryUsage,
      }));

    return {
      totalRequests,
      averageResponseTime,
      slowestRequest,
      fastestRequest,
      errorRate,
      requestsPerSecond,
      memoryTrend,
    };
  }

  public getMetricsByEndpoint(
    endpoint: string,
    timeWindow?: number
  ): ApiPerformanceMetrics[] {
    const now = new Date();
    const windowStart = timeWindow
      ? new Date(now.getTime() - timeWindow)
      : new Date(0);

    return this.metrics.filter(
      m => m.endpoint === endpoint && m.timestamp >= windowStart
    );
  }

  public getSlowRequests(threshold?: number): ApiPerformanceMetrics[] {
    const slowThreshold =
      threshold || this.performanceThresholds.slowResponseTime;
    return this.metrics.filter(m => m.responseTime > slowThreshold);
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public exportMetrics(): ApiPerformanceMetrics[] {
    return [...this.metrics];
  }

  // Method to measure database operations
  public async measureDatabaseOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    try {
      const result = await operation();
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;
      const endMemory = process.memoryUsage();

      console.log(
        `Database operation ${operationName} completed in ${responseTime.toFixed(2)}ms`
      );

      if (responseTime > 1000) {
        // Log slow database operations
        console.warn(
          `Slow database operation: ${operationName} - ${responseTime.toFixed(2)}ms`
        );
      }

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;
      console.error(
        `Database operation ${operationName} failed after ${responseTime.toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  }

  // Method to measure any async operation
  public async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = process.hrtime.bigint();

    try {
      const result = await operation();
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;

      console.log(
        `Operation ${operationName} completed in ${responseTime.toFixed(2)}ms`
      );
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;
      console.error(
        `Operation ${operationName} failed after ${responseTime.toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  }
}

// Utility functions
export const performanceMonitor = BackendPerformanceMonitor.getInstance();

export function measureAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureOperation(operationName, operation);
}

export function measureDatabaseOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureDatabaseOperation(operationName, operation);
}

// Express middleware
export const performanceMiddleware = performanceMonitor.middleware();

// Health check function
export function getSystemHealth() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const uptime = process.uptime();

  return {
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    uptime,
    timestamp: new Date(),
  };
}
