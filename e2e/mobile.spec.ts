import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils } from './utils/mailUtils';
import { TEST_DATA } from './test-config';

test.describe('Mobile Device Testing', () => {
  TEST_DATA.mobileDevices.forEach(device => {
    test.describe(`${device.name} Tests`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(device.viewport);
        if (device.userAgent) {
          await page.setExtraHTTPHeaders({
            'User-Agent': device.userAgent,
          });
        }
      });

      test(`should complete full user flow on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);
        const mailDetailPage = new MailDetailPage(page);

        // Step 1: Load homepage on mobile
        await homePage.goto();
        await homePage.waitForPageLoad();
        await homePage.verifyResponsiveDesign();

        // Step 2: Generate mailbox on mobile
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();
        await mailboxPage.verifyResponsiveDesign();

        const mailboxAddress = await mailboxPage.getMailboxAddress();
        expect(MailUtils.isNnuEmailAddress(mailboxAddress)).toBeTruthy();

        // Step 3: Test touch interactions
        await mailboxPage.copyMailboxAddress();

        // Step 4: Send and receive mail on mobile
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        testMail.subject = `${device.name} Mobile Test`;
        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject);

        // Step 5: View mail details on mobile
        await mailboxPage.clickFirstMail();
        await mailDetailPage.waitForPageLoad();
        await mailDetailPage.verifyResponsiveDesign();

        // Step 6: Navigate back on mobile
        await mailDetailPage.goBack();
        await mailboxPage.waitForPageLoad();

        // Step 7: Test mobile-specific actions
        await mailboxPage.refreshMails();
        await mailboxPage.deleteFirstMail();
      });

      test(`should handle touch gestures on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Test tap gesture
        await mailboxPage.copyAddressButton.tap();
        await TestHelpers.waitForToast(page, '已复制');

        // Test long press (if supported)
        const mailboxAddress = await mailboxPage.getMailboxAddress();
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject);

        // Test swipe gestures (if implemented)
        const firstMail = mailboxPage.mailItems.first();
        await firstMail.hover();

        // Test scroll gesture
        await page.evaluate(() => {
          window.scrollTo(0, 100);
        });
        await page.waitForTimeout(500);

        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
      });

      test(`should have proper touch target sizes on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.waitForPageLoad();

        // Check touch target sizes on homepage
        const homeButtons = page.locator('button, a[href]');
        const homeButtonCount = await homeButtons.count();

        for (let i = 0; i < homeButtonCount; i++) {
          const button = homeButtons.nth(i);
          if (await button.isVisible()) {
            const boundingBox = await button.boundingBox();
            if (boundingBox) {
              // Touch targets should be at least 44x44 pixels (iOS HIG)
              expect(boundingBox.width).toBeGreaterThanOrEqual(44);
              expect(boundingBox.height).toBeGreaterThanOrEqual(44);
            }
          }
        }

        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Check touch target sizes on mailbox page
        const mailboxButtons = page.locator('button, a[href]');
        const mailboxButtonCount = await mailboxButtons.count();

        for (let i = 0; i < mailboxButtonCount; i++) {
          const button = mailboxButtons.nth(i);
          if (await button.isVisible()) {
            const boundingBox = await button.boundingBox();
            if (boundingBox) {
              expect(boundingBox.width).toBeGreaterThanOrEqual(44);
              expect(boundingBox.height).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });

      test(`should handle mobile keyboard interactions on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Test virtual keyboard behavior (if any input fields exist)
        const inputs = page.locator('input, textarea');
        const inputCount = await inputs.count();

        if (inputCount > 0) {
          const firstInput = inputs.first();
          await firstInput.tap();

          // Check if virtual keyboard affects viewport
          const viewportHeight = await page.evaluate(() => window.innerHeight);
          expect(viewportHeight).toBeGreaterThan(0);

          // Test input functionality
          await firstInput.fill('test input');
          const inputValue = await firstInput.inputValue();
          expect(inputValue).toBe('test input');
        }
      });

      test(`should handle mobile orientation changes on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        // Start in portrait mode
        await page.setViewportSize(device.viewport);
        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Verify portrait layout
        const portraitAddress = await mailboxPage.getMailboxAddress();
        expect(portraitAddress).toBeTruthy();

        // Switch to landscape mode
        await page.setViewportSize({
          width: device.viewport.height,
          height: device.viewport.width,
        });
        await page.waitForTimeout(500); // Allow layout to adjust

        // Verify landscape layout still works
        await mailboxPage.waitForPageLoad();
        const landscapeAddress = await mailboxPage.getMailboxAddress();
        expect(landscapeAddress).toBe(portraitAddress);

        // Test functionality in landscape
        await mailboxPage.copyMailboxAddress();
        await TestHelpers.waitForToast(page, '已复制');

        // Switch back to portrait
        await page.setViewportSize(device.viewport);
        await page.waitForTimeout(500);

        // Verify portrait layout is restored
        await mailboxPage.waitForPageLoad();
        const restoredAddress = await mailboxPage.getMailboxAddress();
        expect(restoredAddress).toBe(portraitAddress);
      });

      test(`should handle mobile network conditions on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        // Simulate mobile network conditions
        const client = await page.context().newCDPSession(page);
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
          uploadThroughput: (750 * 1024) / 8, // 750 Kbps
          latency: 40, // 40ms latency
        });

        const startTime = Date.now();

        await homePage.goto();
        await homePage.waitForPageLoad();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        const totalTime = Date.now() - startTime;
        console.log(`${device.name} mobile network time: ${totalTime}ms`);

        // Should still work on mobile network, just slower
        expect(totalTime).toBeLessThan(30000); // 30 seconds max

        // Test mail functionality on mobile network
        const mailboxAddress = await mailboxPage.getMailboxAddress();
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject, 45000);

        // Reset network conditions
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0,
        });
      });

      test(`should handle mobile scrolling and navigation on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Send multiple mails to test scrolling
        const mailboxAddress = await mailboxPage.getMailboxAddress();
        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

        for (let i = 0; i < 5; i++) {
          const testMail = MailUtils.generateTestMail(mailboxAddress);
          testMail.subject = `Mobile Scroll Test ${i + 1}`;
          await MailUtils.sendTestMail(page, testMail);
          await MailUtils.waitForMail(page, mailboxId, testMail.subject, 10000);
        }

        // Test mobile scrolling
        const initialScrollY = await page.evaluate(() => window.scrollY);

        // Scroll down
        await page.evaluate(() => {
          window.scrollTo(0, 200);
        });
        await page.waitForTimeout(500);

        const scrolledY = await page.evaluate(() => window.scrollY);
        expect(scrolledY).toBeGreaterThan(initialScrollY);

        // Scroll back to top
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);

        const topScrollY = await page.evaluate(() => window.scrollY);
        expect(topScrollY).toBeLessThanOrEqual(10);

        // Test mobile navigation
        const firstMail = mailboxPage.mailItems.first();
        await firstMail.tap();

        const mailDetailPage = new MailDetailPage(page);
        await mailDetailPage.waitForPageLoad();
        await mailDetailPage.verifyResponsiveDesign();

        // Navigate back
        await mailDetailPage.goBack();
        await mailboxPage.waitForPageLoad();
      });

      test(`should handle mobile-specific UI elements on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.waitForPageLoad();

        // Check for mobile-specific elements (hamburger menu, etc.)
        const mobileMenu = page.locator(
          '[data-testid="mobile-menu"], .mobile-menu, .hamburger'
        );
        const hasMobileMenu = (await mobileMenu.count()) > 0;

        if (hasMobileMenu) {
          await mobileMenu.first().tap();
          // Should open mobile navigation
          await page.waitForTimeout(500);
        }

        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Check for mobile-optimized buttons and controls
        const mobileControls = page.locator(
          '[data-mobile="true"], .mobile-only'
        );
        const mobileControlCount = await mobileControls.count();

        // Test mobile-specific interactions
        await mailboxPage.copyAddressButton.tap();
        await TestHelpers.waitForToast(page, '已复制');

        // Check for pull-to-refresh (if implemented)
        const refreshIndicator = page.locator(
          '[data-testid="pull-refresh"], .pull-refresh'
        );
        const hasPullRefresh = (await refreshIndicator.count()) > 0;

        if (hasPullRefresh) {
          // Test pull-to-refresh gesture
          await page.evaluate(() => {
            window.scrollTo(0, -100);
          });
          await page.waitForTimeout(1000);
        }
      });

      test(`should maintain performance on ${device.name}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        const startTime = Date.now();

        await homePage.goto();
        await homePage.waitForPageLoad();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        const totalTime = Date.now() - startTime;
        console.log(`${device.name} performance: ${totalTime}ms`);

        // Mobile performance should be reasonable
        expect(totalTime).toBeLessThan(20000); // 20 seconds max for mobile

        // Test memory usage on mobile
        const memoryInfo = await page.evaluate(() => {
          return (performance as any).memory
            ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
              }
            : null;
        });

        if (memoryInfo) {
          console.log(`${device.name} memory usage:`, memoryInfo);
          // Memory usage should be reasonable on mobile
          expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
        }
      });
    });
  });
});

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile devices', async ({ page }) => {
    // Test on iPhone viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Test mobile accessibility
    await TestHelpers.checkBasicAccessibility(page);

    // Check touch target accessibility
    const interactiveElements = page.locator(
      'button, a[href], input, [role="button"]'
    );
    const elementCount = await interactiveElements.count();

    for (let i = 0; i < elementCount; i++) {
      const element = interactiveElements.nth(i);
      if (await element.isVisible()) {
        const boundingBox = await element.boundingBox();
        if (boundingBox) {
          // Accessible touch targets should be at least 44x44 pixels
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }

        // Check for proper ARIA labels
        const ariaLabel = await element.getAttribute('aria-label');
        const textContent = await element.textContent();
        const hasAccessibleName = ariaLabel || textContent?.trim();
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  test('should support mobile screen readers', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Check for proper semantic structure for mobile screen readers
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      const firstHeading = headings.first();
      const tagName = await firstHeading.evaluate(el =>
        el.tagName.toLowerCase()
      );
      expect(tagName).toBe('h1');
    }

    // Check for proper landmarks
    const landmarks = page.locator(
      'main, nav, header, footer, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]'
    );
    const landmarkCount = await landmarks.count();
    expect(landmarkCount).toBeGreaterThan(0);

    // Check for proper focus management on mobile
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase()
    );
    expect(['button', 'a', 'input'].includes(focusedElement)).toBeTruthy();
  });
});

test.describe('Mobile Edge Cases', () => {
  test('should handle mobile browser quirks', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Test iOS Safari specific issues
    const isWebKit = await page.evaluate(() =>
      /WebKit/.test(navigator.userAgent)
    );

    if (isWebKit) {
      // Test iOS Safari viewport units
      const viewportHeight = await page.evaluate(() => {
        const vh = window.innerHeight;
        const dvh = document.documentElement.clientHeight;
        return { vh, dvh };
      });

      expect(viewportHeight.vh).toBeGreaterThan(0);
      expect(viewportHeight.dvh).toBeGreaterThan(0);

      // Test iOS Safari bounce scrolling
      await page.evaluate(() => {
        document.body.style.overscrollBehavior = 'none';
      });
    }

    // Test Android Chrome specific issues
    const isChrome = await page.evaluate(() =>
      /Chrome/.test(navigator.userAgent)
    );

    if (isChrome) {
      // Test Android Chrome address bar behavior
      const initialHeight = await page.evaluate(() => window.innerHeight);

      // Simulate scroll to hide address bar
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(1000);

      const scrolledHeight = await page.evaluate(() => window.innerHeight);
      // Height might change when address bar hides
      expect(scrolledHeight).toBeGreaterThanOrEqual(initialHeight);
    }
  });

  test('should handle mobile device rotation', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const portraitAddress = await mailboxPage.getMailboxAddress();

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000); // Allow orientation change

    // Verify functionality after rotation
    await mailboxPage.waitForPageLoad();
    const landscapeAddress = await mailboxPage.getMailboxAddress();
    expect(landscapeAddress).toBe(portraitAddress);

    // Test interactions in landscape
    await mailboxPage.copyMailboxAddress();
    await TestHelpers.waitForToast(page, '已复制');

    // Rotate back to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Verify functionality is maintained
    const finalAddress = await mailboxPage.getMailboxAddress();
    expect(finalAddress).toBe(portraitAddress);
  });
});
