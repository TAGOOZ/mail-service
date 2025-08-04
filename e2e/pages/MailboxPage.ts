import { Page, Locator, expect } from '@playwright/test';

export class MailboxPage {
  readonly page: Page;
  readonly mailboxAddress: Locator;
  readonly copyAddressButton: Locator;
  readonly expiryTimer: Locator;
  readonly mailCount: Locator;
  readonly generateNewButton: Locator;
  readonly extendExpiryButton: Locator;
  readonly refreshButton: Locator;
  readonly clearAllButton: Locator;
  readonly mailList: Locator;
  readonly mailItems: Locator;
  readonly emptyState: Locator;
  readonly connectionStatus: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mailboxAddress = page
      .locator('[data-testid="mailbox-address"]')
      .or(page.locator('text=@nnu.edu.kg'));
    this.copyAddressButton = page.getByRole('button', {
      name: /复制地址|复制/,
    });
    this.expiryTimer = page
      .locator('[data-testid="expiry-timer"]')
      .or(page.getByText(/剩余时间|过期时间/));
    this.mailCount = page
      .locator('[data-testid="mail-count"]')
      .or(page.getByText(/邮件数量|共.*封/));
    this.generateNewButton = page.getByRole('button', { name: /生成新邮箱/ });
    this.extendExpiryButton = page.getByRole('button', { name: /延长有效期/ });
    this.refreshButton = page.getByRole('button', { name: /刷新|更新/ });
    this.clearAllButton = page.getByRole('button', { name: /清空邮箱/ });
    this.mailList = page
      .locator('[data-testid="mail-list"]')
      .or(page.locator('.mail-list'));
    this.mailItems = page
      .locator('[data-testid="mail-item"]')
      .or(page.locator('.mail-item'));
    this.emptyState = page.getByText(/暂无邮件|没有邮件/);
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.loadingState = page
      .locator('[data-testid="loading"]')
      .or(page.getByText(/加载中/));
  }

  async goto(mailboxId: string) {
    await this.page.goto(`/mailbox/${mailboxId}`);
  }

  async waitForPageLoad() {
    // Wait for mailbox address to be visible
    await expect(this.mailboxAddress).toBeVisible({ timeout: 10000 });
  }

  async copyMailboxAddress() {
    await this.copyAddressButton.click();

    // Verify success toast or feedback
    const successMessage = this.page.getByText(/已复制|复制成功/);
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  }

  async getMailboxAddress(): Promise<string> {
    const addressText = await this.mailboxAddress.textContent();
    return addressText?.trim() || '';
  }

  async refreshMails() {
    await this.refreshButton.click();

    // Wait for refresh to complete
    await expect(this.loadingState).toBeHidden({ timeout: 10000 });
  }

  async generateNewMailbox() {
    await this.generateNewButton.click();

    // Wait for navigation to new mailbox
    await this.page.waitForURL(/\/mailbox\/[a-f0-9]+/);
    await this.waitForPageLoad();
  }

  async extendExpiry() {
    const isExtendButtonVisible = await this.extendExpiryButton.isVisible();
    if (isExtendButtonVisible) {
      await this.extendExpiryButton.click();

      // Wait for success message
      const successMessage = this.page.getByText(/延长成功|已延长/);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  }

  async clearAllMails() {
    await this.clearAllButton.click();

    // Handle confirmation dialog if present
    const confirmButton = this.page.getByRole('button', { name: /确认|删除/ });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Wait for empty state
    await expect(this.emptyState).toBeVisible({ timeout: 5000 });
  }

  async getMailCount(): Promise<number> {
    const mailCountText = await this.mailCount.textContent();
    const match = mailCountText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async waitForNewMail(timeout: number = 30000) {
    // Wait for mail count to increase or new mail item to appear
    await expect(this.mailItems.first()).toBeVisible({ timeout });
  }

  async clickFirstMail() {
    await this.mailItems.first().click();

    // Wait for navigation to mail detail page
    await this.page.waitForURL(/\/mailbox\/[a-f0-9]+\/mail\/[a-f0-9]+/);
  }

  async deleteFirstMail() {
    const firstMail = this.mailItems.first();
    await firstMail.hover();

    const deleteButton = firstMail.getByRole('button', { name: /删除/ });
    await deleteButton.click();

    // Handle confirmation if present
    const confirmButton = this.page.getByRole('button', { name: /确认|删除/ });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }
  }

  async verifyConnectionStatus() {
    // Check if connection status indicator is present and shows connected
    if (await this.connectionStatus.isVisible()) {
      const statusText = await this.connectionStatus.textContent();
      expect(statusText).toMatch(/已连接|连接正常/);
    }
  }

  async verifyResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.mailboxAddress).toBeVisible();
    await expect(this.copyAddressButton).toBeVisible();

    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.mailboxAddress).toBeVisible();
    await expect(this.copyAddressButton).toBeVisible();

    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async verifyMailboxInfo() {
    await expect(this.mailboxAddress).toBeVisible();
    await expect(this.copyAddressButton).toBeVisible();

    // Verify address format
    const address = await this.getMailboxAddress();
    expect(address).toMatch(/@nnu\.edu\.kg$/);
  }
}
