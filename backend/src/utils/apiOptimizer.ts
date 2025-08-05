/**
 * API optimization utilities for improving response times
 */
import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from './performanceMonitor';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  keyGenerator?: (req: Request) => string;
}

export interface CompressionConfig {
  threshold: number; // Minimum response size to compress (bytes)
  level: number; // Compression level (1-9)
}

export interface OptimizationConfig {
  cache?: CacheConfig;
  compression?: CompressionConfig;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

class ApiOptimizer {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  // Response caching middleware
  public cacheMiddleware(config: CacheConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : this.generateCacheKey(req);

      // Check cache
      const cached = this.getFromCache(key);
      if (cached) {
        this.cacheStats.hits++;
        res.json(cached);
        return;
      }

      this.cacheStats.misses++;

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function (data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          ApiOptimizer.getInstance().setCache(key, data, config.ttl);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  // Database query optimization
  public async optimizeQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    cacheConfig?: { ttl: number; key: string }
  ): Promise<T> {
    const startTime = process.hrtime.bigint();

    try {
      // Check cache if configured
      if (cacheConfig) {
        const cached = this.getFromCache(cacheConfig.key);
        if (cached) {
          return cached as T;
        }
      }

      // Execute query with performance monitoring
      const result = await performanceMonitor.measureDatabaseOperation(
        queryName,
        queryFunction
      );

      // Cache result if configured
      if (cacheConfig) {
        this.setCache(cacheConfig.key, result, cacheConfig.ttl);
      }

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      console.error(
        `Query optimization failed for ${queryName} after ${duration.toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  }

  // Batch processing for multiple operations
  public async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    concurrency: number = 3
  ): Promise<R[]> {
    const results: R[] = [];
    const batches: T[][] = [];

    // Split items into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Process batches with limited concurrency
    const processBatch = async (batch: T[]): Promise<R[]> => {
      const batchPromises = batch.map(item => processor(item));
      return Promise.all(batchPromises);
    };

    // Process batches in parallel with concurrency limit
    for (let i = 0; i < batches.length; i += concurrency) {
      const concurrentBatches = batches.slice(i, i + concurrency);
      const batchPromises = concurrentBatches.map(processBatch);
      const batchResults = await Promise.all(batchPromises);

      // Flatten results
      batchResults.forEach(batchResult => {
        results.push(...batchResult);
      });
    }

    return results;
  }

  // Response compression middleware
  public compressionMiddleware(config: CompressionConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;

      res.send = function (data: any) {
        const responseSize = Buffer.byteLength(JSON.stringify(data));

        if (responseSize > config.threshold) {
          // Set compression headers
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding');
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Pagination optimization
  public optimizePagination(
    totalCount: number,
    page: number = 1,
    limit: number = 20
  ): {
    offset: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const maxLimit = 100; // Prevent excessive data fetching
    const safeLimit = Math.min(limit, maxLimit);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;
    const totalPages = Math.ceil(totalCount / safeLimit);

    return {
      offset,
      limit: safeLimit,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    };
  }

  // Field selection optimization
  public optimizeFieldSelection(data: any, fields?: string[]): any {
    if (!fields || fields.length === 0) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.selectFields(item, fields));
    }

    return this.selectFields(data, fields);
  }

  private selectFields(obj: any, fields: string[]): any {
    const result: any = {};

    fields.forEach(field => {
      if (field.includes('.')) {
        // Handle nested fields
        const [parent, ...nested] = field.split('.');
        if (obj[parent] && !result[parent]) {
          result[parent] = this.selectFields(obj[parent], [nested.join('.')]);
        }
      } else if (obj.hasOwnProperty(field)) {
        result[field] = obj[field];
      }
    });

    return result;
  }

  // Cache management
  private generateCacheKey(req: Request): string {
    return `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl * 1000) {
      this.cache.delete(key);
      this.cacheStats.evictions++;
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= 1000) {
      // Max cache size
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  public getCacheStats() {
    return {
      ...this.cacheStats,
      size: this.cache.size,
      hitRate:
        this.cacheStats.hits /
          (this.cacheStats.hits + this.cacheStats.misses) || 0,
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
  }

  // Singleton pattern
  private static instance: ApiOptimizer;

  public static getInstance(): ApiOptimizer {
    if (!ApiOptimizer.instance) {
      ApiOptimizer.instance = new ApiOptimizer();
    }
    return ApiOptimizer.instance;
  }
}

// Utility functions for common optimizations
export const apiOptimizer = ApiOptimizer.getInstance();

// Middleware factory functions
export function createCacheMiddleware(config: CacheConfig) {
  return apiOptimizer.cacheMiddleware(config);
}

export function createCompressionMiddleware(config: CompressionConfig) {
  return apiOptimizer.compressionMiddleware(config);
}

// Database optimization helpers
export async function optimizeMailQuery<T>(
  queryName: string,
  queryFunction: () => Promise<T>,
  mailboxId?: string,
  ttl: number = 300 // 5 minutes
): Promise<T> {
  const cacheKey = mailboxId
    ? `mail:${mailboxId}:${queryName}`
    : `mail:${queryName}`;

  return apiOptimizer.optimizeQuery(queryName, queryFunction, {
    ttl,
    key: cacheKey,
  });
}

export async function optimizeMailboxQuery<T>(
  queryName: string,
  queryFunction: () => Promise<T>,
  mailboxId: string,
  ttl: number = 600 // 10 minutes
): Promise<T> {
  return apiOptimizer.optimizeQuery(queryName, queryFunction, {
    ttl,
    key: `mailbox:${mailboxId}:${queryName}`,
  });
}

// Response optimization helpers
export function optimizeMailResponse(mails: any[], fields?: string[]) {
  // Default fields for mail list to reduce payload size
  const defaultFields = [
    'id',
    'from',
    'subject',
    'receivedAt',
    'isRead',
    'size',
    'hasAttachments',
  ];

  return apiOptimizer.optimizeFieldSelection(mails, fields || defaultFields);
}

export function optimizeMailboxResponse(mailbox: any, fields?: string[]) {
  const defaultFields = [
    'id',
    'address',
    'expiresAt',
    'extensionCount',
    'isActive',
    'mailCount',
  ];

  return apiOptimizer.optimizeFieldSelection(mailbox, fields || defaultFields);
}

// Performance monitoring for optimization
export function trackOptimizationMetrics() {
  const cacheStats = apiOptimizer.getCacheStats();

  console.log('API Optimization Metrics:', {
    cache: cacheStats,
    timestamp: new Date().toISOString(),
  });

  return cacheStats;
}

// Cleanup function
export function cleanupOptimizer(): void {
  apiOptimizer.clearCache();
}
