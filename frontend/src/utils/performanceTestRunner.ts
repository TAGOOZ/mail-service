/**
 * Performance test runner for automated performance testing
 */

export interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  actualValue: number;
  expectedThreshold: number;
  unit: string;
  timestamp: Date;
  details?: any;
}

export interface PerformanceTestSuite {
  name: string;
  tests: PerformanceTest[];
}

export interface PerformanceTest {
  name: string;
  threshold: number;
  unit: string;
  testFunction: () => Promise<number> | number;
}

export class PerformanceTestRunner {
  private results: PerformanceTestResult[] = [];
  private isRunning = false;

  constructor() {}

  public async runTest(test: PerformanceTest): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    try {
      const actualValue = await test.testFunction();
      const passed = actualValue <= test.threshold;

      const result: PerformanceTestResult = {
        testName: test.name,
        passed,
        actualValue,
        expectedThreshold: test.threshold,
        unit: test.unit,
        timestamp: new Date(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: PerformanceTestResult = {
        testName: test.name,
        passed: false,
        actualValue: -1,
        expectedThreshold: test.threshold,
        unit: test.unit,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };

      this.results.push(result);
      return result;
    }
  }

  public async runTestSuite(
    suite: PerformanceTestSuite
  ): Promise<PerformanceTestResult[]> {
    this.isRunning = true;
    const suiteResults: PerformanceTestResult[] = [];

    console.log(`Running performance test suite: ${suite.name}`);

    for (const test of suite.tests) {
      console.log(`Running test: ${test.name}`);
      const result = await this.runTest(test);
      suiteResults.push(result);

      console.log(
        `Test ${test.name}: ${result.passed ? 'PASSED' : 'FAILED'} - ${result.actualValue}${result.unit} (threshold: ${result.expectedThreshold}${result.unit})`
      );
    }

    this.isRunning = false;
    return suiteResults;
  }

  public getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  public getLatestResults(count: number = 10): PerformanceTestResult[] {
    return this.results.slice(-count);
  }

  public clearResults(): void {
    this.results = [];
  }

  public generateReport(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    results: PerformanceTestResult[];
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      results: this.results,
    };
  }

  public isTestRunning(): boolean {
    return this.isRunning;
  }
}

// Predefined performance test suites
export const createPageLoadTestSuite = (): PerformanceTestSuite => ({
  name: 'Page Load Performance',
  tests: [
    {
      name: 'DOM Content Loaded',
      threshold: 2000,
      unit: 'ms',
      testFunction: () => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return (
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart
        );
      },
    },
    {
      name: 'First Contentful Paint',
      threshold: 3000,
      unit: 'ms',
      testFunction: () => {
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        return fcp ? fcp.startTime : 0;
      },
    },
    {
      name: 'Largest Contentful Paint',
      threshold: 4000,
      unit: 'ms',
      testFunction: () => {
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
      },
    },
    {
      name: 'Total Resource Size',
      threshold: 2 * 1024 * 1024, // 2MB
      unit: 'bytes',
      testFunction: () => {
        const resources = performance.getEntriesByType('resource');
        return resources.reduce((total, resource) => {
          return (
            total + ((resource as PerformanceResourceTiming).transferSize || 0)
          );
        }, 0);
      },
    },
    {
      name: 'Resource Count',
      threshold: 50,
      unit: 'count',
      testFunction: () => {
        return performance.getEntriesByType('resource').length;
      },
    },
  ],
});

export const createMemoryTestSuite = (): PerformanceTestSuite => ({
  name: 'Memory Usage Performance',
  tests: [
    {
      name: 'Used JS Heap Size',
      threshold: 50 * 1024 * 1024, // 50MB
      unit: 'bytes',
      testFunction: () => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      },
    },
    {
      name: 'DOM Node Count',
      threshold: 1000,
      unit: 'count',
      testFunction: () => {
        return document.querySelectorAll('*').length;
      },
    },
  ],
});

export const createApiPerformanceTestSuite = (
  apiEndpoints: string[]
): PerformanceTestSuite => ({
  name: 'API Performance',
  tests: apiEndpoints.map(endpoint => ({
    name: `API Response Time - ${endpoint}`,
    threshold: 2000,
    unit: 'ms',
    testFunction: async () => {
      const startTime = performance.now();
      try {
        const response = await fetch(endpoint);
        await response.json();
        return performance.now() - startTime;
      } catch (error) {
        return performance.now() - startTime;
      }
    },
  })),
});

export const createMailHandlingTestSuite = (): PerformanceTestSuite => ({
  name: 'Mail Handling Performance',
  tests: [
    {
      name: 'Mail List Render Time',
      threshold: 1000,
      unit: 'ms',
      testFunction: () => {
        return new Promise<number>(resolve => {
          const startTime = performance.now();

          // Simulate mail list rendering
          const observer = new MutationObserver(() => {
            const mailItems = document.querySelectorAll(
              '[data-testid="mail-item"]'
            );
            if (mailItems.length > 0) {
              observer.disconnect();
              resolve(performance.now() - startTime);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });

          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(performance.now() - startTime);
          }, 5000);
        });
      },
    },
    {
      name: 'Mail Content Render Time',
      threshold: 2000,
      unit: 'ms',
      testFunction: () => {
        return new Promise<number>(resolve => {
          const startTime = performance.now();

          // Simulate mail content rendering
          const observer = new MutationObserver(() => {
            const mailContent = document.querySelector(
              '[data-testid="mail-content"]'
            );
            if (mailContent) {
              observer.disconnect();
              resolve(performance.now() - startTime);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });

          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(performance.now() - startTime);
          }, 5000);
        });
      },
    },
  ],
});

// Singleton instance
let testRunnerInstance: PerformanceTestRunner | null = null;

export function getPerformanceTestRunner(): PerformanceTestRunner {
  if (!testRunnerInstance) {
    testRunnerInstance = new PerformanceTestRunner();
  }
  return testRunnerInstance;
}
