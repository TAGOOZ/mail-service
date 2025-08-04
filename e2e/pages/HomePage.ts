import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly generateMailboxButton: Locator;
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly featuresSection: Locator;
  readonly howItWorksSection: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.generateMailboxButton = page.getByRole('button', {
      name: /生成临时邮箱|生成中/,
    });
    this.heroTitle = page.getByRole('heading', { name: '临时邮箱服务' });
    this.heroDescription = page.getByText(
      '快速生成临时邮箱地址，保护您的隐私，无需注册即可接收邮件'
    );
    this.featuresSection = page.locator('.grid').first();
    this.howItWorksSection = page.getByRole('heading', { name: '如何使用' });
    this.errorMessage = page.locator('.bg-red-50');
  }

  async goto() {
    await this.page.goto('/');
  }

  async generateMailbox() {
    await this.generateMailboxButton.click();
    // Wait for navigation to mailbox page
    await this.page.waitForURL(/\/mailbox\/[a-f0-9]+/);
  }

  async waitForPageLoad() {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.generateMailboxButton).toBeVisible();
  }

  async verifyFeatures() {
    await expect(this.featuresSection).toBeVisible();

    // Check for feature cards
    const featureCards = this.page.locator('.card');
    await expect(featureCards).toHaveCount(4);

    // Verify feature titles
    await expect(this.page.getByText('即时生成')).toBeVisible();
    await expect(this.page.getByText('24小时有效')).toBeVisible();
    await expect(this.page.getByText('隐私保护')).toBeVisible();
    await expect(this.page.getByText('实时接收')).toBeVisible();
  }

  async verifyHowItWorks() {
    await expect(this.howItWorksSection).toBeVisible();

    // Check for step numbers
    await expect(this.page.getByText('1')).toBeVisible();
    await expect(this.page.getByText('2')).toBeVisible();
    await expect(this.page.getByText('3')).toBeVisible();

    // Check for step descriptions
    await expect(this.page.getByText('生成邮箱')).toBeVisible();
    await expect(this.page.getByText('使用邮箱')).toBeVisible();
    await expect(this.page.getByText('查看邮件')).toBeVisible();
  }

  async verifyResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.heroTitle).toBeVisible();
    await expect(this.generateMailboxButton).toBeVisible();

    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.heroTitle).toBeVisible();
    await expect(this.generateMailboxButton).toBeVisible();

    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
}
