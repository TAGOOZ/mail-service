/**
 * Test configuration for different environments
 */
export interface TestConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: {
    default: number;
    mailReception: number;
    pageLoad: number;
  };
  retries: number;
  mailServer: {
    host: string;
    port: number;
    testMode: boolean;
  };
  performance: {
    pageLoadTime: number;
    mailboxGenerationTime: number;
    mailReceptionTime: number;
    apiResponseTime: number;
  };
}

export const testConfigs: Record<string, TestConfig> = {
  development: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:3001',
    timeout: {
      default: 10000,
      mailReception: 30000,
      pageLoad: 10000,
    },
    retries: 1,
    mailServer: {
      host: 'localhost',
      port: 2525,
      testMode: true,
    },
    performance: {
      pageLoadTime: 5000,
      mailboxGenerationTime: 10000,
      mailReceptionTime: 30000,
      apiResponseTime: 2000,
    },
  },

  staging: {
    baseUrl: 'https://staging.mail.nnu.edu.kg',
    apiUrl: 'https://staging-api.mail.nnu.edu.kg',
    timeout: {
      default: 15000,
      mailReception: 45000,
      pageLoad: 15000,
    },
    retries: 2,
    mailServer: {
      host: 'staging-mail.nnu.edu.kg',
      port: 25,
      testMode: false,
    },
    performance: {
      pageLoadTime: 8000,
      mailboxGenerationTime: 15000,
      mailReceptionTime: 45000,
      apiResponseTime: 3000,
    },
  },

  production: {
    baseUrl: 'https://mail.nnu.edu.kg',
    apiUrl: 'https://api.mail.nnu.edu.kg',
    timeout: {
      default: 20000,
      mailReception: 60000,
      pageLoad: 20000,
    },
    retries: 3,
    mailServer: {
      host: 'mail.nnu.edu.kg',
      port: 25,
      testMode: false,
    },
    performance: {
      pageLoadTime: 10000,
      mailboxGenerationTime: 20000,
      mailReceptionTime: 60000,
      apiResponseTime: 5000,
    },
  },
};

export function getTestConfig(): TestConfig {
  const env = process.env.TEST_ENV || 'development';
  const config = testConfigs[env];

  if (!config) {
    throw new Error(`Unknown test environment: ${env}`);
  }

  return config;
}

export const TEST_DATA = {
  // Test email domains for sending test mails
  testSenderDomains: ['example.com', 'test.com', 'demo.org'],

  // Common test subjects
  testSubjects: [
    'Email Verification',
    'Password Reset',
    'Welcome Message',
    'Account Notification',
    'Security Alert',
  ],

  // Test content templates
  testContentTemplates: {
    verification: {
      subject: 'Please verify your email address',
      text: 'Click the link below to verify your email address: {verificationLink}',
      html: '<p>Click <a href="{verificationLink}">here</a> to verify your email address.</p>',
    },
    passwordReset: {
      subject: 'Password reset request',
      text: 'You requested a password reset. Click the link to reset: {resetLink}',
      html: '<p>You requested a password reset. <a href="{resetLink}">Click here</a> to reset your password.</p>',
    },
    welcome: {
      subject: 'Welcome to our service!',
      text: "Thank you for signing up. We're excited to have you on board!",
      html: "<h2>Welcome!</h2><p>Thank you for signing up. We're excited to have you on board!</p>",
    },
  },

  // Browser configurations for cross-browser testing
  browsers: [
    {
      name: 'chromium',
      viewport: { width: 1280, height: 720 },
    },
    {
      name: 'firefox',
      viewport: { width: 1280, height: 720 },
    },
    {
      name: 'webkit',
      viewport: { width: 1280, height: 720 },
    },
  ],

  // Mobile device configurations
  mobileDevices: [
    {
      name: 'iPhone 12',
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    },
    {
      name: 'Pixel 5',
      viewport: { width: 393, height: 851 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
    },
    {
      name: 'iPad',
      viewport: { width: 768, height: 1024 },
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  ],

  // Performance thresholds
  performance: {
    pageLoadTime: 5000, // 5 seconds
    mailboxGenerationTime: 10000, // 10 seconds
    mailReceptionTime: 30000, // 30 seconds
    apiResponseTime: 2000, // 2 seconds
  },

  // Accessibility requirements
  accessibility: {
    checkColorContrast: true,
    checkKeyboardNavigation: true,
    checkScreenReaderSupport: true,
    checkFocusManagement: true,
  },
};
