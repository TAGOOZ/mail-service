import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils } from './utils/mailUtils';
import { getTestConfig } from './test-config';

test.describe('Performance Tests', () => {
  const testConfig = getTestConfig();

  test('should load homepage within performance threshold', async ({
    page,
  }) => {
    const startTime = Date.now();

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForPageLoad();

    const loadTime = Date.now() - startTime;
    console.log(`Homepage load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(testConfig.performance.pageLoadTime);

    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint:
          performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint:
          performance.getEntriesByName('first-contentful-paint')[0]
            ?.startTime || 0,
      };
    });

    console.log('Performance metrics:', performanceMetrics);

    // DOM content should load quickly
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);

    // First contentful paint should happen quickly
    if (performanceMetrics.firstContentfulPaint > 0) {
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000);
    }
  });

  test('should generate mailbox within performance threshold', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    const startTime = Date.now();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();
    const generationTime = Date.now() - startTime;

    console.log(`Mailbox generation time: ${generationTime}ms`);
    expect(generationTime).toBeLessThan(
      testConfig.performance.mailboxGenerationTime
    );

    // Verify mailbox is functional
    const address = await mailboxPage.getMailboxAddress();
    expect(MailUtils.isNnuEmailAddress(address)).toBeTruthy();
  });

  test('should receive mail within performance threshold', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const testMail = MailUtils.generateTestMail(mailboxAddress);

    // Measure mail reception time
    const startTime = Date.now();
    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);
    const receptionTime = Date.now() - startTime;

    console.log(`Mail reception time: ${receptionTime}ms`);
    expect(receptionTime).toBeLessThan(
      testConfig.performance.mailReceptionTime
    );
  });

  test('should handle large number of mails efficiently', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Send multiple mails
    const mailCount = 10;
    const testMails = [];

    const startTime = Date.now();

    for (let i = 0; i < mailCount; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Performance Test Mail ${i + 1}`;
      testMails.push(testMail);
      await MailUtils.sendTestMail(page, testMail);
    }

    // Wait for all mails to appear
    for (const mail of testMails) {
      await MailUtils.waitForMail(page, mailboxId, mail.subject, 5000);
    }

    const totalTime = Date.now() - startTime;
    console.log(`Time to receive ${mailCount} mails: ${totalTime}ms`);

    // Should handle multiple mails efficiently
    expect(totalTime).toBeLessThan(mailCount * 5000); // 5 seconds per mail max

    // Verify all mails are displayed
    const finalCount = await mailboxPage.getMailCount();
    expect(finalCount).toBe(mailCount);

    // Test scrolling performance with many mails
    const scrollStartTime = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;

    expect(scrollTime).toBeLessThan(1000); // Scrolling should be smooth
  });

  test('should maintain performance under slow network conditions', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Simulate slow network
    await TestHelpers.simulateSlowNetwork(page);

    const startTime = Date.now();

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Should still work, just slower
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const totalTime = Date.now() - startTime;
    console.log(`Total time under slow network: ${totalTime}ms`);

    // Should complete within reasonable time even on slow network
    expect(totalTime).toBeLessThan(30000); // 30 seconds max

    // Reset network conditions
    await TestHelpers.resetNetworkConditions(page);
  });

  test('should have efficient API response times', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Monitor network requests
    const apiRequests: Array<{ url: string; duration: number }> = [];

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
        apiRequests.push({
          url: response.url(),
          duration: duration,
        });
      }
    });

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Check API response times
    apiRequests.forEach(request => {
      console.log(`API ${request.url}: ${request.duration}ms`);
      expect(request.duration).toBeLessThan(
        testConfig.performance.apiResponseTime
      );
    });
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Get initial memory usage
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

    // Send multiple mails to test memory usage
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    for (let i = 0; i < 5; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Memory Test Mail ${i + 1}`;
      await MailUtils.sendTestMail(page, testMail);
      await MailUtils.waitForMail(page, mailboxId, testMail.subject, 5000);
    }

    // Check memory usage after operations
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          }
        : null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease =
        finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`Memory increase: ${memoryIncrease} bytes`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max increase
    }
  });

  test('should render mail content efficiently', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Send mail with large HTML content
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    testMail.htmlContent = `
      <html>
        <body>
          <h1>Large HTML Content Test</h1>
          ${Array.from(
            { length: 100 },
            (_, i) => `
            <div>
              <h2>Section ${i + 1}</h2>
              <p>This is a large paragraph with lots of content to test rendering performance. 
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
              incididunt ut labore et dolore magna aliqua.</p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
                <li>Item 3</li>
              </ul>
            </div>
          `
          ).join('')}
        </body>
      </html>
    `;

    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Measure mail detail rendering time
    const renderStartTime = Date.now();
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();
    const renderTime = Date.now() - renderStartTime;

    console.log(`Mail detail render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(5000); // Should render within 5 seconds

    // Test scrolling performance with large content
    const scrollStartTime = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;

    expect(scrollTime).toBeLessThan(1000); // Scrolling should be smooth
  });
});

test.describe('Performance - Cross Browser', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should maintain performance standards in ${browserName}`, async ({
      page,
      browserName: currentBrowser,
    }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);

      const testConfig = getTestConfig();
      const homePage = new HomePage(page);
      const mailboxPage = new MailboxPage(page);

      // Test basic performance in each browser
      const startTime = Date.now();

      await homePage.goto();
      await homePage.waitForPageLoad();
      await homePage.generateMailbox();
      await mailboxPage.waitForPageLoad();

      const totalTime = Date.now() - startTime;
      console.log(`${browserName} total flow time: ${totalTime}ms`);

      // Performance should be consistent across browsers
      expect(totalTime).toBeLessThan(
        testConfig.performance.mailboxGenerationTime +
          testConfig.performance.pageLoadTime
      );
    });
  });
});

test.describe('Performance - Mobile', () => {
  test('should maintain performance on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const testConfig = getTestConfig();
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    const startTime = Date.now();

    await homePage.goto();
    await homePage.waitForPageLoad();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const totalTime = Date.now() - startTime;
    console.log(`Mobile total flow time: ${totalTime}ms`);

    // Mobile performance might be slightly slower but should still be reasonable
    expect(totalTime).toBeLessThan(
      (testConfig.performance.mailboxGenerationTime +
        testConfig.performance.pageLoadTime) *
        1.5
    );

    // Test touch interactions performance
    const touchStartTime = Date.now();
    await mailboxPage.copyMailboxAddress();
    const touchTime = Date.now() - touchStartTime;

    expect(touchTime).toBeLessThan(2000); // Touch interactions should be responsive
  });
});
