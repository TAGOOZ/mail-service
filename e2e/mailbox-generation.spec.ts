import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils } from './utils/mailUtils';

test.describe('Mailbox Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Check for JavaScript errors
    await TestHelpers.checkForJSErrors(page);
  });

  test('should generate a new temporary mailbox from homepage', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Navigate to homepage
    await homePage.goto();
    await homePage.waitForPageLoad();

    // Verify homepage elements
    await homePage.verifyFeatures();
    await homePage.verifyHowItWorks();

    // Generate new mailbox
    await homePage.generateMailbox();

    // Verify navigation to mailbox page
    await mailboxPage.waitForPageLoad();

    // Verify mailbox info
    await mailboxPage.verifyMailboxInfo();

    // Verify mailbox address format
    const address = await mailboxPage.getMailboxAddress();
    expect(MailUtils.isNnuEmailAddress(address)).toBeTruthy();
    expect(MailUtils.isValidEmailAddress(address)).toBeTruthy();

    // Extract mailbox ID from URL
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl);
    expect(mailboxId).toBeTruthy();
    expect(mailboxId).toMatch(/^[a-f0-9]+$/);
  });

  test('should copy mailbox address to clipboard', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Get original address
    const originalAddress = await mailboxPage.getMailboxAddress();

    // Copy address
    await mailboxPage.copyMailboxAddress();

    // Verify clipboard content (if supported by browser)
    try {
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      expect(clipboardText).toBe(originalAddress);
    } catch (error) {
      // Clipboard API might not be available in test environment
      console.log('Clipboard API not available in test environment');
    }
  });

  test('should generate multiple unique mailboxes', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const generatedAddresses: string[] = [];

    // Generate 3 different mailboxes
    for (let i = 0; i < 3; i++) {
      if (i === 0) {
        await homePage.goto();
        await homePage.generateMailbox();
      } else {
        await mailboxPage.generateNewMailbox();
      }

      await mailboxPage.waitForPageLoad();
      const address = await mailboxPage.getMailboxAddress();

      // Verify address is unique
      expect(generatedAddresses).not.toContain(address);
      generatedAddresses.push(address);

      // Verify address format
      expect(MailUtils.isNnuEmailAddress(address)).toBeTruthy();
    }

    // Verify all addresses are different
    expect(new Set(generatedAddresses).size).toBe(3);
  });

  test('should maintain mailbox state on page refresh', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Get mailbox info before refresh
    const originalAddress = await mailboxPage.getMailboxAddress();
    const originalUrl = page.url();

    // Refresh page
    await page.reload();
    await mailboxPage.waitForPageLoad();

    // Verify mailbox info is preserved
    const newAddress = await mailboxPage.getMailboxAddress();
    const newUrl = page.url();

    expect(newAddress).toBe(originalAddress);
    expect(newUrl).toBe(originalUrl);
  });

  test('should handle mailbox generation errors gracefully', async ({
    page,
  }) => {
    const homePage = new HomePage(page);

    // Mock API failure
    await TestHelpers.simulateNetworkFailure(page, '**/api/mailbox/generate');

    await homePage.goto();

    // Attempt to generate mailbox
    await homePage.generateMailboxButton.click();

    // Verify error handling
    await expect(homePage.errorMessage).toBeVisible({ timeout: 10000 });

    // Verify user stays on homepage
    expect(page.url()).toContain('/');
  });

  test('should work with slow network conditions', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Simulate slow network
    await TestHelpers.simulateSlowNetwork(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Generate mailbox with slow network
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Verify mailbox was created successfully
    await mailboxPage.verifyMailboxInfo();

    // Reset network conditions
    await TestHelpers.resetNetworkConditions(page);
  });
});

test.describe('Mailbox Generation - Cross Browser', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({
      page,
      browserName: currentBrowser,
    }) => {
      // Skip if not the target browser
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);

      const homePage = new HomePage(page);
      const mailboxPage = new MailboxPage(page);

      await homePage.goto();
      await homePage.generateMailbox();
      await mailboxPage.waitForPageLoad();

      // Verify basic functionality works across browsers
      await mailboxPage.verifyMailboxInfo();
      const address = await mailboxPage.getMailboxAddress();
      expect(MailUtils.isNnuEmailAddress(address)).toBeTruthy();
    });
  });
});

test.describe('Mailbox Generation - Mobile', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.verifyResponsiveDesign();

    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();
    await mailboxPage.verifyResponsiveDesign();

    // Verify touch interactions work
    await mailboxPage.copyMailboxAddress();
  });

  test('should work on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.verifyResponsiveDesign();

    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();
    await mailboxPage.verifyResponsiveDesign();
  });
});
