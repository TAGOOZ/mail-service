import { Page } from '@playwright/test';

export interface TestMail {
  from: string;
  to: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
}

/**
 * Utility functions for mail testing
 */
export class MailUtils {
  /**
   * Generate a test email with random content
   */
  static generateTestMail(toAddress: string): TestMail {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    return {
      from: `test-sender-${randomId}@example.com`,
      to: toAddress,
      subject: `Test Email ${timestamp}`,
      textContent: `This is a test email sent at ${new Date().toISOString()}.\n\nContent ID: ${randomId}`,
      htmlContent: `
        <html>
          <body>
            <h1>Test Email ${timestamp}</h1>
            <p>This is a <strong>test email</strong> sent at ${new Date().toISOString()}.</p>
            <p>Content ID: <em>${randomId}</em></p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
            </ul>
          </body>
        </html>
      `,
    };
  }

  /**
   * Send a test email to the backend (mock implementation)
   * In a real scenario, this would integrate with the mail server
   */
  static async sendTestMail(page: Page, mail: TestMail): Promise<void> {
    // This is a mock implementation
    // In a real test environment, you would:
    // 1. Use a test SMTP server
    // 2. Send actual emails to the mailbox
    // 3. Or use the backend API to inject test mails

    // For now, we'll simulate by calling a test endpoint
    await page.evaluate(async mailData => {
      try {
        const response = await fetch('/api/test/send-mail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mailData),
        });

        if (!response.ok) {
          throw new Error(`Failed to send test mail: ${response.statusText}`);
        }
      } catch (error) {
        console.warn(
          'Test mail endpoint not available, skipping mail send:',
          error
        );
      }
    }, mail);
  }

  /**
   * Wait for a specific mail to appear in the mailbox
   */
  static async waitForMail(
    page: Page,
    mailboxId: string,
    expectedSubject: string,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Check if mail appears in the list
        const mailItems = page.locator('[data-testid="mail-item"]');
        const count = await mailItems.count();

        for (let i = 0; i < count; i++) {
          const mailItem = mailItems.nth(i);
          const subjectText = await mailItem
            .locator('[data-testid="mail-subject"]')
            .textContent();

          if (subjectText?.includes(expectedSubject)) {
            return true;
          }
        }

        // Wait a bit before checking again
        await page.waitForTimeout(1000);
      } catch (error) {
        // Continue waiting
        await page.waitForTimeout(1000);
      }
    }

    return false;
  }

  /**
   * Extract mailbox ID from URL
   */
  static extractMailboxIdFromUrl(url: string): string | null {
    const match = url.match(/\/mailbox\/([a-f0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract mail ID from URL
   */
  static extractMailIdFromUrl(url: string): string | null {
    const match = url.match(/\/mail\/([a-f0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Validate email address format
   */
  static isValidEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email address belongs to nnu.edu.kg domain
   */
  static isNnuEmailAddress(email: string): boolean {
    return email.endsWith('@nnu.edu.kg');
  }

  /**
   * Generate random email address for nnu.edu.kg domain
   */
  static generateRandomNnuEmail(): string {
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${randomString}@nnu.edu.kg`;
  }

  /**
   * Clean up test data (if needed)
   */
  static async cleanupTestData(page: Page, mailboxId: string): Promise<void> {
    try {
      await page.evaluate(async id => {
        const response = await fetch(`/api/test/cleanup/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.warn('Failed to cleanup test data:', response.statusText);
        }
      }, mailboxId);
    } catch (error) {
      console.warn('Cleanup endpoint not available:', error);
    }
  }
}
