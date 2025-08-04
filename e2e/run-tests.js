#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test suites configuration
const testSuites = {
  generation: 'mailbox-generation.spec.ts',
  receiving: 'mail-receiving.spec.ts',
  management: 'mailbox-management.spec.ts',
  flow: 'complete-user-flow.spec.ts',
  accessibility: 'accessibility.spec.ts',
  performance: 'performance.spec.ts',
  crossbrowser: 'cross-browser.spec.ts',
  mobile: 'mobile.spec.ts',
  all: '*.spec.ts',
};

// Browser configurations
const browsers = {
  chromium: '--project=chromium',
  firefox: '--project=firefox',
  webkit: '--project=webkit',
  mobile: '--project="Mobile Chrome" --project="Mobile Safari"',
  all: '', // Run all projects
};

// Parse command line arguments
const args = process.argv.slice(2);
const suite = args[0] || 'all';
const browser = args[1] || 'all';
const mode = args[2] || 'normal'; // normal, headed, debug, ui

// Validate arguments
if (!testSuites[suite]) {
  console.error(`❌ Invalid test suite: ${suite}`);
  console.log('Available suites:', Object.keys(testSuites).join(', '));
  process.exit(1);
}

if (!browsers[browser]) {
  console.error(`❌ Invalid browser: ${browser}`);
  console.log('Available browsers:', Object.keys(browsers).join(', '));
  process.exit(1);
}

// Build command
let command = 'npx playwright test';
const testFile = testSuites[suite];

// Add test file
if (testFile !== '*.spec.ts') {
  command += ` ${testFile}`;
}

// Add browser project
if (browsers[browser]) {
  command += ` ${browsers[browser]}`;
}

// Add mode flags
switch (mode) {
  case 'headed':
    command += ' --headed';
    break;
  case 'debug':
    command += ' --debug';
    break;
  case 'ui':
    command += ' --ui';
    break;
  case 'normal':
  default:
    // No additional flags
    break;
}

// Add environment variables
const env = {
  ...process.env,
  TEST_ENV: process.env.TEST_ENV || 'development',
};

console.log('🚀 Running E2E Tests');
console.log('📋 Configuration:');
console.log(`   Suite: ${suite} (${testFile})`);
console.log(`   Browser: ${browser}`);
console.log(`   Mode: ${mode}`);
console.log(`   Environment: ${env.TEST_ENV}`);
console.log(`   Command: ${command}`);
console.log('');

// Execute command
const child = spawn(command, {
  shell: true,
  stdio: 'inherit',
  env: env,
  cwd: process.cwd(),
});

child.on('close', code => {
  if (code === 0) {
    console.log('');
    console.log('✅ Tests completed successfully!');
    console.log('📊 View HTML report: npm run test:e2e:report');
  } else {
    console.log('');
    console.log('❌ Tests failed with exit code:', code);
    console.log('🔍 Check test results in test-results/ directory');
  }
  process.exit(code);
});

child.on('error', error => {
  console.error('💥 Failed to start test process:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  child.kill('SIGTERM');
});
