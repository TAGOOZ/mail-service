#!/usr/bin/env ts-node

/**
 * Test script for mail receiving functionality
 * This script demonstrates how the mail receiving service works
 */

import { MailParserService } from '../services/mailParserService';
import { MailReceivingService } from '../services/mailReceivingService';
import { logger } from '../utils/logger';

async function testMailParsing() {
  console.log('=== Testing Mail Parsing ===');

  const testEmail = `From: test-sender@example.com
To: testuser@nnu.edu.kg
Subject: Test Email from Integration Script
Date: ${new Date().toUTCString()}
Content-Type: text/html; charset=utf-8

<html>
<body>
<h1>Test Email</h1>
<p>This is a test email sent to verify the mail parsing functionality.</p>
<p>It contains <strong>HTML content</strong> and should be properly parsed.</p>
<script>alert('This should be removed');</script>
</body>
</html>`;

  try {
    const parsed = await MailParserService.parseRawMail(testEmail);

    console.log('Parsed email successfully:');
    console.log('- From:', parsed.from);
    console.log('- To:', parsed.to);
    console.log('- Subject:', parsed.subject);
    console.log(
      '- Text Content:',
      parsed.textContent.substring(0, 100) + '...'
    );
    console.log(
      '- HTML Content:',
      parsed.htmlContent ? 'Present' : 'Not present'
    );
    console.log('- Attachments:', parsed.attachments.length);
    console.log('- Size:', parsed.size, 'bytes');
    console.log('- HTML sanitized:', !parsed.htmlContent?.includes('<script>'));
  } catch (error) {
    console.error('Failed to parse email:', error);
  }
}

async function testMailReceivingService() {
  console.log('\n=== Testing Mail Receiving Service ===');

  const mailService = new MailReceivingService(2527); // Use test port

  try {
    // Test service lifecycle
    console.log('Initial status:', mailService.getStatus());

    await mailService.start();
    console.log('After start:', mailService.getStatus());

    // Set up event listener
    mailService.on('mailReceived', event => {
      console.log('Mail received event:', {
        mailboxId: event.mailboxId,
        from: event.mail.from,
        subject: event.mail.subject,
      });
    });

    console.log('Mail receiving service is running on port 2527');
    console.log(
      'You can test it by sending an email to any address @nnu.edu.kg'
    );

    // Stop after a short delay
    setTimeout(async () => {
      await mailService.stop();
      console.log('After stop:', mailService.getStatus());
      console.log('Test completed successfully!');
    }, 2000);
  } catch (error) {
    console.error('Failed to test mail receiving service:', error);
  }
}

async function testDomainValidation() {
  console.log('\n=== Testing Domain Validation ===');

  const testCases = [
    'user@nnu.edu.kg',
    'test123@nnu.edu.kg',
    'invalid@gmail.com',
    'user@example.com',
    'test@nnu.edu.cn',
  ];

  testCases.forEach(email => {
    const isOurDomain = MailParserService.isOurDomain(email);
    const mailboxId = MailParserService.extractMailboxIdFromEmail(email);
    console.log(`${email}: ${isOurDomain ? '✓' : '✗'} (mailbox: ${mailboxId})`);
  });
}

async function main() {
  try {
    await testMailParsing();
    await testDomainValidation();
    await testMailReceivingService();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main();
}
