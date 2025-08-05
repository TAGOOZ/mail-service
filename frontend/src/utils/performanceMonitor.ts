/**
 * Performance monitoring utilities for the frontend application
 */

export interface PerformanceMetrics {
  // Navigation timing metrics
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;

  // Custom metrics
  timeToInteractive: number;
  totalBlockingTime: number;

  // Resource metrics
  resourceCount: number;
  totalResourceSize: number;

  // Memory metrics (if available)
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

export interface PerformanceReport {
  timestamp: Date;
  url: string;
  userAgent: string;
  metrics: PerformanceMetrics;
  score: number;
  recommendations: string[];
}

class PerformanceMonitor {
  private observers: PerformanceObserver[] = [];
  private metrics: Partial<PerformanceMetrics> = {};
  private startTime: number = performance.now();

  constructor() {
    this.initializeObservers();
    this.collectNavigationMetrics();
  }

  private initializeObservers(): void {
    // Observe paint metrics
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-paint') {
              this.metrics.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (e) {
        console.warn('Paint observer not supported:', e);
      }

      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported:', e);
      }

      // Observe FID
      try {
        const fidObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            this.metrics.firstInputDelay =
              entry.processingStart - entry.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported:', e);
      }

      // Observe CLS
      try {
        const clsObserver = new PerformanceObserver(list => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.metrics.cumulativeLayoutShift = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported:', e);
      }
    }
  }

  private collectNavigationMetrics(): void {
    if (document.readyState === 'complete') {
      this.processNavigationTiming();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.processNavigationTiming(), 0);
      });
    }
  }

  private processNavigationTiming(): void {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    if (navigation) {
      this.metrics.domContentLoaded =
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart;
      this.metrics.loadComplete =
        navigation.loadEventEnd - navigation.loadEventStart;
      this.metrics.timeToInteractive =
        navigation.domInteractive - navigation.navigationStart;
    }

    // Collect resource metrics
    const resources = performance.getEntriesByType('resource');
    this.metrics.resourceCount = resources.length;
    this.metrics.totalResourceSize = resources.reduce((total, resource) => {
      return (
        total + ((resource as PerformanceResourceTiming).transferSize || 0)
      );
    }, 0);

    // Collect memory metrics if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.usedJSHeapSize = memory.usedJSHeapSize;
      this.metrics.totalJSHeapSize = memory.totalJSHeapSize;
      this.metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }
  }

  public getMetrics(): PerformanceMetrics {
    return {
      domContentLoaded: this.metrics.domContentLoaded || 0,
      loadComplete: this.metrics.loadComplete || 0,
      firstPaint: this.metrics.firstPaint || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      timeToInteractive: this.metrics.timeToInteractive || 0,
      totalBlockingTime: this.calculateTotalBlockingTime(),
      resourceCount: this.metrics.resourceCount || 0,
      totalResourceSize: this.metrics.totalResourceSize || 0,
      usedJSHeapSize: this.metrics.usedJSHeapSize,
      totalJSHeapSize: this.metrics.totalJSHeapSize,
      jsHeapSizeLimit: this.metrics.jsHeapSizeLimit,
    };
  }

  private calculateTotalBlockingTime(): number {
    // Simplified TBT calculation
    const longTasks = performance.getEntriesByType('longtask');
    return longTasks.reduce((total, task) => {
      const blockingTime = Math.max(0, task.duration - 50);
      return total + blockingTime;
    }, 0);
  }

  public generateReport(): PerformanceReport {
    const metrics = this.getMetrics();
    const score = this.calculatePerformanceScore(metrics);
    const recommendations = this.generateRecommendations(metrics);

    return {
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics,
      score,
      recommendations,
    };
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points based on Core Web Vitals
    if (metrics.firstContentfulPaint > 1800) score -= 10;
    if (metrics.firstContentfulPaint > 3000) score -= 20;

    if (metrics.largestContentfulPaint > 2500) score -= 15;
    if (metrics.largestContentfulPaint > 4000) score -= 25;

    if (metrics.firstInputDelay > 100) score -= 10;
    if (metrics.firstInputDelay > 300) score -= 20;

    if (metrics.cumulativeLayoutShift > 0.1) score -= 10;
    if (metrics.cumulativeLayoutShift > 0.25) score -= 20;

    // Deduct points for other metrics
    if (metrics.domContentLoaded > 2000) score -= 5;
    if (metrics.totalBlockingTime > 200) score -= 10;

    return Math.max(0, score);
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.firstContentfulPaint > 3000) {
      recommendations.push(
        '优化首次内容绘制时间：考虑减少关键资源大小或使用服务端渲染'
      );
    }

    if (metrics.largestContentfulPaint > 4000) {
      recommendations.push(
        '优化最大内容绘制时间：优化图片加载或减少主线程阻塞'
      );
    }

    if (metrics.firstInputDelay > 300) {
      recommendations.push(
        '优化首次输入延迟：减少JavaScript执行时间或使用Web Workers'
      );
    }

    if (metrics.cumulativeLayoutShift > 0.25) {
      recommendations.push('减少累积布局偏移：为图片和广告设置尺寸属性');
    }

    if (metrics.totalResourceSize > 2 * 1024 * 1024) {
      recommendations.push(
        '减少资源大小：启用压缩、优化图片或移除未使用的代码'
      );
    }

    if (metrics.resourceCount > 100) {
      recommendations.push('减少HTTP请求数量：合并文件或使用HTTP/2推送');
    }

    if (metrics.usedJSHeapSize && metrics.usedJSHeapSize > 50 * 1024 * 1024) {
      recommendations.push('优化内存使用：检查内存泄漏或减少DOM节点数量');
    }

    return recommendations;
  }

  public startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  public endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name, 'measure')[0];
    return measure ? measure.duration : 0;
  }

  public measureFunction<T>(name: string, fn: () => T): T {
    this.startMeasurement(name);
    const result = fn();
    this.endMeasurement(name);
    return result;
  }

  public async measureAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startMeasurement(name);
    const result = await fn();
    this.endMeasurement(name);
    return result;
  }

  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

export function cleanupPerformanceMonitor(): void {
  if (performanceMonitorInstance) {
    performanceMonitorInstance.cleanup();
    performanceMonitorInstance = null;
  }
}

// Utility functions for common performance measurements
export const performanceUtils = {
  measurePageLoad: () => {
    const monitor = getPerformanceMonitor();
    return monitor.getMetrics();
  },

  measureApiCall: async <T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const monitor = getPerformanceMonitor();
    return monitor.measureAsyncFunction(`api-${name}`, apiCall);
  },

  measureRender: <T>(name: string, renderFn: () => T): T => {
    const monitor = getPerformanceMonitor();
    return monitor.measureFunction(`render-${name}`, renderFn);
  },

  generatePerformanceReport: (): PerformanceReport => {
    const monitor = getPerformanceMonitor();
    return monitor.generateReport();
  },
};
