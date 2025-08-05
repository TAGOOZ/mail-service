#!/usr/bin/env node

/**
 * Performance monitoring script
 * This script can be run periodically to monitor application performance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.config = {
      frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        thresholds: {
          loadTime: 5000, // 5 seconds
          firstContentfulPaint: 3000, // 3 seconds
          largestContentfulPaint: 4000, // 4 seconds
          memoryUsage: 50 * 1024 * 1024, // 50MB
        },
      },
      backend: {
        url: process.env.BACKEND_URL || 'http://localhost:8000',
        thresholds: {
          responseTime: 2000, // 2 seconds
          errorRate: 0.05, // 5%
          memoryUsage: 500 * 1024 * 1024, // 500MB
        },
      },
      reportPath: process.env.REPORT_PATH || './performance-reports',
    };

    this.ensureReportDirectory();
  }

  ensureReportDirectory() {
    if (!fs.existsSync(this.config.reportPath)) {
      fs.mkdirSync(this.config.reportPath, { recursive: true });
    }
  }

  async runFrontendTests() {
    console.log('🌐 Running frontend performance tests...');

    try {
      // Run Playwright performance tests
      const testCommand = 'npm run test:e2e -- --grep "Performance"';
      const output = execSync(testCommand, {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 300000, // 5 minutes timeout
      });

      console.log('✅ Frontend performance tests completed');
      return {
        success: true,
        output: output,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Frontend performance tests failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  async runBackendTests() {
    console.log('🔧 Running backend performance tests...');

    try {
      // Test backend health endpoint
      const healthResponse = await this.fetchWithTimeout(
        `${this.config.backend.url}/api/performance/health`,
        { timeout: 10000 }
      );

      // Test backend performance stats
      const statsResponse = await this.fetchWithTimeout(
        `${this.config.backend.url}/api/performance/stats`,
        { timeout: 10000 }
      );

      // Run performance benchmark
      const benchmarkResponse = await this.fetchWithTimeout(
        `${this.config.backend.url}/api/performance/benchmark`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testType: 'cpu',
            iterations: 1000,
          }),
          timeout: 30000,
        }
      );

      console.log('✅ Backend performance tests completed');
      return {
        success: true,
        health: healthResponse,
        stats: statsResponse,
        benchmark: benchmarkResponse,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Backend performance tests failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  async fetchWithTimeout(url, options = {}) {
    const { timeout = 10000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async runLoadTests() {
    console.log('⚡ Running load tests...');

    try {
      // Run backend load test
      const loadTestResponse = await this.fetchWithTimeout(
        `${this.config.backend.url}/api/performance/load-test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concurrency: 10,
            requests: 100,
            delay: 100,
          }),
          timeout: 60000, // 1 minute timeout
        }
      );

      console.log('✅ Load tests completed');
      return {
        success: true,
        results: loadTestResponse,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Load tests failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  analyzeResults(frontendResults, backendResults, loadTestResults) {
    console.log('📊 Analyzing performance results...');

    const analysis = {
      timestamp: new Date(),
      overall: 'pass',
      issues: [],
      recommendations: [],
      metrics: {
        frontend: frontendResults,
        backend: backendResults,
        loadTest: loadTestResults,
      },
    };

    // Analyze frontend results
    if (!frontendResults.success) {
      analysis.overall = 'fail';
      analysis.issues.push('Frontend performance tests failed');
      analysis.recommendations.push(
        'Review frontend performance optimizations'
      );
    }

    // Analyze backend results
    if (!backendResults.success) {
      analysis.overall = 'fail';
      analysis.issues.push('Backend performance tests failed');
      analysis.recommendations.push('Review backend performance optimizations');
    } else if (backendResults.stats && backendResults.stats.data) {
      const stats = backendResults.stats.data;

      if (
        stats.averageResponseTime > this.config.backend.thresholds.responseTime
      ) {
        analysis.overall = 'warning';
        analysis.issues.push(
          `High average response time: ${stats.averageResponseTime.toFixed(2)}ms`
        );
        analysis.recommendations.push('Optimize API response times');
      }

      if (stats.errorRate > this.config.backend.thresholds.errorRate) {
        analysis.overall = 'fail';
        analysis.issues.push(
          `High error rate: ${(stats.errorRate * 100).toFixed(2)}%`
        );
        analysis.recommendations.push('Investigate and fix API errors');
      }
    }

    // Analyze load test results
    if (!loadTestResults.success) {
      analysis.overall = 'warning';
      analysis.issues.push('Load tests failed');
      analysis.recommendations.push('Review system capacity and scaling');
    } else if (loadTestResults.results && loadTestResults.results.data) {
      const loadData = loadTestResults.results.data;

      if (loadData.successRate < 95) {
        analysis.overall = 'fail';
        analysis.issues.push(
          `Low success rate under load: ${loadData.successRate.toFixed(2)}%`
        );
        analysis.recommendations.push('Improve system reliability under load');
      }

      if (
        loadData.averageResponseTime >
        this.config.backend.thresholds.responseTime
      ) {
        analysis.overall = 'warning';
        analysis.issues.push(
          `High response time under load: ${loadData.averageResponseTime.toFixed(2)}ms`
        );
        analysis.recommendations.push('Optimize performance under load');
      }
    }

    return analysis;
  }

  generateReport(analysis) {
    const reportData = {
      ...analysis,
      config: this.config,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
      },
    };

    // Save detailed JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReportPath = path.join(
      this.config.reportPath,
      `performance-report-${timestamp}.json`
    );
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Generate human-readable summary
    const summary = this.generateSummary(analysis);
    const summaryPath = path.join(
      this.config.reportPath,
      `performance-summary-${timestamp}.txt`
    );
    fs.writeFileSync(summaryPath, summary);

    console.log(`📄 Reports saved:`);
    console.log(`  - JSON: ${jsonReportPath}`);
    console.log(`  - Summary: ${summaryPath}`);

    return { jsonReportPath, summaryPath };
  }

  generateSummary(analysis) {
    const statusEmoji = {
      pass: '✅',
      warning: '⚠️',
      fail: '❌',
    };

    return `
=== Performance Monitoring Report ===
Timestamp: ${analysis.timestamp.toISOString()}
Overall Status: ${statusEmoji[analysis.overall]} ${analysis.overall.toUpperCase()}

Issues Found: ${analysis.issues.length}
${analysis.issues.map(issue => `- ${issue}`).join('\n')}

Recommendations: ${analysis.recommendations.length}
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

Frontend Tests: ${analysis.metrics.frontend.success ? '✅ PASS' : '❌ FAIL'}
Backend Tests: ${analysis.metrics.backend.success ? '✅ PASS' : '❌ FAIL'}
Load Tests: ${analysis.metrics.loadTest.success ? '✅ PASS' : '❌ FAIL'}

=== End Report ===
    `.trim();
  }

  async sendAlert(analysis) {
    if (analysis.overall === 'fail') {
      console.log('🚨 ALERT: Critical performance issues detected!');

      // In a real implementation, you would send alerts via:
      // - Email
      // - Slack
      // - PagerDuty
      // - etc.

      if (process.env.WEBHOOK_URL) {
        try {
          await this.fetchWithTimeout(process.env.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 Performance Alert: ${analysis.issues.join(', ')}`,
              timestamp: analysis.timestamp,
            }),
            timeout: 10000,
          });
          console.log('✅ Alert sent successfully');
        } catch (error) {
          console.error('❌ Failed to send alert:', error.message);
        }
      }
    }
  }

  async run() {
    console.log('🚀 Starting performance monitoring...');
    console.log(`Frontend URL: ${this.config.frontend.url}`);
    console.log(`Backend URL: ${this.config.backend.url}`);

    try {
      // Run all performance tests
      const [frontendResults, backendResults, loadTestResults] =
        await Promise.all([
          this.runFrontendTests(),
          this.runBackendTests(),
          this.runLoadTests(),
        ]);

      // Analyze results
      const analysis = this.analyzeResults(
        frontendResults,
        backendResults,
        loadTestResults
      );

      // Generate reports
      const reportPaths = this.generateReport(analysis);

      // Send alerts if needed
      await this.sendAlert(analysis);

      // Print summary
      console.log('\n' + this.generateSummary(analysis));

      console.log('\n🎉 Performance monitoring completed successfully!');

      // Exit with appropriate code
      process.exit(analysis.overall === 'fail' ? 1 : 0);
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error);
      process.exit(1);
    }
  }
}

// CLI interface
function printUsage() {
  console.log(`
Usage: node performance-monitor.js [options]

Options:
  --frontend-url <url>    Frontend URL to test (default: http://localhost:3000)
  --backend-url <url>     Backend URL to test (default: http://localhost:8000)
  --report-path <path>    Path to save reports (default: ./performance-reports)
  --webhook-url <url>     Webhook URL for alerts
  --help                  Show this help message

Environment Variables:
  FRONTEND_URL           Frontend URL to test
  BACKEND_URL            Backend URL to test
  REPORT_PATH            Path to save reports
  WEBHOOK_URL            Webhook URL for alerts
  `);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--frontend-url':
        config.FRONTEND_URL = args[++i];
        break;
      case '--backend-url':
        config.BACKEND_URL = args[++i];
        break;
      case '--report-path':
        config.REPORT_PATH = args[++i];
        break;
      case '--webhook-url':
        config.WEBHOOK_URL = args[++i];
        break;
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  // Set environment variables from CLI args
  Object.assign(process.env, config);
}

// Main execution
if (require.main === module) {
  parseArgs();

  const monitor = new PerformanceMonitor();
  monitor.run().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceMonitor;
