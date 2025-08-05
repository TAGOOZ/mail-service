/**
 * Performance monitoring API routes
 */
import { Router, Request, Response } from 'express';
import {
  performanceMonitor,
  getSystemHealth,
} from '../utils/performanceMonitor';
import {
  apiOptimizer,
  trackOptimizationMetrics,
  createCacheMiddleware,
} from '../utils/apiOptimizer';

const router = Router();

/**
 * Get performance statistics
 */
router.get(
  '/stats',
  createCacheMiddleware({ ttl: 30, maxSize: 100 }),
  (req: Request, res: Response) => {
    try {
      const timeWindow = req.query.timeWindow
        ? parseInt(req.query.timeWindow as string)
        : undefined;
      const stats = performanceMonitor.getStats(timeWindow);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting performance stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance statistics',
      });
    }
  }
);

/**
 * Get metrics for a specific endpoint
 */
router.get('/endpoint/:endpoint', (req: Request, res: Response) => {
  try {
    const endpoint = decodeURIComponent(req.params.endpoint);
    const timeWindow = req.query.timeWindow
      ? parseInt(req.query.timeWindow as string)
      : undefined;
    const metrics = performanceMonitor.getMetricsByEndpoint(
      endpoint,
      timeWindow
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting endpoint metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get endpoint metrics',
    });
  }
});

/**
 * Get slow requests
 */
router.get('/slow-requests', (req: Request, res: Response) => {
  try {
    const threshold = req.query.threshold
      ? parseInt(req.query.threshold as string)
      : undefined;
    const slowRequests = performanceMonitor.getSlowRequests(threshold);

    res.json({
      success: true,
      data: slowRequests,
    });
  } catch (error) {
    console.error('Error getting slow requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get slow requests',
    });
  }
});

/**
 * Get system health information
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const health = getSystemHealth();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
    });
  }
});

/**
 * Export performance metrics (for analysis)
 */
router.get('/export', (req: Request, res: Response) => {
  try {
    const metrics = performanceMonitor.exportMetrics();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=performance-metrics.json'
    );
    res.json(metrics);
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics',
    });
  }
});

/**
 * Clear performance metrics (admin only)
 */
router.delete('/metrics', (req: Request, res: Response) => {
  try {
    // In a real application, you'd want to add authentication here
    performanceMonitor.clearMetrics();

    res.json({
      success: true,
      message: 'Performance metrics cleared',
    });
  } catch (error) {
    console.error('Error clearing metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear metrics',
    });
  }
});

/**
 * Performance test endpoint - simulates different response times
 */
router.get('/test/:delay?', async (req: Request, res: Response) => {
  try {
    const delay = parseInt(req.params.delay || '0');

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Simulate some CPU work
    const iterations = parseInt(req.query.iterations as string) || 1000;
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.random();
    }

    res.json({
      success: true,
      message: `Performance test completed with ${delay}ms delay and ${iterations} iterations`,
      result: result.toFixed(2),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error in performance test:', error);
    res.status(500).json({
      success: false,
      error: 'Performance test failed',
    });
  }
});

/**
 * Get optimization metrics
 */
router.get('/optimization', (req: Request, res: Response) => {
  try {
    const optimizationMetrics = trackOptimizationMetrics();

    res.json({
      success: true,
      data: optimizationMetrics,
    });
  } catch (error) {
    console.error('Error getting optimization metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization metrics',
    });
  }
});

/**
 * Performance benchmark endpoint
 */
router.post('/benchmark', async (req: Request, res: Response) => {
  try {
    const { testType, iterations = 1000, payload } = req.body;
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    let result: any = {};

    switch (testType) {
      case 'cpu':
        // CPU intensive test
        let cpuResult = 0;
        for (let i = 0; i < iterations; i++) {
          cpuResult += Math.sqrt(Math.random() * 1000);
        }
        result.cpuResult = cpuResult;
        break;

      case 'memory':
        // Memory allocation test
        const arrays: number[][] = [];
        for (let i = 0; i < iterations; i++) {
          arrays.push(new Array(1000).fill(Math.random()));
        }
        result.arrayCount = arrays.length;
        break;

      case 'io':
        // Simulated I/O operations
        const promises = [];
        for (let i = 0; i < Math.min(iterations, 100); i++) {
          promises.push(new Promise(resolve => setTimeout(resolve, 1)));
        }
        await Promise.all(promises);
        result.ioOperations = promises.length;
        break;

      case 'json':
        // JSON processing test
        const testData = payload || {
          test: 'data',
          number: 123,
          array: [1, 2, 3],
        };
        for (let i = 0; i < iterations; i++) {
          JSON.parse(JSON.stringify(testData));
        }
        result.jsonOperations = iterations;
        break;

      default:
        throw new Error('Invalid test type');
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    res.json({
      success: true,
      data: {
        testType,
        iterations,
        duration,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          rss: endMemory.rss - startMemory.rss,
        },
        result,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error running benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Benchmark failed',
    });
  }
});

/**
 * Load testing endpoint
 */
router.post('/load-test', async (req: Request, res: Response) => {
  try {
    const {
      concurrency = 10,
      requests = 100,
      endpoint = '/api/performance/test',
      delay = 0,
    } = req.body;

    const startTime = Date.now();
    const results: Array<{
      duration: number;
      success: boolean;
      statusCode?: number;
    }> = [];

    // Create concurrent requests
    const createRequest = async (): Promise<{
      duration: number;
      success: boolean;
      statusCode?: number;
    }> => {
      const requestStart = Date.now();
      try {
        // Simulate API call
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const requestEnd = Date.now();
        return {
          duration: requestEnd - requestStart,
          success: true,
          statusCode: 200,
        };
      } catch (error) {
        const requestEnd = Date.now();
        return {
          duration: requestEnd - requestStart,
          success: false,
          statusCode: 500,
        };
      }
    };

    // Execute load test
    const batches = Math.ceil(requests / concurrency);
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, requests - batch * concurrency);
      const batchPromises = Array.from({ length: batchSize }, createRequest);
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r.success).length;
    const averageResponseTime =
      results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const minResponseTime = Math.min(...results.map(r => r.duration));
    const maxResponseTime = Math.max(...results.map(r => r.duration));

    res.json({
      success: true,
      data: {
        totalRequests: requests,
        successfulRequests,
        failedRequests: requests - successfulRequests,
        successRate: (successfulRequests / requests) * 100,
        totalTime,
        averageResponseTime,
        minResponseTime,
        maxResponseTime,
        requestsPerSecond: requests / (totalTime / 1000),
        concurrency,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error running load test:', error);
    res.status(500).json({
      success: false,
      error: 'Load test failed',
    });
  }
});

/**
 * Clear optimization cache
 */
router.delete('/cache', (req: Request, res: Response) => {
  try {
    apiOptimizer.clearCache();

    res.json({
      success: true,
      message: 'Optimization cache cleared',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

export default router;
