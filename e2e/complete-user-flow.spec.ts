import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils, TestMail } from './utils/mailUtils';

test.describe('Complete User Flow - Mailbox Generation to Mail Reception', () => {
  test('should complete full user journey from homepage to receiving mail', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    // Step 1: Visit homepage
    await homePage.goto();
    await homePage.waitForPageLoad();

    // Verify homepage content
    await homePage.verifyFeatures();
    await homePage.verifyHowItWorks();

    // Step 2: Generate temporary mailbox
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Verify mailbox creation
    await mailboxPage.verifyMailboxInfo();
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    expect(MailUtils.isNnuEmailAddress(mailboxAddress)).toBeTruthy();

    // Extract mailbox ID for later use
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Step 3: Copy mailbox address
    await mailboxPage.copyMailboxAddress();

    // Step 4: Verify empty state initially
    await expect(mailboxPage.emptyState).toBeVisible();
    const initialMailCount = await mailboxPage.getMailCount();
    expect(initialMailCount).toBe(0);

    // Step 5: Simulate receiving a mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    testMail.subject = 'Welcome to Our Service!';
    testMail.textContent =
      'Thank you for signing up. Please verify your email address.';
    testMail.htmlContent = `
      <html>
        <body>
          <h2>Welcome to Our Service!</h2>
          <p>Thank you for signing up. Please <strong>verify your email address</strong>.</p>
          <p>Click the link below to verify:</p>
          <a href="https://example.com/verify">Verify Email</a>
        </body>
      </html>
    `;

    await MailUtils.sendTestMail(page, testMail);

    // Step 6: Wait for real-time mail reception
    const mailReceived = await MailUtils.waitForMail(
      page,
      mailboxId,
      testMail.subject,
      30000
    );
    expect(mailReceived).toBeTruthy();

    // Verify mail appears in list
    await expect(mailboxPage.mailItems.first()).toBeVisible();
    const updatedMailCount = await mailboxPage.getMailCount();
    expect(updatedMailCount).toBe(1);

    // Step 7: View mail details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Verify mail content
    await mailDetailPage.verifyMailDetails(testMail.subject, testMail.from);
    const displayedContent = await mailDetailPage.getMailContent();
    expect(displayedContent).toContain('Thank you for signing up');

    // Verify HTML content is safely rendered
    await mailDetailPage.verifyHtmlContent();

    // Step 8: Go back to mailbox
    await mailDetailPage.goBack();
    await mailboxPage.waitForPageLoad();

    // Verify mail is marked as read
    const firstMail = mailboxPage.mailItems.first();
    const isRead = await firstMail.getAttribute('data-read');
    expect(isRead).toBe('true');

    // Step 9: Send another mail to test multiple mails
    const secondTestMail = MailUtils.generateTestMail(mailboxAddress);
    secondTestMail.subject = 'Password Reset Request';
    secondTestMail.textContent =
      'You requested a password reset. Click the link to reset your password.';

    await MailUtils.sendTestMail(page, secondTestMail);
    await MailUtils.waitForMail(page, mailboxId, secondTestMail.subject);

    // Verify both mails are visible
    const finalMailCount = await mailboxPage.getMailCount();
    expect(finalMailCount).toBe(2);

    // Step 10: Test mail management
    await mailboxPage.refreshMails();
    await TestHelpers.waitForToast(page, '刷新成功');

    // Step 11: Delete one mail
    await mailboxPage.deleteFirstMail();
    const countAfterDelete = await mailboxPage.getMailCount();
    expect(countAfterDelete).toBe(1);

    // Step 12: Test mailbox extension (if available)
    const isExtendButtonVisible =
      await mailboxPage.extendExpiryButton.isVisible();
    if (isExtendButtonVisible) {
      await mailboxPage.extendExpiry();
      await TestHelpers.waitForToast(page, '延长成功');
    }

    // Step 13: Clear all mails
    await mailboxPage.clearAllMails();
    await expect(mailboxPage.emptyState).toBeVisible();
    const finalCount = await mailboxPage.getMailCount();
    expect(finalCount).toBe(0);

    // Step 14: Generate new mailbox
    await mailboxPage.generateNewMailbox();
    await mailboxPage.waitForPageLoad();

    // Verify new mailbox has different address
    const newAddress = await mailboxPage.getMailboxAddress();
    expect(newAddress).not.toBe(mailboxAddress);
    expect(MailUtils.isNnuEmailAddress(newAddress)).toBeTruthy();
  });

  test('should handle complete flow with multiple mail types', async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Send different types of mails
    const mailTypes = [
      {
        type: 'verification',
        subject: 'Email Verification Required',
        content: 'Please verify your email address by clicking the link below.',
        hasHtml: true,
      },
      {
        type: 'notification',
        subject: 'New Message Received',
        content: 'You have received a new message in your account.',
        hasHtml: false,
      },
      {
        type: 'promotional',
        subject: 'Special Offer - 50% Off!',
        content: 'Limited time offer! Get 50% off on all products.',
        hasHtml: true,
      },
    ];

    // Send all mail types
    for (const mailType of mailTypes) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = mailType.subject;
      testMail.textContent = mailType.content;

      if (mailType.hasHtml) {
        testMail.htmlContent = `
          <html>
            <body>
              <h2>${mailType.subject}</h2>
              <p>${mailType.content}</p>
              <div style="background: #f0f0f0; padding: 10px;">
                <p>This is HTML content for ${mailType.type} mail.</p>
              </div>
            </body>
          </html>
        `;
      }

      await MailUtils.sendTestMail(page, testMail);
    }

    // Wait for all mails to arrive
    for (const mailType of mailTypes) {
      await MailUtils.waitForMail(page, mailboxId, mailType.subject);
    }

    // Verify all mails are received
    const totalMails = await mailboxPage.getMailCount();
    expect(totalMails).toBe(mailTypes.length);

    // Test viewing each mail type
    for (let i = 0; i < mailTypes.length; i++) {
      const mailItem = mailboxPage.mailItems.nth(i);
      await mailItem.click();
      await mailDetailPage.waitForPageLoad();

      // Verify mail details
      const subject = await mailDetailPage.getMailSubject();
      expect(
        mailTypes.some(type => subject.includes(type.subject))
      ).toBeTruthy();

      // Go back to list
      await mailDetailPage.goBack();
      await mailboxPage.waitForPageLoad();
    }
  });

  test('should handle user flow with session persistence', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const originalAddress = await mailboxPage.getMailboxAddress();
    const originalUrl = page.url();

    // Send a test mail
    const testMail = MailUtils.generateTestMail(originalAddress);
    await MailUtils.sendTestMail(page, testMail);

    const mailboxId = MailUtils.extractMailboxIdFromUrl(originalUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Simulate browser refresh
    await page.reload();
    await mailboxPage.waitForPageLoad();

    // Verify session is restored
    const restoredAddress = await mailboxPage.getMailboxAddress();
    expect(restoredAddress).toBe(originalAddress);

    // Verify mail is still there
    const mailCount = await mailboxPage.getMailCount();
    expect(mailCount).toBeGreaterThan(0);

    // Simulate closing and reopening browser tab
    const newPage = await page.context().newPage();
    await newPage.goto(originalUrl);

    const newMailboxPage = new MailboxPage(newPage);
    await newMailboxPage.waitForPageLoad();

    // Verify mailbox is accessible
    const newPageAddress = await newMailboxPage.getMailboxAddress();
    expect(newPageAddress).toBe(originalAddress);

    await newPage.close();
  });

  test('should complete flow with error recovery', async ({ page }) => {
    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Send test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Simulate network error during refresh
    await TestHelpers.simulateNetworkFailure(page, '**/api/mail/**');
    await mailboxPage.refreshButton.click();

    // Should show error message
    await TestHelpers.waitForToast(page, '网络错误');

    // Restore network
    await page.unroute('**/api/mail/**');

    // Retry operation should work
    await mailboxPage.refreshMails();
    await TestHelpers.waitForToast(page, '刷新成功');

    // Verify mail is still accessible
    const mailCount = await mailboxPage.getMailCount();
    expect(mailCount).toBeGreaterThan(0);
  });

  test('should handle complete flow on mobile device', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    // Complete mobile flow
    await homePage.goto();
    await homePage.verifyResponsiveDesign();

    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();
    await mailboxPage.verifyResponsiveDesign();

    // Test mobile interactions
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    await mailboxPage.copyMailboxAddress();

    // Send and receive mail on mobile
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // View mail details on mobile
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();
    await mailDetailPage.verifyResponsiveDesign();

    // Test mobile navigation
    await mailDetailPage.goBack();
    await mailboxPage.waitForPageLoad();

    // Test mobile mail management
    await mailboxPage.deleteFirstMail();
    await expect(mailboxPage.emptyState).toBeVisible();
  });
});

test.describe('Complete User Flow - Performance', () => {
  test('should complete flow within acceptable time limits', async ({
    page,
  }) => {
    const startTime = Date.now();

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    // Measure homepage load time
    const homeLoadStart = Date.now();
    await homePage.goto();
    await homePage.waitForPageLoad();
    const homeLoadTime = Date.now() - homeLoadStart;
    expect(homeLoadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Measure mailbox generation time
    const generateStart = Date.now();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();
    const generateTime = Date.now() - generateStart;
    expect(generateTime).toBeLessThan(10000); // Should generate within 10 seconds

    // Measure mail reception time
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const testMail = MailUtils.generateTestMail(mailboxAddress);

    const mailSendStart = Date.now();
    await MailUtils.sendTestMail(page, testMail);

    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);
    const mailReceiveTime = Date.now() - mailSendStart;
    expect(mailReceiveTime).toBeLessThan(30000); // Should receive within 30 seconds

    const totalTime = Date.now() - startTime;
    console.log(`Complete flow completed in ${totalTime}ms`);
    expect(totalTime).toBeLessThan(60000); // Total flow should complete within 1 minute
  });

  test('should handle multiple concurrent users', async ({ page, context }) => {
    // Create multiple browser contexts to simulate different users
    const contexts = await Promise.all([
      context.browser()?.newContext(),
      context.browser()?.newContext(),
      context.browser()?.newContext(),
    ]);

    const pages = await Promise.all(
      contexts.map(ctx => ctx?.newPage()).filter(Boolean)
    );

    try {
      // Each user generates a mailbox simultaneously
      const userFlows = pages.map(async (userPage, index) => {
        const homePage = new HomePage(userPage!);
        const mailboxPage = new MailboxPage(userPage!);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        const address = await mailboxPage.getMailboxAddress();
        expect(MailUtils.isNnuEmailAddress(address)).toBeTruthy();

        // Send test mail to each user
        const testMail = MailUtils.generateTestMail(address);
        testMail.subject = `Concurrent User ${index + 1} Test Mail`;
        await MailUtils.sendTestMail(userPage!, testMail);

        const currentUrl = userPage!.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(userPage!, mailboxId, testMail.subject);

        return address;
      });

      const addresses = await Promise.all(userFlows);

      // Verify all addresses are unique
      expect(new Set(addresses).size).toBe(addresses.length);
    } finally {
      // Cleanup contexts
      await Promise.all(contexts.map(ctx => ctx?.close()));
    }
  });
});
