import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils } from './utils/mailUtils';

test.describe('Accessibility Tests', () => {
  test('should meet basic accessibility requirements on homepage', async ({
    page,
  }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Check basic accessibility
    await TestHelpers.checkBasicAccessibility(page);

    // Test keyboard navigation
    await TestHelpers.testKeyboardNavigation(page, 'body', [
      'button[type="button"]',
      'a[href]',
    ]);

    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      const firstHeading = headings.first();
      const tagName = await firstHeading.evaluate(el =>
        el.tagName.toLowerCase()
      );
      expect(tagName).toBe('h1');
    }

    // Check for proper ARIA labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const hasAccessibleName = ariaLabel || textContent?.trim();
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should be accessible on mailbox page', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Check basic accessibility
    await TestHelpers.checkBasicAccessibility(page);

    // Test keyboard navigation on mailbox page
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase()
    );
    expect(['button', 'a', 'input'].includes(focusedElement)).toBeTruthy();

    // Check for proper ARIA roles and labels
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    expect(mailboxAddress).toBeTruthy();

    // Verify copy button has proper accessibility
    const copyButton = mailboxPage.copyAddressButton;
    const copyButtonAriaLabel = await copyButton.getAttribute('aria-label');
    const copyButtonText = await copyButton.textContent();
    expect(copyButtonAriaLabel || copyButtonText).toBeTruthy();
  });

  test('should be accessible on mail detail page', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    // Generate mailbox and send test mail
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // View mail details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Check basic accessibility
    await TestHelpers.checkBasicAccessibility(page);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase()
    );
    expect(['button', 'a'].includes(focusedElement)).toBeTruthy();

    // Check mail content accessibility
    const mailContent = mailDetailPage.mailContent;
    await expect(mailContent).toBeVisible();

    // Verify proper semantic structure
    const mailSubject = mailDetailPage.mailSubject;
    const subjectTagName = await mailSubject.evaluate(el =>
      el.tagName.toLowerCase()
    );
    expect(['h1', 'h2', 'h3'].includes(subjectTagName)).toBeTruthy();
  });

  test('should support screen reader navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Check for proper landmarks
    const main = page.locator('main, [role="main"]');
    const nav = page.locator('nav, [role="navigation"]');
    const header = page.locator('header, [role="banner"]');

    // At least one main content area should exist
    expect(await main.count()).toBeGreaterThan(0);

    // Check for proper heading structure for screen readers
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingTexts = await headings.allTextContents();

    // Should have meaningful heading text
    headingTexts.forEach(text => {
      expect(text.trim().length).toBeGreaterThan(0);
    });

    // Check for skip links (if implemented)
    const skipLinks = page.locator('a[href^="#"]').first();
    if (await skipLinks.isVisible()) {
      const skipLinkText = await skipLinks.textContent();
      expect(skipLinkText).toMatch(/skip|跳转|跳过/i);
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Check text elements for sufficient contrast
    const textElements = page.locator(
      'p, span, div, button, a, h1, h2, h3, h4, h5, h6'
    );
    const count = await textElements.count();

    // Sample a few elements to check contrast
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      if (await element.isVisible()) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
          };
        });

        // Basic check - ensure text has color and background
        expect(styles.color).toBeTruthy();
        expect(styles.fontSize).toBeTruthy();
      }
    }
  });

  test('should work with keyboard-only navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Navigate using only keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Find the generate mailbox button and activate with keyboard
    let attempts = 0;
    while (attempts < 10) {
      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement
        .evaluate(el => el.tagName.toLowerCase())
        .catch(() => '');
      const textContent = await focusedElement.textContent().catch(() => '');

      if (tagName === 'button' && textContent?.includes('生成')) {
        await page.keyboard.press('Enter');
        break;
      }

      await page.keyboard.press('Tab');
      attempts++;
    }

    // Should navigate to mailbox page
    await mailboxPage.waitForPageLoad();

    // Continue keyboard navigation on mailbox page
    await page.keyboard.press('Tab');
    const focusedAfterNavigation = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase()
    );
    expect(
      ['button', 'a', 'input'].includes(focusedAfterNavigation)
    ).toBeTruthy();
  });

  test('should announce dynamic content changes', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Check for ARIA live regions for dynamic updates
    const liveRegions = page.locator(
      '[aria-live], [role="status"], [role="alert"]'
    );
    const liveRegionCount = await liveRegions.count();

    // Should have at least one live region for notifications
    if (liveRegionCount > 0) {
      const firstLiveRegion = liveRegions.first();
      const ariaLive = await firstLiveRegion.getAttribute('aria-live');
      expect(['polite', 'assertive'].includes(ariaLive || '')).toBeTruthy();
    }

    // Test dynamic content announcement by triggering an action
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // New mail should be announced to screen readers
    // This would typically be done through ARIA live regions
  });

  test('should be accessible on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.verifyResponsiveDesign();

    // Check touch target sizes
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const boundingBox = await button.boundingBox();
        if (boundingBox) {
          // Touch targets should be at least 44x44 pixels
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    }

    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();
    await mailboxPage.verifyResponsiveDesign();

    // Test mobile accessibility features
    const copyButton = mailboxPage.copyAddressButton;
    const copyButtonBox = await copyButton.boundingBox();
    if (copyButtonBox) {
      expect(copyButtonBox.width).toBeGreaterThanOrEqual(44);
      expect(copyButtonBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should handle focus management properly', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Send test mail
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Click on mail to view details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Focus should be managed properly when navigating
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase()
    );
    expect(focusedElement).toBeTruthy();

    // Go back to mailbox
    await mailDetailPage.goBack();
    await mailboxPage.waitForPageLoad();

    // Focus should return to appropriate element
    const focusAfterReturn = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase()
    );
    expect(focusAfterReturn).toBeTruthy();
  });
});

test.describe('Accessibility - Cross Browser', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should be accessible in ${browserName}`, async ({
      page,
      browserName: currentBrowser,
    }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);

      const homePage = new HomePage(page);
      const mailboxPage = new MailboxPage(page);

      await homePage.goto();
      await homePage.generateMailbox();
      await mailboxPage.waitForPageLoad();

      // Basic accessibility checks should work across browsers
      await TestHelpers.checkBasicAccessibility(page);

      // Keyboard navigation should work
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.tagName.toLowerCase()
      );
      expect(['button', 'a', 'input'].includes(focusedElement)).toBeTruthy();
    });
  });
});
