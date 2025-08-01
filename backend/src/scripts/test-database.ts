#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { DatabaseService } from '../services/database';
import { Mailbox } from '../models/Mailbox';
import { Mail } from '../models/Mail';
import { SessionManager } from '../models/Session';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function testDatabaseConnections() {
  try {
    logger.info('Starting database connection test...');

    // Initialize database service
    await DatabaseService.initialize();
    logger.info('✅ Database service initialized successfully');

    // Check health status
    const health = await DatabaseService.getHealthStatus();
    logger.info(
      `✅ Database health check: MongoDB=${health.mongodb}, Redis=${health.redis}, Overall=${health.overall}`
    );

    if (!health.overall) {
      throw new Error('Database health check failed');
    }

    // Test MongoDB operations
    await testMongoDBOperations();

    // Test Redis operations
    await testRedisOperations();

    // Test migration status
    const migrationStatus = await DatabaseService.getMigrationStatus();
    logger.info(
      `✅ Migration status: ${migrationStatus.applied.length} applied, ${migrationStatus.pending.length} pending`
    );

    logger.info('✅ All database tests passed successfully!');
  } catch (error) {
    logger.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    await DatabaseService.shutdown();
    logger.info('Database connections closed');
    process.exit(0);
  }
}

async function testMongoDBOperations() {
  logger.info('Testing MongoDB operations...');

  // Test Mailbox operations
  const testMailbox = new Mailbox({
    address: 'test-' + Date.now() + '@nnu.edu.kg',
    token: 'test-token-' + Date.now(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await testMailbox.save();
  logger.info('✅ Mailbox created successfully');

  // Test mailbox methods
  const foundMailbox = await Mailbox.findByToken(testMailbox.token);
  if (!foundMailbox) {
    throw new Error('Failed to find mailbox by token');
  }
  logger.info('✅ Mailbox found by token');

  // Test Mail operations
  const testMail = new Mail({
    mailboxId: testMailbox._id.toString(),
    from: 'test@example.com',
    to: testMailbox.address,
    subject: 'Test Email',
    textContent: 'This is a test email',
    size: 1024,
    attachments: [
      {
        filename: 'test.txt',
        contentType: 'text/plain',
        size: 100,
      },
    ],
  });

  await testMail.save();
  logger.info('✅ Mail created successfully');

  // Test mail methods
  const mails = await Mail.findByMailboxId(testMailbox._id.toString());
  if (mails.length === 0) {
    throw new Error('Failed to find mails by mailbox ID');
  }
  logger.info('✅ Mails found by mailbox ID');

  const mailCount = await Mail.countByMailboxId(testMailbox._id.toString());
  if (mailCount !== 1) {
    throw new Error('Incorrect mail count');
  }
  logger.info('✅ Mail count is correct');

  // Test instance methods
  if (!testMail.hasAttachments()) {
    throw new Error('Mail should have attachments');
  }
  if (testMail.getAttachmentCount() !== 1) {
    throw new Error('Incorrect attachment count');
  }
  logger.info('✅ Mail instance methods work correctly');

  // Clean up test data
  await Mail.deleteByMailboxId(testMailbox._id.toString());
  await testMailbox.deleteOne();
  logger.info('✅ Test data cleaned up');
}

async function testRedisOperations() {
  logger.info('Testing Redis operations...');

  const testSession = {
    mailboxId: 'test-mailbox-' + Date.now(),
    token: 'test-session-token-' + Date.now(),
    createdAt: new Date(),
    lastAccessAt: new Date(),
    userAgent: 'Test User Agent',
    ipAddress: '127.0.0.1',
  };

  // Test session creation
  await SessionManager.createSession(testSession);
  logger.info('✅ Session created successfully');

  // Test session retrieval
  const retrievedSession = await SessionManager.getSession(testSession.token);
  if (!retrievedSession) {
    throw new Error('Failed to retrieve session');
  }
  if (retrievedSession.mailboxId !== testSession.mailboxId) {
    throw new Error('Session data mismatch');
  }
  logger.info('✅ Session retrieved successfully');

  // Test session validation
  const isValid = await SessionManager.isValidSession(testSession.token);
  if (!isValid) {
    throw new Error('Session should be valid');
  }
  logger.info('✅ Session validation works');

  // Test session update
  await SessionManager.updateLastAccess(testSession.token);
  const updatedSession = await SessionManager.getSession(testSession.token);
  if (
    !updatedSession ||
    updatedSession.lastAccessAt.getTime() <= testSession.lastAccessAt.getTime()
  ) {
    throw new Error('Session last access time not updated');
  }
  logger.info('✅ Session update works');

  // Test session deletion
  await SessionManager.deleteSession(testSession.token);
  const deletedSession = await SessionManager.getSession(testSession.token);
  if (deletedSession) {
    throw new Error('Session should be deleted');
  }
  logger.info('✅ Session deletion works');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabaseConnections();
}
