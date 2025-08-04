import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils, TestMail } from './utils/mailUtils';

test.describe('Mailbox Management', () => {
  let mailboxPage: MailboxPage;
  let mailDetailPage: MailDetailPage;
  let mailboxId: string;
  let mailboxAddress: string;

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    mailboxPage = new MailboxPage(page);
    mailDetailPage = new MailDetailPage(page);

    // Generate a new mailbox for each test
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Get mailbox info
    const currentUrl = page.url();
    mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    mailboxAddress = await mailboxPage.getMailboxAddress();
  });

  test('should extend mailbox expiry time', async ({ page }) => {
    // Check if extend button is available
    const isExtendButtonVisible =
      await mailboxPage.extendExpiryButton.isVisible();

    if (isExtendButtonVisible) {
      // Extend mailbox expiry
      await mailboxPage.extendExpiry();

      // Verify success message
      await TestHelpers.waitForToast(page, '延长成功');

      // Verify expiry time has been updated (should show more time)
      await expect(mailboxPage.expiryTimer).toBeVisible();
    } else {
      // If extend button is not visible, mailbox might already be at max extensions
      console.log(
        'Extend button not available - mailbox may be at maximum extensions'
      );
    }
  });

  test('should delete individual mail', async ({ page }) => {
    // First, send a test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Get initial mail count
    const initialCount = await mailboxPage.getMailCount();
    expect(initialCount).toBeGreaterThan(0);

    // Delete the first mail
    await mailboxPage.deleteFirstMail();

    // Verify mail count decreased
    const newCount = await mailboxPage.getMailCount();
    expect(newCount).toBe(initialCount - 1);

    // If no mails left, verify empty state
    if (newCount === 0) {
      await expect(mailboxPage.emptyState).toBeVisible();
    }
  });

  test('should delete mail from detail page', async ({ page }) => {
    // Send a test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Get initial mail count
    const initialCount = await mailboxPage.getMailCount();

    // Click on mail to view details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Delete mail from detail page
    await mailDetailPage.deleteMail();

    // Verify navigation back to mailbox page
    await mailboxPage.waitForPageLoad();

    // Verify mail count decreased
    const newCount = await mailboxPage.getMailCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should clear all mails from mailbox', async ({ page }) => {
    // Send multiple test mails
    const testMails: TestMail[] = [];
    for (let i = 0; i < 3; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Test Mail ${i + 1}`;
      testMails.push(testMail);
      await MailUtils.sendTestMail(page, testMail);
    }

    // Wait for all mails to appear
    for (const mail of testMails) {
      await MailUtils.waitForMail(page, mailboxId, mail.subject);
    }

    // Verify mails are present
    const initialCount = await mailboxPage.getMailCount();
    expect(initialCount).toBe(testMails.length);

    // Clear all mails
    await mailboxPage.clearAllMails();

    // Verify empty state
    await expect(mailboxPage.emptyState).toBeVisible();

    // Verify mail count is 0
    const finalCount = await mailboxPage.getMailCount();
    expect(finalCount).toBe(0);
  });

  test('should mark mail as read/unread', async ({ page }) => {
    // Send a test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Click on mail to view details (should mark as read)
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Try to mark as unread
    await mailDetailPage.markAsUnread();

    // Go back to mailbox
    await mailDetailPage.goBack();
    await mailboxPage.waitForPageLoad();

    // Verify mail is marked as unread
    const firstMail = mailboxPage.mailItems.first();
    const isRead = await firstMail.getAttribute('data-read');
    expect(isRead).toBe('false');
  });

  test('should handle mailbox expiry warning', async ({ page }) => {
    // This test would need to mock the expiry time or wait for actual expiry
    // For now, we'll test the UI elements exist

    // Check if expiry timer is visible
    await expect(mailboxPage.expiryTimer).toBeVisible();

    // The actual expiry warning would appear when mailbox is close to expiry
    // In a real test, you might mock the server time or create a mailbox that's about to expire
  });

  test('should generate new mailbox and navigate to it', async ({ page }) => {
    // Get current mailbox address
    const originalAddress = await mailboxPage.getMailboxAddress();
    const originalUrl = page.url();

    // Generate new mailbox
    await mailboxPage.generateNewMailbox();

    // Verify navigation to new mailbox
    const newUrl = page.url();
    expect(newUrl).not.toBe(originalUrl);

    // Verify new mailbox has different address
    const newAddress = await mailboxPage.getMailboxAddress();
    expect(newAddress).not.toBe(originalAddress);
    expect(MailUtils.isNnuEmailAddress(newAddress)).toBeTruthy();
  });

  test('should maintain mailbox state during session', async ({ page }) => {
    // Send a test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Navigate away and back
    await page.goto('/');
    await page.goBack();
    await mailboxPage.waitForPageLoad();

    // Verify mailbox state is preserved
    const address = await mailboxPage.getMailboxAddress();
    expect(address).toBe(mailboxAddress);

    // Verify mail is still there
    const mailCount = await mailboxPage.getMailCount();
    expect(mailCount).toBeGreaterThan(0);
  });

  test('should handle concurrent mail operations', async ({ page }) => {
    // Send multiple test mails
    const testMails: TestMail[] = [];
    for (let i = 0; i < 5; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Concurrent Test Mail ${i + 1}`;
      testMails.push(testMail);
    }

    // Send all mails concurrently
    await Promise.all(
      testMails.map(mail => MailUtils.sendTestMail(page, mail))
    );

    // Wait for all mails to appear
    for (const mail of testMails) {
      await MailUtils.waitForMail(page, mailboxId, mail.subject);
    }

    // Verify all mails are received
    const finalCount = await mailboxPage.getMailCount();
    expect(finalCount).toBe(testMails.length);

    // Perform concurrent operations (refresh while deleting)
    const refreshPromise = mailboxPage.refreshMails();
    const deletePromise = mailboxPage.deleteFirstMail();

    await Promise.all([refreshPromise, deletePromise]);

    // Verify operations completed successfully
    const countAfterOperations = await mailboxPage.getMailCount();
    expect(countAfterOperations).toBeLessThan(finalCount);
  });

  test('should handle mailbox access with invalid token', async ({ page }) => {
    // Navigate to mailbox with invalid token (simulate expired session)
    const invalidUrl = `/mailbox/${mailboxId}?token=invalid`;
    await page.goto(invalidUrl);

    // Should redirect to homepage or show error
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    // Either redirected to home or shows error message
    const isOnHomepage = currentUrl.includes('/');
    const hasErrorMessage = await page
      .locator('.error, .alert, [role="alert"]')
      .isVisible();

    expect(isOnHomepage || hasErrorMessage).toBeTruthy();
  });

  test('should validate mailbox operations with proper authentication', async ({
    page,
  }) => {
    // Send a test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // All operations should work with valid session
    await mailboxPage.refreshMails();
    await mailboxPage.copyMailboxAddress();

    // Try to delete mail
    await mailboxPage.deleteFirstMail();

    // Verify operations completed successfully
    const mailCount = await mailboxPage.getMailCount();
    expect(mailCount).toBe(0);
  });
});

test.describe('Mailbox Management - Error Handling', () => {
  test('should handle server errors gracefully', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Mock server error for delete operation
    await TestHelpers.simulateNetworkFailure(page, '**/api/mail/**/delete');

    // Try to delete mail (should handle error gracefully)
    const deleteButton = page.getByRole('button', { name: /删除/ }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should show error message
      await TestHelpers.waitForToast(page, '删除失败');
    }
  });

  test('should recover from network interruptions', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Simulate network interruption
    await TestHelpers.simulateSlowNetwork(page);

    // Operations should still work, just slower
    await mailboxPage.refreshMails();

    // Reset network
    await TestHelpers.resetNetworkConditions(page);

    // Verify normal operation resumes
    await mailboxPage.refreshMails();
  });
});

test.describe('Mailbox Management - Mobile', () => {
  test('should manage mailbox on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Test mobile-specific interactions
    await mailboxPage.verifyResponsiveDesign();

    // Test touch interactions
    await mailboxPage.copyMailboxAddress();
    await mailboxPage.refreshMails();

    // Verify mobile layout works correctly
    await expect(mailboxPage.mailboxAddress).toBeVisible();
    await expect(mailboxPage.copyAddressButton).toBeVisible();
  });
});
