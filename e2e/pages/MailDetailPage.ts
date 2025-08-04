import { Page, Locator, expect } from '@playwright/test';

export class MailDetailPage {
  readonly page: Page;
  readonly backButton: Locator;
  readonly mailSubject: Locator;
  readonly mailFrom: Locator;
  readonly mailTo: Locator;
  readonly mailDate: Locator;
  readonly mailContent: Locator;
  readonly attachmentsList: Locator;
  readonly deleteButton: Locator;
  readonly markReadButton: Locator;
  readonly markUnreadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.getByRole('button', { name: /返回|back/ });
    this.mailSubject = page
      .locator('[data-testid="mail-subject"]')
      .or(page.locator('h1, h2').first());
    this.mailFrom = page
      .locator('[data-testid="mail-from"]')
      .or(page.getByText(/发件人|From:/));
    this.mailTo = page
      .locator('[data-testid="mail-to"]')
      .or(page.getByText(/收件人|To:/));
    this.mailDate = page
      .locator('[data-testid="mail-date"]')
      .or(page.getByText(/时间|Date:/));
    this.mailContent = page
      .locator('[data-testid="mail-content"]')
      .or(page.locator('.mail-content'));
    this.attachmentsList = page
      .locator('[data-testid="attachments"]')
      .or(page.getByText(/附件|Attachments/));
    this.deleteButton = page.getByRole('button', { name: /删除/ });
    this.markReadButton = page.getByRole('button', { name: /标记已读/ });
    this.markUnreadButton = page.getByRole('button', { name: /标记未读/ });
  }

  async goto(mailboxId: string, mailId: string) {
    await this.page.goto(`/mailbox/${mailboxId}/mail/${mailId}`);
  }

  async waitForPageLoad() {
    await expect(this.mailSubject).toBeVisible({ timeout: 10000 });
    await expect(this.mailContent).toBeVisible({ timeout: 10000 });
  }

  async goBack() {
    await this.backButton.click();

    // Wait for navigation back to mailbox page
    await this.page.waitForURL(/\/mailbox\/[a-f0-9]+$/);
  }

  async deleteMail() {
    await this.deleteButton.click();

    // Handle confirmation dialog if present
    const confirmButton = this.page.getByRole('button', { name: /确认|删除/ });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Wait for navigation back to mailbox page
    await this.page.waitForURL(/\/mailbox\/[a-f0-9]+$/);
  }

  async markAsRead() {
    if (await this.markReadButton.isVisible()) {
      await this.markReadButton.click();

      // Wait for button to change to "mark unread"
      await expect(this.markUnreadButton).toBeVisible({ timeout: 5000 });
    }
  }

  async markAsUnread() {
    if (await this.markUnreadButton.isVisible()) {
      await this.markUnreadButton.click();

      // Wait for button to change to "mark read"
      await expect(this.markReadButton).toBeVisible({ timeout: 5000 });
    }
  }

  async getMailSubject(): Promise<string> {
    return (await this.mailSubject.textContent()) || '';
  }

  async getMailFrom(): Promise<string> {
    const fromText = await this.mailFrom.textContent();
    return fromText?.replace(/发件人:|From:/, '').trim() || '';
  }

  async getMailTo(): Promise<string> {
    const toText = await this.mailTo.textContent();
    return toText?.replace(/收件人:|To:/, '').trim() || '';
  }

  async getMailContent(): Promise<string> {
    return (await this.mailContent.textContent()) || '';
  }

  async verifyMailDetails(expectedSubject?: string, expectedFrom?: string) {
    await expect(this.mailSubject).toBeVisible();
    await expect(this.mailFrom).toBeVisible();
    await expect(this.mailTo).toBeVisible();
    await expect(this.mailDate).toBeVisible();
    await expect(this.mailContent).toBeVisible();

    if (expectedSubject) {
      expect(await this.getMailSubject()).toContain(expectedSubject);
    }

    if (expectedFrom) {
      expect(await this.getMailFrom()).toContain(expectedFrom);
    }
  }

  async verifyAttachments() {
    if (await this.attachmentsList.isVisible()) {
      // Verify attachments are listed but not downloadable
      const attachmentItems = this.page.locator(
        '[data-testid="attachment-item"]'
      );
      const count = await attachmentItems.count();

      if (count > 0) {
        // Verify attachment info is displayed
        await expect(attachmentItems.first()).toBeVisible();

        // Verify no download links are present
        const downloadLinks = this.page.locator('a[download]');
        expect(await downloadLinks.count()).toBe(0);
      }
    }
  }

  async verifyHtmlContent() {
    // Check if HTML content is safely rendered
    const htmlElements = this.mailContent.locator('p, div, span, strong, em');
    if ((await htmlElements.count()) > 0) {
      await expect(htmlElements.first()).toBeVisible();
    }

    // Verify no dangerous scripts are executed
    const scriptTags = this.mailContent.locator('script');
    expect(await scriptTags.count()).toBe(0);
  }

  async verifyResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.mailSubject).toBeVisible();
    await expect(this.mailContent).toBeVisible();

    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.mailSubject).toBeVisible();
    await expect(this.mailContent).toBeVisible();

    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
}
