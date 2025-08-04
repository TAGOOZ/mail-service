# End-to-End Tests

This directory contains comprehensive end-to-end tests for the temporary mailbox website using Playwright.

## Test Structure

### Test Files

- **`mailbox-generation.spec.ts`** - Tests for mailbox generation functionality
- **`mail-receiving.spec.ts`** - Tests for mail reception and real-time updates
- **`mailbox-management.spec.ts`** - Tests for mailbox management operations
- **`complete-user-flow.spec.ts`** - Complete user journey tests
- **`accessibility.spec.ts`** - Comprehensive accessibility testing
- **`performance.spec.ts`** - Performance and load testing
- **`cross-browser.spec.ts`** - Cross-browser compatibility testing
- **`mobile.spec.ts`** - Mobile device and responsive design testing

### Page Objects

- **`pages/HomePage.ts`** - Page object for the homepage
- **`pages/MailboxPage.ts`** - Page object for the mailbox page
- **`pages/MailDetailPage.ts`** - Page object for mail detail page

### Utilities

- **`utils/mailUtils.ts`** - Utilities for mail-related test operations
- **`utils/testHelpers.ts`** - Common test helper functions
- **`test-config.ts`** - Test configuration for different environments

### Setup

- **`setup/global-setup.ts`** - Global test setup
- **`setup/global-teardown.ts`** - Global test teardown

## Running Tests

### Prerequisites

1. Ensure the backend and frontend services are running:

   ```bash
   npm run dev
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Basic Test Execution

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run tests with Playwright UI
npm run test:e2e:ui
```

### Test Suite Specific Execution

```bash
# Run specific test suites
node e2e/run-tests.js generation    # Mailbox generation tests
node e2e/run-tests.js receiving     # Mail receiving tests
node e2e/run-tests.js management    # Mailbox management tests
node e2e/run-tests.js flow          # Complete user flow tests
node e2e/run-tests.js accessibility # Accessibility tests
node e2e/run-tests.js performance   # Performance tests
node e2e/run-tests.js crossbrowser  # Cross-browser tests
node e2e/run-tests.js mobile        # Mobile device tests

# Run with specific browser
node e2e/run-tests.js all chromium  # All tests in Chromium
node e2e/run-tests.js flow firefox  # Flow tests in Firefox
node e2e/run-tests.js mobile webkit # Mobile tests in WebKit

# Run with specific mode
node e2e/run-tests.js all all headed # All tests with browser visible
node e2e/run-tests.js flow all debug # Flow tests in debug mode
```

### Browser-Specific Tests

```bash
# Run tests in Chromium only
npm run test:e2e:chromium

# Run tests in Firefox only
npm run test:e2e:firefox

# Run tests in WebKit only
npm run test:e2e:webkit

# Run mobile tests only
npm run test:e2e:mobile
```

### Environment Configuration

Set the `TEST_ENV` environment variable to run tests against different environments:

```bash
# Development (default)
TEST_ENV=development npm run test:e2e

# Staging
TEST_ENV=staging npm run test:e2e

# Production (use with caution)
TEST_ENV=production npm run test:e2e
```

## Test Coverage

### Functional Tests

1. **Mailbox Generation**
   - Generate new temporary mailbox
   - Validate mailbox address format
   - Copy mailbox address to clipboard
   - Generate multiple unique mailboxes
   - Handle generation errors

2. **Mail Reception**
   - Receive mails in real-time
   - Display mail list
   - View mail details
   - Handle HTML mail content safely
   - Display attachment information
   - Mark mails as read/unread

3. **Mailbox Management**
   - Extend mailbox expiry
   - Delete individual mails
   - Clear all mails
   - Refresh mail list
   - Generate new mailbox
   - Handle mailbox expiry

4. **Complete User Flow**
   - End-to-end user journey
   - Session persistence
   - Error recovery
   - Performance validation

### Cross-Browser Testing

Tests are executed across multiple browsers:

- Chromium (Chrome)
- Firefox
- WebKit (Safari)

### Mobile Testing

Tests include mobile-specific scenarios:

- iPhone 12 viewport
- Pixel 5 viewport
- iPad viewport
- Touch interactions
- Responsive design validation

### Performance Testing

- Page load time validation
- Mailbox generation time
- Mail reception time
- API response time monitoring
- Memory usage testing
- Large content rendering performance
- Concurrent user simulation
- Network condition testing

### Accessibility Testing

- Basic accessibility checks
- Keyboard navigation
- Screen reader support
- Color contrast validation
- Touch target size validation
- Focus management testing
- ARIA label verification
- Semantic structure validation

### Cross-Browser Compatibility

- Feature compatibility testing
- JavaScript API support
- CSS feature support
- HTML rendering consistency
- Network request handling
- Local storage functionality
- Error handling consistency

### Mobile Device Testing

- Touch gesture support
- Responsive design validation
- Mobile-specific UI elements
- Device orientation handling
- Mobile network conditions
- Virtual keyboard interactions
- Mobile accessibility compliance
- Performance on mobile devices

## Test Data

### Mock Mail Server

In test mode, the system uses a mock mail server to simulate mail reception. Test mails are generated with:

- Random sender addresses
- Configurable subjects and content
- HTML and plain text versions
- Attachment simulation

### Test Configuration

Different environments have specific configurations:

- Timeouts
- Retry policies
- Mail server settings
- Performance thresholds

## Debugging Tests

### Visual Debugging

```bash
# Run with browser visible
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug
```

### Test Reports

```bash
# View HTML test report
npm run test:e2e:report
```

### Screenshots and Videos

Failed tests automatically capture:

- Screenshots on failure
- Video recordings
- Trace files for debugging

Files are saved in `test-results/` directory.

### Logging

Tests include comprehensive logging:

- Test execution steps
- API calls
- Error messages
- Performance metrics

## Best Practices

### Writing Tests

1. **Use Page Objects** - Encapsulate page interactions
2. **Wait for Elements** - Use proper waiting strategies
3. **Handle Async Operations** - Properly await promises
4. **Clean Test Data** - Ensure tests don't interfere with each other
5. **Descriptive Test Names** - Make test purposes clear

### Test Organization

1. **Group Related Tests** - Use describe blocks
2. **Setup and Teardown** - Use beforeEach/afterEach appropriately
3. **Independent Tests** - Each test should be runnable independently
4. **Shared Utilities** - Extract common functionality

### Error Handling

1. **Graceful Failures** - Handle expected errors
2. **Retry Logic** - Implement appropriate retry strategies
3. **Clear Error Messages** - Provide helpful failure information
4. **Cleanup on Failure** - Ensure proper cleanup even when tests fail

## Continuous Integration

### GitHub Actions

Tests can be integrated into CI/CD pipelines:

```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    TEST_ENV: staging
```

### Docker Support

Tests can run in containerized environments with proper service dependencies.

## Troubleshooting

### Common Issues

1. **Services Not Ready**
   - Ensure backend and frontend are running
   - Check port availability
   - Verify database connections

2. **Browser Installation**
   - Run `npx playwright install`
   - Check system dependencies

3. **Timeout Issues**
   - Adjust timeout configurations
   - Check network connectivity
   - Verify service performance

4. **Test Flakiness**
   - Review waiting strategies
   - Check for race conditions
   - Validate test data cleanup

### Getting Help

- Check Playwright documentation
- Review test logs and traces
- Use debug mode for step-by-step execution
- Examine screenshots and videos from failed tests
