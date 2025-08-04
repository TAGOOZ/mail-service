import { Page, expect } from '@playwright/test';

/**
 * Common test helper functions
 */
export class TestHelpers {
  /**
   * Wait for page to be fully loaded
   */
  static async waitForPageLoad(
    page: Page,
    timeout: number = 10000
  ): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Take a screenshot with a descriptive name
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Check if element is visible within viewport
   */
  static async isElementInViewport(
    page: Page,
    selector: string
  ): Promise<boolean> {
    return await page.evaluate(sel => {
      const element = document.querySelector(sel);
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      );
    }, selector);
  }

  /**
   * Scroll element into view
   */
  static async scrollIntoView(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for toast/notification message
   */
  static async waitForToast(
    page: Page,
    expectedText: string,
    timeout: number = 5000
  ): Promise<void> {
    const toast = page
      .locator('.toast, .notification, [role="alert"]')
      .filter({ hasText: expectedText });
    await expect(toast).toBeVisible({ timeout });
  }

  /**
   * Dismiss toast/notification if present
   */
  static async dismissToast(page: Page): Promise<void> {
    const dismissButton = page.locator(
      '.toast button, .notification button, [role="alert"] button'
    );
    if (await dismissButton.isVisible({ timeout: 1000 })) {
      await dismissButton.click();
    }
  }

  /**
   * Check for JavaScript errors on the page
   */
  static async checkForJSErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  /**
   * Mock network request
   */
  static async mockApiResponse(
    page: Page,
    url: string,
    response: any
  ): Promise<void> {
    await page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Simulate network failure
   */
  static async simulateNetworkFailure(page: Page, url: string): Promise<void> {
    await page.route(url, async route => {
      await route.abort('failed');
    });
  }

  /**
   * Test responsive design at different breakpoints
   */
  static async testResponsiveBreakpoints(
    page: Page,
    testCallback: () => Promise<void>
  ): Promise<void> {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'large-desktop', width: 1920, height: 1080 },
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });
      await page.waitForTimeout(500); // Allow layout to settle

      try {
        await testCallback();
      } catch (error) {
        throw new Error(
          `Test failed at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}): ${error}`
        );
      }
    }
  }

  /**
   * Test keyboard navigation
   */
  static async testKeyboardNavigation(
    page: Page,
    startSelector: string,
    expectedSelectors: string[]
  ): Promise<void> {
    await page.locator(startSelector).focus();

    for (const selector of expectedSelectors) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.tagName.toLowerCase()
      );
      const expectedElement = await page.locator(selector).first();

      if (await expectedElement.isVisible()) {
        await expect(expectedElement).toBeFocused();
      }
    }
  }

  /**
   * Test accessibility with basic checks
   */
  static async checkBasicAccessibility(page: Page): Promise<void> {
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // Check for form labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }

    // Check for heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      const firstHeading = headings.first();
      const tagName = await firstHeading.evaluate(el =>
        el.tagName.toLowerCase()
      );
      expect(tagName).toBe('h1');
    }
  }

  /**
   * Wait for WebSocket connection
   */
  static async waitForWebSocketConnection(
    page: Page,
    timeout: number = 10000
  ): Promise<void> {
    await page.waitForFunction(
      () => {
        return (
          window.WebSocket &&
          Array.from(document.querySelectorAll('*')).some(
            el =>
              el.textContent?.includes('已连接') ||
              el.textContent?.includes('connected')
          )
        );
      },
      { timeout }
    );
  }

  /**
   * Simulate slow network conditions
   */
  static async simulateSlowNetwork(page: Page): Promise<void> {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024, // 50 KB/s
      uploadThroughput: 20 * 1024, // 20 KB/s
      latency: 500, // 500ms latency
    });
  }

  /**
   * Reset network conditions
   */
  static async resetNetworkConditions(page: Page): Promise<void> {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 10): string {
    return Math.random()
      .toString(36)
      .substring(2, length + 2);
  }

  /**
   * Format timestamp for test names
   */
  static getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }
}
