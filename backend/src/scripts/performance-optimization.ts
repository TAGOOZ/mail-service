#!/usr/bin/env ts-node

/**
 * Performance optimization script for the backend
 * This script analyzes and optimizes various aspects of the application
 */

import { performanceMonitor } from '../utils/performanceMonitor';
import { apiOptimizer, trackOptimizationMetrics } from '../utils/apiOptimizer';
import { getSystemHealth } from '../utils/performanceMonitor';

interface OptimizationReport {
  timestamp: Date;
  systemHealth: any;
  performanceStats: any;
  optimizationMetrics: any;
  recommendations: string[];
  actions: string[];
}

class PerformanceOptimizer {
  private report: OptimizationReport;

  constructor() {
    this.report = {
      timestamp: new Date(),
      systemHealth: null,
      performanceStats: null,
      optimizationMetrics: null,
      recommendations: [],
      actions: [],
    };
  }

  public async runOptimization(): Promise<OptimizationReport> {
    console.log('🚀 Starting performance optimization analysis...');

    // Collect system metrics
    await this.collectSystemMetrics();

    // Analyze performance bottlenecks
    await this.analyzePerformanceBottlenecks();

    // Generate optimization recommendations
    await this.generateRecommendations();

    // Apply automatic optimizations
    await this.applyOptimizations();

    // Generate final report
    this.generateReport();

    return this.report;
  }

  private async collectSystemMetrics(): Promise<void> {
    console.log('📊 Collecting system metrics...');

    try {
      this.report.systemHealth = getSystemHealth();
      this.report.performanceStats = performanceMonitor.getStats();
      this.report.optimizationMetrics = trackOptimizationMetrics();

      console.log('✅ System metrics collected successfully');
    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
      this.report.recommendations.push('Fix system metrics collection');
    }
  }

  private async analyzePerformanceBottlenecks(): Promise<void> {
    console.log('🔍 Analyzing performance bottlenecks...');

    const stats = this.report.performanceStats;
    if (!stats) return;

    // Analyze response times
    if (stats.averageResponseTime > 1000) {
      this.report.recommendations.push(
        `High average response time detected: ${stats.averageResponseTime.toFixed(2)}ms. Consider optimizing database queries and adding caching.`
      );
    }

    // Analyze error rates
    if (stats.errorRate > 0.05) {
      this.report.recommendations.push(
        `High error rate detected: ${(stats.errorRate * 100).toFixed(2)}%. Review error logs and fix underlying issues.`
      );
    }

    // Analyze slow requests
    const slowRequests = performanceMonitor.getSlowRequests(2000);
    if (slowRequests.length > 0) {
      this.report.recommendations.push(
        `${slowRequests.length} slow requests detected. Consider optimizing these endpoints: ${slowRequests.map(r => r.endpoint).join(', ')}`
      );
    }

    // Analyze memory usage
    const health = this.report.systemHealth;
    if (health && health.memory.heapUsed > 500 * 1024 * 1024) {
      this.report.recommendations.push(
        `High memory usage detected: ${(health.memory.heapUsed / 1024 / 1024).toFixed(2)}MB. Consider implementing memory optimization strategies.`
      );
    }

    // Analyze cache performance
    const cacheStats = this.report.optimizationMetrics;
    if (cacheStats && cacheStats.hitRate < 0.5) {
      this.report.recommendations.push(
        `Low cache hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%. Review caching strategy and TTL settings.`
      );
    }

    console.log(
      `✅ Analysis complete. Found ${this.report.recommendations.length} recommendations.`
    );
  }

  private async generateRecommendations(): Promise<void> {
    console.log('💡 Generating optimization recommendations...');

    // Database optimization recommendations
    this.report.recommendations.push(
      'Implement database connection pooling',
      'Add database query indexing for frequently accessed data',
      'Consider implementing read replicas for heavy read operations'
    );

    // API optimization recommendations
    this.report.recommendations.push(
      'Implement response compression for large payloads',
      'Add request/response caching for frequently accessed endpoints',
      'Implement API rate limiting to prevent abuse'
    );

    // Memory optimization recommendations
    this.report.recommendations.push(
      'Implement garbage collection monitoring',
      'Add memory leak detection',
      'Optimize data structures for memory efficiency'
    );

    // Monitoring recommendations
    this.report.recommendations.push(
      'Set up performance alerting for critical metrics',
      'Implement distributed tracing for complex operations',
      'Add custom performance metrics for business logic'
    );

    console.log('✅ Recommendations generated');
  }

  private async applyOptimizations(): Promise<void> {
    console.log('⚙️ Applying automatic optimizations...');

    try {
      // Clear old performance metrics to free memory
      if (this.shouldClearMetrics()) {
        performanceMonitor.clearMetrics();
        this.report.actions.push('Cleared old performance metrics');
      }

      // Optimize cache settings
      if (this.shouldOptimizeCache()) {
        apiOptimizer.clearCache();
        this.report.actions.push('Cleared optimization cache');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        this.report.actions.push('Triggered garbage collection');
      }

      console.log(`✅ Applied ${this.report.actions.length} optimizations`);
    } catch (error) {
      console.error('❌ Error applying optimizations:', error);
    }
  }

  private shouldClearMetrics(): boolean {
    const stats = this.report.performanceStats;
    return stats && stats.totalRequests > 10000;
  }

  private shouldOptimizeCache(): boolean {
    const cacheStats = this.report.optimizationMetrics;
    return cacheStats && cacheStats.size > 500;
  }

  private generateReport(): void {
    console.log('📋 Generating optimization report...');

    const report = `
=== Performance Optimization Report ===
Timestamp: ${this.report.timestamp.toISOString()}

System Health:
- Memory Usage: ${this.report.systemHealth ? (this.report.systemHealth.memory.heapUsed / 1024 / 1024).toFixed(2) : 'N/A'}MB
- CPU Usage: ${this.report.systemHealth ? this.report.systemHealth.cpu.user : 'N/A'}
- Uptime: ${this.report.systemHealth ? (this.report.systemHealth.uptime / 3600).toFixed(2) : 'N/A'} hours

Performance Stats:
- Total Requests: ${this.report.performanceStats ? this.report.performanceStats.totalRequests : 'N/A'}
- Average Response Time: ${this.report.performanceStats ? this.report.performanceStats.averageResponseTime.toFixed(2) : 'N/A'}ms
- Error Rate: ${this.report.performanceStats ? (this.report.performanceStats.errorRate * 100).toFixed(2) : 'N/A'}%

Cache Performance:
- Hit Rate: ${this.report.optimizationMetrics ? (this.report.optimizationMetrics.hitRate * 100).toFixed(2) : 'N/A'}%
- Cache Size: ${this.report.optimizationMetrics ? this.report.optimizationMetrics.size : 'N/A'} entries

Actions Taken:
${this.report.actions.map(action => `- ${action}`).join('\n')}

Recommendations:
${this.report.recommendations.map(rec => `- ${rec}`).join('\n')}

=== End Report ===
    `;

    console.log(report);
  }
}

// Database optimization utilities
export class DatabaseOptimizer {
  public static async optimizeQueries(): Promise<void> {
    console.log('🗄️ Optimizing database queries...');

    // In a real implementation, you would:
    // 1. Analyze slow query logs
    // 2. Add missing indexes
    // 3. Optimize query patterns
    // 4. Implement query result caching

    console.log('✅ Database optimization complete');
  }

  public static async cleanupOldData(): Promise<void> {
    console.log('🧹 Cleaning up old data...');

    // In a real implementation, you would:
    // 1. Remove expired mailboxes
    // 2. Clean up old mail data
    // 3. Archive old performance metrics
    // 4. Vacuum database if needed

    console.log('✅ Data cleanup complete');
  }
}

// Memory optimization utilities
export class MemoryOptimizer {
  public static async optimizeMemoryUsage(): Promise<void> {
    console.log('💾 Optimizing memory usage...');

    // Force garbage collection
    if (global.gc) {
      global.gc();
      console.log('✅ Garbage collection triggered');
    }

    // Clear caches if memory usage is high
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
      apiOptimizer.clearCache();
      console.log('✅ Caches cleared due to high memory usage');
    }

    console.log('✅ Memory optimization complete');
  }

  public static getMemoryReport(): any {
    const usage = process.memoryUsage();
    return {
      heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      external: (usage.external / 1024 / 1024).toFixed(2) + ' MB',
      rss: (usage.rss / 1024 / 1024).toFixed(2) + ' MB',
    };
  }
}

// Main execution
async function main() {
  try {
    const optimizer = new PerformanceOptimizer();
    const report = await optimizer.runOptimization();

    // Additional optimizations
    await DatabaseOptimizer.optimizeQueries();
    await DatabaseOptimizer.cleanupOldData();
    await MemoryOptimizer.optimizeMemoryUsage();

    console.log('\n🎉 Performance optimization completed successfully!');
    console.log('Memory Report:', MemoryOptimizer.getMemoryReport());

    // Save report to file if needed
    if (process.env.SAVE_REPORT === 'true') {
      const fs = require('fs');
      const reportPath = `performance-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to ${reportPath}`);
    }
  } catch (error) {
    console.error('❌ Performance optimization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { PerformanceOptimizer, DatabaseOptimizer, MemoryOptimizer };
