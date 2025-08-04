import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils, TestMail } from './utils/mailUtils';

test.describe('Mail Receiving Flow', () => {
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

    // Verify WebSocket connection
    await mailboxPage.verifyConnectionStatus();
  });

  test('should display empty state when no mails are received', async ({
    page,
  }) => {
    // Verify empty state is shown
    await expect(mailboxPage.emptyState).toBeVisible();

    // Verify mail count is 0
    const mailCount = await mailboxPage.getMailCount();
    expect(mailCount).toBe(0);
  });

  test('should receive and display new mail in real-time', async ({ page }) => {
    // Generate test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);

    // Send test mail (this would integrate with actual mail server in real scenario)
    await MailUtils.sendTestMail(page, testMail);

    // Wait for mail to appear in the list
    const mailReceived = await MailUtils.waitForMail(
      page,
      mailboxId,
      testMail.subject
    );
    expect(mailReceived).toBeTruthy();

    // Verify mail count increased
    const mailCount = await mailboxPage.getMailCount();
    expect(mailCount).toBeGreaterThan(0);

    // Verify mail appears in list
    await expect(mailboxPage.mailItems.first()).toBeVisible();
  });

  test('should display mail details when clicking on mail item', async ({
    page,
  }) => {
    // Generate and send test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);

    // Wait for mail to appear
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Click on first mail
    await mailboxPage.clickFirstMail();

    // Verify navigation to mail detail page
    await mailDetailPage.waitForPageLoad();

    // Verify mail details
    await mailDetailPage.verifyMailDetails(testMail.subject, testMail.from);

    // Verify mail content
    const displayedContent = await mailDetailPage.getMailContent();
    expect(displayedContent).toContain(testMail.textContent);
  });

  test('should handle HTML mail content safely', async ({ page }) => {
    // Generate test mail with HTML content
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    testMail.htmlContent = `
      <html>
        <body>
          <h1>HTML Test Mail</h1>
          <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
          <script>alert('This should not execute');</script>
          <img src="javascript:alert('XSS')" alt="Test">
        </body>
      </html>
    `;

    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // View mail details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Verify HTML content is safely rendered
    await mailDetailPage.verifyHtmlContent();
  });

  test('should display attachment information without download links', async ({
    page,
  }) => {
    // Generate test mail with attachments
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    // Note: In a real implementation, you would add attachment data here

    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // View mail details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Verify attachments are displayed but not downloadable
    await mailDetailPage.verifyAttachments();
  });

  test('should refresh mail list manually', async ({ page }) => {
    // Get initial mail count
    const initialCount = await mailboxPage.getMailCount();

    // Refresh mails
    await mailboxPage.refreshMails();

    // Verify refresh completed (loading state should be hidden)
    await expect(mailboxPage.loadingState).toBeHidden();

    // Verify success message appears
    await TestHelpers.waitForToast(page, '刷新成功');
  });

  test('should handle multiple mails received in sequence', async ({
    page,
  }) => {
    const testMails: TestMail[] = [];

    // Generate multiple test mails
    for (let i = 0; i < 3; i++) {
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      testMail.subject = `Test Mail ${i + 1} - ${testMail.subject}`;
      testMails.push(testMail);
    }

    // Send mails in sequence
    for (const mail of testMails) {
      await MailUtils.sendTestMail(page, mail);
      await page.waitForTimeout(1000); // Small delay between sends
    }

    // Wait for all mails to appear
    for (const mail of testMails) {
      await MailUtils.waitForMail(page, mailboxId, mail.subject);
    }

    // Verify mail count
    const finalCount = await mailboxPage.getMailCount();
    expect(finalCount).toBe(testMails.length);

    // Verify all mails are visible in list
    const visibleMails = await mailboxPage.mailItems.count();
    expect(visibleMails).toBe(testMails.length);
  });

  test('should mark mail as read when viewing details', async ({ page }) => {
    // Generate and send test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Click on mail to view details
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();

    // Go back to mailbox
    await mailDetailPage.goBack();
    await mailboxPage.waitForPageLoad();

    // Verify mail is marked as read (visual indicator should change)
    const firstMail = mailboxPage.mailItems.first();
    const isRead = await firstMail.getAttribute('data-read');
    expect(isRead).toBe('true');
  });

  test('should handle real-time updates with WebSocket', async ({ page }) => {
    // Verify WebSocket connection is established
    await TestHelpers.waitForWebSocketConnection(page);

    // Generate test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);

    // Send mail and verify real-time update
    await MailUtils.sendTestMail(page, testMail);

    // Mail should appear without manual refresh
    const mailReceived = await MailUtils.waitForMail(
      page,
      mailboxId,
      testMail.subject,
      10000
    );
    expect(mailReceived).toBeTruthy();
  });

  test('should handle network interruptions gracefully', async ({ page }) => {
    // Generate test mail first
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Simulate network failure
    await TestHelpers.simulateNetworkFailure(page, '**/api/mail/**');

    // Try to refresh mails
    await mailboxPage.refreshButton.click();

    // Verify error handling
    await TestHelpers.waitForToast(page, '网络错误');

    // Restore network and verify recovery
    await page.unroute('**/api/mail/**');
    await mailboxPage.refreshMails();

    // Verify mails are still visible
    await expect(mailboxPage.mailItems.first()).toBeVisible();
  });
});

test.describe('Mail Receiving - Cross Browser', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should receive mails correctly in ${browserName}`, async ({
      page,
      browserName: currentBrowser,
    }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);

      const homePage = new HomePage(page);
      const mailboxPage = new MailboxPage(page);

      // Generate mailbox
      await homePage.goto();
      await homePage.generateMailbox();
      await mailboxPage.waitForPageLoad();

      // Get mailbox info
      const mailboxAddress = await mailboxPage.getMailboxAddress();
      const currentUrl = page.url();
      const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

      // Send test mail
      const testMail = MailUtils.generateTestMail(mailboxAddress);
      await MailUtils.sendTestMail(page, testMail);

      // Verify mail reception works across browsers
      const mailReceived = await MailUtils.waitForMail(
        page,
        mailboxId,
        testMail.subject
      );
      expect(mailReceived).toBeTruthy();
    });
  });
});

test.describe('Mail Receiving - Mobile', () => {
  test('should receive and display mails on mobile devices', async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);
    const mailDetailPage = new MailDetailPage(page);

    // Generate mailbox
    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Get mailbox info
    const mailboxAddress = await mailboxPage.getMailboxAddress();
    const currentUrl = page.url();
    const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;

    // Send test mail
    const testMail = MailUtils.generateTestMail(mailboxAddress);
    await MailUtils.sendTestMail(page, testMail);
    await MailUtils.waitForMail(page, mailboxId, testMail.subject);

    // Verify mobile layout
    await mailboxPage.verifyResponsiveDesign();

    // View mail details on mobile
    await mailboxPage.clickFirstMail();
    await mailDetailPage.waitForPageLoad();
    await mailDetailPage.verifyResponsiveDesign();
  });
});
