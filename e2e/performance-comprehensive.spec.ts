import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils } from './utils/mailUtils';
import { getTestConfig } from './test-config';

test.describe('Comprehensive Performance Tests', () => {
  const testConfig = getTestConfig();

  test.beforeEach(async ({ page }) => {
    // Clear browser cache and storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should measure complete page load performance metrics', async ({
    page,
  }) => {
    const homePage = new HomePage(page);

    // Start performance measurement
    await page.addInitScript(() => {
      window.performanceMarks = [];
      window.addEventListener('load', () => {
        window.performanceMarks.push({
          name: 'page-load-complete',
          timestamp: performance.now(),
        });
      });
    });

    const navigationStart = Date.now();
    await homePage.goto();
    await homePage.waitForPageLoad();
    const navigationEnd = Date.now();

    // Collect comprehensive performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');

      return {
        navigation: {
          domContentLoaded:
            navigation.domContentLoadedEventEnd -
            navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive:
            navigation.domInteractive - navigation.navigationStart,
          responseStart: navigation.responseStart - navigation.navigationStart,
          responseEnd: navigation.responseEnd - navigation.navigationStart,
        },
        paint: {
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint:
            paint.find(p => p.name === 'first-contentful-paint')?.startTime ||
            0,
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
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            }
          : null,
        timing: {
          navigationTime: navigationEnd - navigationStart,
        },
      };
    });

    console.log(
      'Comprehensive Performance Metrics:',
      JSON.stringify(metrics, null, 2)
    );

    // Assert performance thresholds
    expect(metrics.navigation.domContentLoaded).toBeLessThan(2000);
    expect(metrics.navigation.loadComplete).toBeLessThan(3000);
    expect(metrics.paint.firstContentfulPaint).toBeLessThan(3000);
    expect(metrics.resources.totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB
    expect(metrics.resources.count).toBeLessThan(100);
    expect(metrics.timing.navigationTime).toBeLessThan(5000);

    if (metrics.memory) {
      expect(metrics.memory.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
  });

  test('should handle large mail volumes efficiently', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Generate large number of test mails
    const mailCount = 50;
    const testMails = [];

    console.log(`Generating ${mailCount} test mails...`);
    const generationStart = Date.now();

    for (let i = 0; i < mailCount; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Performance Test Mail ${i + 1}`;
      testMail.htmlContent = `
        <html>
          <body>
            <h1>Test Mail ${i + 1}</h1>
            <p>This is a test mail for performance testing with some content.</p>
            <div>${'Lorem ipsum '.repeat(100)}</div>
          </body>
        </html>
      `;
      testMails.push(testMail);
    }

    // Send mails in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < testMails.length; i += batchSize) {
      const batch = testMails.slice(i, i + batchSize);
      const batchPromises = batch.map(mail =>
        MailUtils.sendTestMail(page, mail)
      );
      await Promise.all(batchPromises);

      // Small delay between batches
      await page.waitForTimeout(100);
    }

    const generationEnd = Date.now();
    console.log(
      `Mail generation completed in ${generationEnd - generationStart}ms`
    );

    // Wait for all mails to be received and measure rendering performance
    const renderStart = Date.now();

    // Wait for mails to appear
    await page.waitForFunction(
      expectedCount => {
        const mailItems = document.querySelectorAll(
          '[data-testid="mail-item"]'
        );
        return mailItems.length >= expectedCount;
      },
      mailCount,
      { timeout: 60000 }
    );

    const renderEnd = Date.now();
    const renderTime = renderEnd - renderStart;

    console.log(
      `Mail list rendering completed in ${renderTime}ms for ${mailCount} mails`
    );

    // Test scrolling performance with large list
    const scrollStart = Date.now();
    await page.evaluate(() => {
      const mailList = document.querySelector('[data-testid="mail-list"]');
      if (mailList) {
        mailList.scrollTop = mailList.scrollHeight;
      }
    });
    await page.waitForTimeout(100);
    const scrollEnd = Date.now();
    const scrollTime = scrollEnd - scrollStart;

    console.log(`Scrolling performance: ${scrollTime}ms`);

    // Measure memory usage after loading many mails
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          }
        : null;
    });

    if (memoryUsage) {
      console.log(`Memory usage with ${mailCount} mails:`, memoryUsage);
    }

    // Assert performance expectations
    expect(renderTime).toBeLessThan(10000); // 10 seconds max for rendering
    expect(scrollTime).toBeLessThan(1000); // 1 second max for scrolling

    if (memoryUsage) {
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB max
    }

    // Verify all mails are displayed
    const finalCount = await mailboxPage.getMailCount();
    expect(finalCount).toBe(mailCount);
  });

  test('should optimize API response times', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Track API requests and responses
    const apiMetrics: Array<{
      url: string;
      method: string;
      duration: number;
      size: number;
      status: number;
    }> = [];

    const requestStartTimes = new Map<string, number>();

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestStartTimes.set(request.url(), Date.now());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const startTime = requestStartTimes.get(response.url());
        const duration = startTime ? Date.now() - startTime : 0;

        let size = 0;
        try {
          const body = await response.text();
          size = new Blob([body]).size;
        } catch (e) {
          // Ignore errors when getting response body
        }

        apiMetrics.push({
          url: response.url(),
          method: response.request().method(),
          duration,
          size,
          status: response.status(),
        });
      }
    });

    // Perform typical user flow
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Send a few test mails to trigger API calls
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    for (let i = 0; i < 3; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `API Performance Test ${i + 1}`;
      await MailUtils.sendTestMail(page, testMail);
    }

    // Wait for mails to be processed
    await page.waitForTimeout(2000);

    // Analyze API performance
    console.log('API Performance Metrics:');
    apiMetrics.forEach(metric => {
      console.log(
        `${metric.method} ${metric.url}: ${metric.duration}ms, ${metric.size} bytes, status: ${metric.status}`
      );
    });

    // Calculate statistics
    const responseTimes = apiMetrics.map(m => m.duration);
    const averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const slowRequests = apiMetrics.filter(m => m.duration > 2000);

    console.log(
      `Average API response time: ${averageResponseTime.toFixed(2)}ms`
    );
    console.log(`Max API response time: ${maxResponseTime}ms`);
    console.log(`Slow requests (>2s): ${slowRequests.length}`);

    // Assert API performance
    expect(averageResponseTime).toBeLessThan(1000); // Average should be under 1 second
    expect(maxResponseTime).toBeLessThan(5000); // Max should be under 5 seconds
    expect(slowRequests.length).toBeLessThan(2); // At most 1 slow request allowed

    // Check for successful responses
    const errorResponses = apiMetrics.filter(m => m.status >= 400);
    expect(errorResponses.length).toBe(0);
  });

  test('should maintain performance under concurrent users', async ({
    browser,
  }) => {
    const concurrentUsers = 5;
    const contexts = [];
    const pages = [];

    // Create multiple browser contexts to simulate concurrent users
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    const userMetrics: Array<{
      userId: number;
      mailboxGenerationTime: number;
      mailReceptionTime: number;
      totalTime: number;
    }> = [];

    try {
      // Simulate concurrent user actions
      const userPromises = pages.map(async (page, index) => {
        const userId = index + 1;
        const startTime = Date.now();

        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        // Generate mailbox
        const mailboxStart = Date.now();
        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();
        const mailboxEnd = Date.now();
        const mailboxGenerationTime = mailboxEnd - mailboxStart;

        // Send and receive mail
        const mailStart = Date.now();
        const mailboxAddress = await mailboxPage.getMailboxAddress();
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        testMail.subject = `Concurrent User ${userId} Test Mail`;

        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject, 10000);

        const mailEnd = Date.now();
        const mailReceptionTime = mailEnd - mailStart;

        const totalTime = Date.now() - startTime;

        return {
          userId,
          mailboxGenerationTime,
          mailReceptionTime,
          totalTime,
        };
      });

      const results = await Promise.all(userPromises);
      userMetrics.push(...results);

      // Analyze concurrent performance
      console.log('Concurrent User Performance:');
      results.forEach(result => {
        console.log(
          `User ${result.userId}: Mailbox: ${result.mailboxGenerationTime}ms, Mail: ${result.mailReceptionTime}ms, Total: ${result.totalTime}ms`
        );
      });

      const avgMailboxTime =
        results.reduce((sum, r) => sum + r.mailboxGenerationTime, 0) /
        results.length;
      const avgMailTime =
        results.reduce((sum, r) => sum + r.mailReceptionTime, 0) /
        results.length;
      const avgTotalTime =
        results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;

      console.log(
        `Average times - Mailbox: ${avgMailboxTime.toFixed(2)}ms, Mail: ${avgMailTime.toFixed(2)}ms, Total: ${avgTotalTime.toFixed(2)}ms`
      );

      // Assert concurrent performance
      expect(avgMailboxTime).toBeLessThan(5000); // 5 seconds average
      expect(avgMailTime).toBeLessThan(10000); // 10 seconds average
      expect(avgTotalTime).toBeLessThan(15000); // 15 seconds total average

      // Check that no user took excessively long
      const slowUsers = results.filter(r => r.totalTime > 30000);
      expect(slowUsers.length).toBe(0);
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should handle memory efficiently during extended usage', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          }
        : null;
    });

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Simulate extended usage with multiple operations
    const operations = 20;
    const memorySnapshots = [];

    for (let i = 0; i < operations; i++) {
      // Send mail
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Extended Usage Test ${i + 1}`;
      await MailUtils.sendTestMail(page, testMail);
      await MailUtils.waitForMail(page, mailboxId, testMail.subject, 5000);

      // Perform various UI operations
      await mailboxPage.refreshMails();
      await page.waitForTimeout(100);

      // Take memory snapshot
      const memory = await page.evaluate(() => {
        return (performance as any).memory
          ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              iteration: performance.now(),
            }
          : null;
      });

      if (memory) {
        memorySnapshots.push({ ...memory, operation: i + 1 });
      }

      // Trigger garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
    }

    // Analyze memory usage over time
    if (memorySnapshots.length > 0) {
      console.log('Memory usage during extended usage:');
      memorySnapshots.forEach(snapshot => {
        console.log(
          `Operation ${snapshot.operation}: ${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
        );
      });

      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = initialMemory
        ? finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
        : 0;

      console.log(
        `Memory growth during extended usage: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`
      );

      // Assert memory usage is reasonable
      expect(finalMemory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB max
      if (initialMemory) {
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB max growth
      }

      // Check for memory leaks (memory should not grow linearly)
      const firstHalf = memorySnapshots.slice(
        0,
        Math.floor(memorySnapshots.length / 2)
      );
      const secondHalf = memorySnapshots.slice(
        Math.floor(memorySnapshots.length / 2)
      );

      const firstHalfAvg =
        firstHalf.reduce((sum, s) => sum + s.usedJSHeapSize, 0) /
        firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, s) => sum + s.usedJSHeapSize, 0) /
        secondHalf.length;

      const memoryGrowthRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      console.log(
        `Memory growth rate: ${(memoryGrowthRate * 100).toFixed(2)}%`
      );

      // Memory growth should be reasonable (less than 50% increase)
      expect(memoryGrowthRate).toBeLessThan(0.5);
    }
  });

  test('should optimize rendering performance with complex mail content', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();

    // Create mail with complex HTML content
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    testMail.subject = 'Complex HTML Rendering Test';
    testMail.htmlContent = `
      <html>
        <head>
          <style>
            .container { padding: 20px; }
            .section { margin: 20px 0; border: 1px solid #ccc; padding: 15px; }
            .highlight { background-color: yellow; }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 1px solid #ddd; padding: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Complex HTML Content Test</h1>
            ${Array.from(
              { length: 50 },
              (_, i) => `
              <div class="section">
                <h2>Section ${i + 1}</h2>
                <p class="highlight">This is a highlighted paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
                <table>
                  <tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr>
                  ${Array.from(
                    { length: 5 },
                    (_, j) => `
                    <tr>
                      <td>Row ${j + 1}, Col 1</td>
                      <td>Row ${j + 1}, Col 2</td>
                      <td>Row ${j + 1}, Col 3</td>
                    </tr>
                  `
                  ).join('')}
                </table>
                <ul>
                  ${Array.from({ length: 10 }, (_, k) => `<li>List item ${k + 1}</li>`).join('')}
                </ul>
              </div>
            `
            ).join('')}
          </div>
        </body>
      </html>
    `;

    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Measure mail detail rendering performance
    const renderStart = Date.now();

    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Wait for content to be fully rendered
    await page.waitForSelector('[data-testid="mail-content"]');
    await page.waitForFunction(() => {
      const content = document.querySelector('[data-testid="mail-content"]');
      return content && content.children.length > 0;
    });

    const renderEnd = Date.now();
    const renderTime = renderEnd - renderStart;

    console.log(`Complex HTML rendering time: ${renderTime}ms`);

    // Test scrolling performance with complex content
    const scrollStart = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(100);

    const scrollEnd = Date.now();
    const scrollTime = scrollEnd - scrollStart;

    console.log(`Complex content scrolling time: ${scrollTime}ms`);

    // Measure DOM complexity
    const domStats = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const mailContent = document.querySelector(
        '[data-testid="mail-content"]'
      );
      const mailElements = mailContent ? mailContent.querySelectorAll('*') : [];

      return {
        totalElements: allElements.length,
        mailElements: mailElements.length,
        depth: getMaxDepth(document.body),
      };

      function getMaxDepth(element: Element): number {
        let maxDepth = 0;
        for (const child of element.children) {
          const childDepth = getMaxDepth(child);
          maxDepth = Math.max(maxDepth, childDepth);
        }
        return maxDepth + 1;
      }
    });

    console.log('DOM complexity:', domStats);

    // Assert rendering performance
    expect(renderTime).toBeLessThan(5000); // 5 seconds max for complex content
    expect(scrollTime).toBeLessThan(1000); // 1 second max for scrolling
    expect(domStats.totalElements).toBeLessThan(5000); // Reasonable DOM size
    expect(domStats.depth).toBeLessThan(50); // Reasonable DOM depth
  });
});

test.describe('Performance Regression Tests', () => {
  test('should not regress from baseline performance', async ({ page }) => {
    // This test would compare against stored baseline metrics
    // In a real implementation, you'd store baseline metrics and compare

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    const startTime = Date.now();

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // In a real scenario, you'd compare against stored baselines
    const baselineTime = 5000; // 5 seconds baseline
    const regressionThreshold = 1.2; // 20% regression threshold

    console.log(
      `Current performance: ${totalTime}ms, Baseline: ${baselineTime}ms`
    );

    const performanceRatio = totalTime / baselineTime;
    expect(performanceRatio).toBeLessThan(regressionThreshold);

    if (performanceRatio > 1.1) {
      console.warn(
        `Performance warning: Current time ${totalTime}ms is ${((performanceRatio - 1) * 100).toFixed(1)}% slower than baseline`
      );
    }
  });
});
