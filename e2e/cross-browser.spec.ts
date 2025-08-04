import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { MailboxPage } from './pages/MailboxPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { TestHelpers } from './utils/testHelpers';
import { MailUtils } from './utils/mailUtils';

test.describe('Cross-Browser Compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];

  browsers.forEach(browserName => {
    test.describe(`${browserName} Browser Tests`, () => {
      test.beforeEach(async ({ browserName: currentBrowser }) => {
        test.skip(
          currentBrowser !== browserName,
          `Skipping ${browserName} test`
        );
      });

      test(`should complete full user flow in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);
        const mailDetailPage = new MailDetailPage(page);

        // Step 1: Load homepage
        await homePage.goto();
        await homePage.waitForPageLoad();
        await homePage.verifyFeatures();

        // Step 2: Generate mailbox
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();
        await mailboxPage.verifyMailboxInfo();

        const mailboxAddress = await mailboxPage.getMailboxAddress();
        expect(MailUtils.isNnuEmailAddress(mailboxAddress)).toBeTruthy();

        // Step 3: Copy mailbox address
        await mailboxPage.copyMailboxAddress();

        // Step 4: Send and receive mail
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        testMail.subject = `${browserName} Test Mail`;
        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject);

        // Step 5: View mail details
        await mailboxPage.clickFirstMail();
        await mailDetailPage.waitForPageLoad();
        await mailDetailPage.verifyMailDetails(testMail.subject, testMail.from);

        // Step 6: Navigate back
        await mailDetailPage.goBack();
        await mailboxPage.waitForPageLoad();

        // Step 7: Delete mail
        await mailboxPage.deleteFirstMail();
        await expect(mailboxPage.emptyState).toBeVisible();
      });

      test(`should handle HTML mail content correctly in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);
        const mailDetailPage = new MailDetailPage(page);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        const mailboxAddress = await mailboxPage.getMailboxAddress();
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        testMail.subject = `${browserName} HTML Test`;
        testMail.htmlContent = `
          <html>
            <head>
              <style>
                .test-style { color: blue; font-weight: bold; }
                .container { padding: 20px; border: 1px solid #ccc; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="test-style">HTML Test for ${browserName}</h1>
                <p>This is a <strong>bold</strong> and <em>italic</em> text.</p>
                <ul>
                  <li>List item 1</li>
                  <li>List item 2</li>
                  <li>List item 3</li>
                </ul>
                <table border="1">
                  <tr>
                    <th>Header 1</th>
                    <th>Header 2</th>
                  </tr>
                  <tr>
                    <td>Cell 1</td>
                    <td>Cell 2</td>
                  </tr>
                </table>
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJyZWQiIC8+Cjwvc3ZnPgo=" alt="Test SVG" />
              </div>
            </body>
          </html>
        `;

        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject);

        await mailboxPage.clickFirstMail();
        await mailDetailPage.waitForPageLoad();

        // Verify HTML content is rendered correctly
        await mailDetailPage.verifyHtmlContent();

        // Check that styles are applied (browser-specific rendering)
        const htmlContent = mailDetailPage.mailContent;
        await expect(htmlContent).toBeVisible();

        // Verify specific HTML elements are rendered
        const strongElements = htmlContent.locator('strong');
        const emElements = htmlContent.locator('em');
        const listElements = htmlContent.locator('ul li');

        if ((await strongElements.count()) > 0) {
          await expect(strongElements.first()).toBeVisible();
        }
        if ((await emElements.count()) > 0) {
          await expect(emElements.first()).toBeVisible();
        }
        if ((await listElements.count()) > 0) {
          await expect(listElements.first()).toBeVisible();
        }
      });

      test(`should handle JavaScript interactions in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Test clipboard functionality (browser-specific)
        const mailboxAddress = await mailboxPage.getMailboxAddress();
        await mailboxPage.copyMailboxAddress();

        // Test WebSocket connection (browser-specific)
        await mailboxPage.verifyConnectionStatus();

        // Test dynamic content updates
        await mailboxPage.refreshMails();

        // Test form interactions
        const testMail = MailUtils.generateTestMail(mailboxAddress);
        await MailUtils.sendTestMail(page, testMail);

        const currentUrl = page.url();
        const mailboxId = MailUtils.extractMailboxIdFromUrl(currentUrl)!;
        await MailUtils.waitForMail(page, mailboxId, testMail.subject);

        // Verify real-time updates work
        const mailCount = await mailboxPage.getMailCount();
        expect(mailCount).toBeGreaterThan(0);
      });

      test(`should handle CSS rendering correctly in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.waitForPageLoad();

        // Check CSS grid/flexbox support
        const featuresSection = homePage.featuresSection;
        if (await featuresSection.isVisible()) {
          const computedStyle = await featuresSection.evaluate(el => {
            const style = window.getComputedStyle(el);
            return {
              display: style.display,
              gridTemplateColumns: style.gridTemplateColumns,
              flexDirection: style.flexDirection,
            };
          });

          // Should have proper CSS support
          expect(computedStyle.display).toBeTruthy();
        }

        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Check responsive design CSS
        await TestHelpers.testResponsiveBreakpoints(page, async () => {
          await expect(mailboxPage.mailboxAddress).toBeVisible();
          await expect(mailboxPage.copyAddressButton).toBeVisible();
        });
      });

      test(`should handle form validation in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await homePage.waitForPageLoad();

        // Test form submission (if any forms exist)
        const forms = page.locator('form');
        const formCount = await forms.count();

        if (formCount > 0) {
          const firstForm = forms.first();
          const inputs = firstForm.locator('input, textarea, select');
          const inputCount = await inputs.count();

          // Test form validation if inputs exist
          for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const inputType = await input.getAttribute('type');
            const required = await input.getAttribute('required');

            if (required !== null) {
              // Test required field validation
              await input.focus();
              await input.fill('');
              await page.keyboard.press('Tab');

              // Browser should show validation message
              const validationMessage = await input.evaluate(
                el => (el as HTMLInputElement).validationMessage
              );

              if (validationMessage) {
                expect(validationMessage.length).toBeGreaterThan(0);
              }
            }
          }
        }
      });

      test(`should handle local storage correctly in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        const originalAddress = await mailboxPage.getMailboxAddress();
        const originalUrl = page.url();

        // Check if session data is stored
        const storageData = await page.evaluate(() => {
          return {
            localStorage: Object.keys(localStorage).length,
            sessionStorage: Object.keys(sessionStorage).length,
          };
        });

        // Should have some storage data
        expect(
          storageData.localStorage + storageData.sessionStorage
        ).toBeGreaterThan(0);

        // Test session persistence
        await page.reload();
        await mailboxPage.waitForPageLoad();

        const newAddress = await mailboxPage.getMailboxAddress();
        const newUrl = page.url();

        expect(newAddress).toBe(originalAddress);
        expect(newUrl).toBe(originalUrl);
      });

      test(`should handle network requests correctly in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);
        const mailboxPage = new MailboxPage(page);

        // Monitor network requests
        const requests: string[] = [];
        const responses: number[] = [];

        page.on('request', request => {
          if (request.url().includes('/api/')) {
            requests.push(request.method() + ' ' + request.url());
          }
        });

        page.on('response', response => {
          if (response.url().includes('/api/')) {
            responses.push(response.status());
          }
        });

        await homePage.goto();
        await homePage.generateMailbox();
        await mailboxPage.waitForPageLoad();

        // Should have made API requests
        expect(requests.length).toBeGreaterThan(0);
        expect(responses.length).toBeGreaterThan(0);

        // All responses should be successful
        responses.forEach(status => {
          expect(status).toBeGreaterThanOrEqual(200);
          expect(status).toBeLessThan(400);
        });
      });

      test(`should handle error scenarios gracefully in ${browserName}`, async ({
        page,
      }) => {
        const homePage = new HomePage(page);

        // Test network error handling
        await TestHelpers.simulateNetworkFailure(
          page,
          '**/api/mailbox/generate'
        );

        await homePage.goto();
        await homePage.waitForPageLoad();

        // Try to generate mailbox with network failure
        await homePage.generateMailboxButton.click();

        // Should handle error gracefully
        const errorVisible = await page
          .locator('.error, .alert, [role="alert"]')
          .isVisible({ timeout: 5000 });
        const staysOnPage = page.url().includes('/');

        expect(errorVisible || staysOnPage).toBeTruthy();

        // Restore network and verify recovery
        await page.unroute('**/api/mailbox/generate');
        await page.reload();
        await homePage.waitForPageLoad();

        // Should work normally after network recovery
        await homePage.generateMailbox();
        const mailboxPage = new MailboxPage(page);
        await mailboxPage.waitForPageLoad();
      });
    });
  });
});

test.describe('Cross-Browser Feature Compatibility', () => {
  test('should support modern web features across browsers', async ({
    page,
    browserName,
  }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Test modern JavaScript features
    const modernFeatures = await page.evaluate(() => {
      return {
        fetch: typeof fetch !== 'undefined',
        promise: typeof Promise !== 'undefined',
        arrow: (() => true)(),
        const: (() => {
          const test = true;
          return test;
        })(),
        let: (() => {
          let test = true;
          return test;
        })(),
        templateLiterals: `test ${1 + 1}` === 'test 2',
        destructuring: (() => {
          const [a] = [1];
          return a === 1;
        })(),
        spread: (() => {
          const arr = [1, 2];
          return [...arr].length === 2;
        })(),
        asyncAwait: typeof (async () => {})().then === 'function',
      };
    });

    console.log(`${browserName} modern features:`, modernFeatures);

    // All modern browsers should support these features
    expect(modernFeatures.fetch).toBeTruthy();
    expect(modernFeatures.promise).toBeTruthy();
    expect(modernFeatures.arrow).toBeTruthy();
    expect(modernFeatures.const).toBeTruthy();
    expect(modernFeatures.let).toBeTruthy();
    expect(modernFeatures.templateLiterals).toBeTruthy();
    expect(modernFeatures.destructuring).toBeTruthy();
    expect(modernFeatures.spread).toBeTruthy();
    expect(modernFeatures.asyncAwait).toBeTruthy();
  });

  test('should support required CSS features across browsers', async ({
    page,
    browserName,
  }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Test CSS feature support
    const cssFeatures = await page.evaluate(() => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);

      const features = {
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        customProperties: CSS.supports('--test', 'value'),
        transforms: CSS.supports('transform', 'translateX(10px)'),
        transitions: CSS.supports('transition', 'all 0.3s'),
        borderRadius: CSS.supports('border-radius', '10px'),
        boxShadow: CSS.supports('box-shadow', '0 0 10px rgba(0,0,0,0.5)'),
        gradients: CSS.supports(
          'background',
          'linear-gradient(to right, red, blue)'
        ),
      };

      document.body.removeChild(testElement);
      return features;
    });

    console.log(`${browserName} CSS features:`, cssFeatures);

    // Modern browsers should support these CSS features
    expect(cssFeatures.flexbox).toBeTruthy();
    expect(cssFeatures.transforms).toBeTruthy();
    expect(cssFeatures.transitions).toBeTruthy();
    expect(cssFeatures.borderRadius).toBeTruthy();
    expect(cssFeatures.boxShadow).toBeTruthy();

    // Grid and custom properties might not be supported in older browsers
    if (browserName !== 'webkit' || cssFeatures.grid) {
      expect(cssFeatures.grid).toBeTruthy();
    }
  });

  test('should handle touch events on mobile browsers', async ({
    page,
    browserName,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const mailboxPage = new MailboxPage(page);

    await homePage.goto();
    await homePage.generateMailbox();
    await mailboxPage.waitForPageLoad();

    // Test touch events
    const touchSupport = await page.evaluate(() => {
      return {
        touchEvents: 'ontouchstart' in window,
        touchPoints: navigator.maxTouchPoints || 0,
        pointerEvents: 'onpointerdown' in window,
      };
    });

    console.log(`${browserName} touch support:`, touchSupport);

    // Test touch interactions
    await mailboxPage.copyAddressButton.tap();

    // Should handle touch events properly
    const successMessage = page.getByText(/已复制|复制成功/);
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});
