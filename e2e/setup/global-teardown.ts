import { FullConfig } from '@playwright/test';
import { getTestConfig } from '../test-config';

async function globalTeardown(config: FullConfig) {
  const testConfig = getTestConfig();

  console.log('🧹 Starting global test teardown...');

  try {
    // Cleanup test data if needed
    if (testConfig.mailServer.testMode) {
      console.log('🗑️ Cleaning up test mail server...');
      // In a real implementation, you might stop test SMTP server here
      // or cleanup mock mail services
    }

    // Generate test report summary
    const fs = require('fs');
    const path = require('path');

    const testResultsDir = path.join(process.cwd(), 'test-results');
    const reportPath = path.join(testResultsDir, 'test-summary.json');

    const summary = {
      timestamp: new Date().toISOString(),
      environment: process.env.TEST_ENV || 'development',
      baseUrl: testConfig.baseUrl,
      apiUrl: testConfig.apiUrl,
      testConfig: {
        timeout: testConfig.timeout,
        retries: testConfig.retries,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log('📊 Test summary report generated');

    // Cleanup temporary files if any
    const tempDir = path.join(testResultsDir, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️ Temporary files cleaned up');
    }

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('💥 Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
