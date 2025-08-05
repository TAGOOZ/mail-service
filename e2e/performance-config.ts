/**
 * Performance test configuration and utilities
 */

export interface PerformanceThresholds {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  apiResponseTime: number;
  mailboxGenerationTime: number;
  mailReceptionTime: number;
  memoryUsage: number;
  resourceCount: number;
  resourceSize: number;
}

export interface PerformanceTestConfig {
  thresholds: PerformanceThresholds;
  testData: {
    mailCount: number;
    concurrentUsers: number;
    testDuration: number;
  };
  reporting: {
    enabled: boolean;
    outputPath: string;
    includeScreenshots: boolean;
  };
}

export const defaultPerformanceConfig: PerformanceTestConfig = {
  thresholds: {
    pageLoadTime: 5000, // 5 seconds
    firstContentfulPaint: 3000, // 3 seconds
    largestContentfulPaint: 4000, // 4 seconds
    firstInputDelay: 100, // 100ms
    cumulativeLayoutShift: 0.1, // 0.1 CLS score
    apiResponseTime: 2000, // 2 seconds
    mailboxGenerationTime: 3000, // 3 seconds
    mailReceptionTime: 10000, // 10 seconds
    memoryUsage: 100 * 1024 * 1024, // 100MB
    resourceCount: 100, // 100 resources
    resourceSize: 5 * 1024 * 1024, // 5MB
  },
  testData: {
    mailCount: 20,
    concurrentUsers: 5,
    testDuration: 60000, // 1 minute
  },
  reporting: {
    enabled: true,
    outputPath: './performance-reports',
    includeScreenshots: true,
  },
};

export class PerformanceTestUtils {
  static async measurePageLoad(page: any): Promise<{
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    domContentLoaded: number;
    resourceCount: number;
    resourceSize: number;
  }> {
    const startTime = Date.now();

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');

      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        firstContentfulPaint:
          paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0, // Will be updated by observer
        resourceCount: resources.length,
        resourceSize: resources.reduce(
          (total, r) =>
            total + ((r as PerformanceResourceTiming).transferSize || 0),
          0
        ),
      };
    });

    // Get LCP using observer
    const largestContentfulPaint = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver(list => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            observer.disconnect();
            resolve(lastEntry.startTime);
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });

          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(0);
          }, 5000);
        } else {
          resolve(0);
        }
      });
    });

    return {
      loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint,
      domContentLoaded: metrics.domContentLoaded,
      resourceCount: metrics.resourceCount,
      resourceSize: metrics.resourceSize,
    };
  }

  static async measureMemoryUsage(page: any): Promise<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null> {
    return await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
  }

  static async measureApiCall(
    page: any,
    apiCall: () => Promise<any>
  ): Promise<{
    duration: number;
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await apiCall();
      const endTime = Date.now();
      return {
        duration: endTime - startTime,
        success: true,
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async capturePerformanceProfile(
    page: any,
    duration: number = 10000
  ): Promise<any> {
    // Start performance profiling
    await page.evaluate(() => {
      if ('performance' in window && 'mark' in performance) {
        performance.mark('profile-start');
      }
    });

    // Wait for specified duration
    await page.waitForTimeout(duration);

    // End profiling and collect data
    const profile = await page.evaluate(() => {
      if ('performance' in window) {
        performance.mark('profile-end');
        performance.measure('profile-duration', 'profile-start', 'profile-end');

        const measures = performance.getEntriesByType('measure');
        const marks = performance.getEntriesByType('mark');
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource');

        return {
          measures: measures.map(m => ({
            name: m.name,
            duration: m.duration,
            startTime: m.startTime,
          })),
          marks: marks.map(m => ({ name: m.name, startTime: m.startTime })),
          navigation: {
            domContentLoaded:
              navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
          },
          resources: {
            count: resources.length,
            totalSize: resources.reduce(
              (total, r) =>
                total + ((r as PerformanceResourceTiming).transferSize || 0),
              0
            ),
            slowResources: resources.filter(r => r.duration > 1000).length,
          },
          memory: (performance as any).memory
            ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              }
            : null,
        };
      }
      return null;
    });

    return profile;
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatTime(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  static generatePerformanceReport(
    testName: string,
    metrics: any,
    thresholds: PerformanceThresholds
  ): {
    testName: string;
    timestamp: Date;
    passed: boolean;
    metrics: any;
    thresholds: PerformanceThresholds;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check thresholds
    if (metrics.loadTime > thresholds.pageLoadTime) {
      violations.push(
        `Page load time exceeded: ${metrics.loadTime}ms > ${thresholds.pageLoadTime}ms`
      );
      recommendations.push(
        'Optimize page load time by reducing resource sizes and improving caching'
      );
    }

    if (metrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
      violations.push(
        `First Contentful Paint exceeded: ${metrics.firstContentfulPaint}ms > ${thresholds.firstContentfulPaint}ms`
      );
      recommendations.push(
        'Optimize critical rendering path and reduce render-blocking resources'
      );
    }

    if (metrics.largestContentfulPaint > thresholds.largestContentfulPaint) {
      violations.push(
        `Largest Contentful Paint exceeded: ${metrics.largestContentfulPaint}ms > ${thresholds.largestContentfulPaint}ms`
      );
      recommendations.push(
        'Optimize largest content element loading and reduce main thread blocking'
      );
    }

    if (metrics.resourceCount > thresholds.resourceCount) {
      violations.push(
        `Resource count exceeded: ${metrics.resourceCount} > ${thresholds.resourceCount}`
      );
      recommendations.push(
        'Reduce number of HTTP requests by bundling resources and removing unused assets'
      );
    }

    if (metrics.resourceSize > thresholds.resourceSize) {
      violations.push(
        `Resource size exceeded: ${this.formatBytes(metrics.resourceSize)} > ${this.formatBytes(thresholds.resourceSize)}`
      );
      recommendations.push(
        'Compress resources, optimize images, and enable gzip compression'
      );
    }

    if (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) {
      violations.push(
        `Memory usage exceeded: ${this.formatBytes(metrics.memoryUsage)} > ${this.formatBytes(thresholds.memoryUsage)}`
      );
      recommendations.push(
        'Optimize memory usage by fixing memory leaks and reducing DOM complexity'
      );
    }

    return {
      testName,
      timestamp: new Date(),
      passed: violations.length === 0,
      metrics,
      thresholds,
      violations,
      recommendations,
    };
  }

  static async saveReport(report: any, outputPath: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-report-${report.testName}-${timestamp}.json`;
    const filepath = path.join(outputPath, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    return filepath;
  }
}

export function getPerformanceConfig(): PerformanceTestConfig {
  // Allow configuration override via environment variables
  const config = { ...defaultPerformanceConfig };

  if (process.env.PERF_PAGE_LOAD_TIME) {
    config.thresholds.pageLoadTime = parseInt(process.env.PERF_PAGE_LOAD_TIME);
  }
  if (process.env.PERF_API_RESPONSE_TIME) {
    config.thresholds.apiResponseTime = parseInt(
      process.env.PERF_API_RESPONSE_TIME
    );
  }
  if (process.env.PERF_MEMORY_USAGE) {
    config.thresholds.memoryUsage = parseInt(process.env.PERF_MEMORY_USAGE);
  }
  if (process.env.PERF_MAIL_COUNT) {
    config.testData.mailCount = parseInt(process.env.PERF_MAIL_COUNT);
  }
  if (process.env.PERF_CONCURRENT_USERS) {
    config.testData.concurrentUsers = parseInt(
      process.env.PERF_CONCURRENT_USERS
    );
  }

  return config;
}
