import { chromium, FullConfig } from '@playwright/test';
import { getTestConfig } from '../test-config';

async function globalSetup(config: FullConfig) {
  const testConfig = getTestConfig();

  console.log('🚀 Starting global test setup...');
  console.log(`📍 Environment: ${process.env.TEST_ENV || 'development'}`);
  console.log(`🌐 Base URL: ${testConfig.baseUrl}`);
  console.log(`🔗 API URL: ${testConfig.apiUrl}`);

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');

    // Check if frontend is accessible
    try {
      await page.goto(testConfig.baseUrl, { timeout: 30000 });
      console.log('✅ Frontend service is ready');
    } catch (error) {
      console.error('❌ Frontend service is not accessible:', error);
      throw new Error('Frontend service is not ready');
    }

    // Check if backend API is accessible
    try {
      const response = await page.request.get(`${testConfig.apiUrl}/health`);
      if (response.ok()) {
        console.log('✅ Backend API service is ready');
      } else {
        throw new Error(`Backend API returned status: ${response.status()}`);
      }
    } catch (error) {
      console.error('❌ Backend API service is not accessible:', error);
      throw new Error('Backend API service is not ready');
    }

    // Setup test data or mock services if needed
    if (testConfig.mailServer.testMode) {
      console.log('🧪 Setting up test mail server...');
      // In a real implementation, you might start a test SMTP server here
      // or configure mock mail services
    }

    // Create test results directory
    const fs = require('fs');
    const path = require('path');

    const testResultsDir = path.join(process.cwd(), 'test-results');
    const screenshotsDir = path.join(testResultsDir, 'screenshots');
    const videosDir = path.join(testResultsDir, 'videos');

    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    console.log('📁 Test results directories created');

    // Warm up the application
    console.log('🔥 Warming up application...');
    await page.goto(testConfig.baseUrl);
    await page.waitForLoadState('networkidle');

    // Generate a test mailbox to warm up the system
    const generateButton = page.getByRole('button', { name: /生成临时邮箱/ });
    if (await generateButton.isVisible({ timeout: 5000 })) {
      await generateButton.click();
      await page.waitForURL(/\/mailbox\/[a-f0-9]+/, { timeout: 10000 });
      console.log('✅ Application warmed up successfully');
    }

    console.log('🎉 Global setup completed successfully');
  } catch (error) {
    console.error('💥 Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
