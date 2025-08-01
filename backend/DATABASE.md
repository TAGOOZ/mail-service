# Database Implementation

This document describes the database implementation for the temporary email website backend.

## Overview

The database layer consists of:

- **MongoDB**: Primary database for storing mailboxes and emails
- **Redis**: Cache and session storage
- **Mongoose**: MongoDB ODM for schema definition and validation
- **Migration System**: Database schema versioning and updates

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Application   │
│     Layer       │    │     Layer       │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  DatabaseService│    │ SessionManager  │
│   (MongoDB)     │    │    (Redis)      │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│    Mongoose     │    │   Redis Client  │
│   Models        │    │                 │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│    MongoDB      │    │     Redis       │
│   Database      │    │    Database     │
└─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tempmail

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Test Environment
MONGODB_URI=mongodb://localhost:27017/tempmail_test  # For tests
REDIS_URL=redis://localhost:6379/1                  # For tests
```

### Connection Options

**MongoDB:**

- Connection pooling: 10 connections max
- Server selection timeout: 5 seconds
- Socket timeout: 45 seconds
- Automatic reconnection with error handling

**Redis:**

- Connection timeout: 5 seconds
- Reconnection strategy: Exponential backoff (max 10 retries)
- Automatic connection management

## Data Models

### Mailbox Model

```typescript
interface IMailbox {
  id: string;
  address: string; // Format: random@nnu.edu.kg
  token: string; // Unique access token
  createdAt: Date;
  expiresAt: Date; // 24 hours from creation
  extensionCount: number; // Max 2 extensions (12h each)
  isActive: boolean;
  lastAccessAt: Date;
}
```

**Features:**

- Email address validation (must end with @nnu.edu.kg)
- Unique token generation for secure access
- TTL (Time To Live) automatic cleanup
- Extension limit enforcement
- Compound indexes for efficient queries

**Instance Methods:**

- `isExpired()`: Check if mailbox has expired
- `canExtend()`: Check if mailbox can be extended
- `extend()`: Extend mailbox by 12 hours

**Static Methods:**

- `findByToken(token)`: Find mailbox by access token
- `findActiveMailboxes()`: Get all active mailboxes
- `findExpiredMailboxes()`: Get expired mailboxes for cleanup

### Mail Model

```typescript
interface IMail {
  id: string;
  mailboxId: string; // Reference to mailbox
  from: string; // Sender email
  to: string; // Recipient email
  subject: string;
  textContent: string; // Plain text content
  htmlContent?: string; // HTML content (optional)
  attachments: IAttachment[];
  receivedAt: Date;
  isRead: boolean;
  size: number; // Email size in bytes
}

interface IAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string; // For inline attachments
}
```

**Features:**

- Full-text search support
- Attachment metadata storage (no file content)
- Read/unread status tracking
- Efficient pagination support

**Instance Methods:**

- `markAsRead()`: Mark email as read
- `hasAttachments()`: Check if email has attachments
- `getAttachmentCount()`: Get number of attachments

**Static Methods:**

- `findByMailboxId(mailboxId, options)`: Get emails for mailbox with pagination
- `countByMailboxId(mailboxId, unreadOnly)`: Count emails for mailbox
- `deleteByMailboxId(mailboxId)`: Delete all emails for mailbox
- `searchMails(mailboxId, searchTerm, options)`: Full-text search

### Session Management (Redis)

```typescript
interface ISession {
  mailboxId: string;
  token: string;
  createdAt: Date;
  lastAccessAt: Date;
  userAgent: string;
  ipAddress: string;
}
```

**Features:**

- Redis-based session storage
- Automatic TTL (24 hours)
- Multiple sessions per mailbox support
- Session cleanup on mailbox deletion

**Methods:**

- `createSession(sessionData)`: Create new session
- `getSession(token)`: Retrieve session by token
- `updateLastAccess(token)`: Update session activity
- `deleteSession(token)`: Delete specific session
- `deleteMailboxSessions(mailboxId)`: Delete all sessions for mailbox
- `isValidSession(token)`: Check session validity

## Database Service

The `DatabaseService` class provides a unified interface for database operations:

```typescript
class DatabaseService {
  static async initialize(): Promise<void>;
  static async shutdown(): Promise<void>;
  static isReady(): boolean;
  static async getHealthStatus(): Promise<HealthStatus>;
  static async getMigrationStatus(): Promise<MigrationStatus>;
  static async runMigrations(): Promise<void>;
  static async rollbackLastMigration(): Promise<void>;
}
```

## Migration System

The migration system handles database schema changes and updates:

### Migration Structure

```typescript
interface Migration {
  version: string; // e.g., "001", "002"
  description: string; // Human-readable description
  up: () => Promise<void>; // Apply migration
  down: () => Promise<void>; // Rollback migration
}
```

### Current Migrations

1. **Migration 001**: Create initial indexes
   - Mailbox collection indexes
   - Mail collection indexes
   - Text search indexes

2. **Migration 002**: Add validation rules
   - Email address format validation
   - Extension count limits
   - Required field constraints

### Migration Commands

```bash
# Check migration status
curl http://localhost:3001/health/migrations

# Migrations run automatically on server start
# Manual migration control available through DatabaseService
```

## Indexes and Performance

### MongoDB Indexes

**Mailbox Collection:**

- `{ address: 1 }` - Unique index for email addresses
- `{ token: 1 }` - Unique index for access tokens
- `{ expiresAt: 1, isActive: 1 }` - Compound index for cleanup queries
- `{ token: 1, isActive: 1 }` - Compound index for token lookups
- `{ expiresAt: 1 }` - TTL index for automatic cleanup

**Mail Collection:**

- `{ mailboxId: 1 }` - Index for mailbox queries
- `{ mailboxId: 1, receivedAt: -1 }` - Compound index for sorted mail lists
- `{ mailboxId: 1, isRead: 1 }` - Compound index for read/unread queries
- Text index on `{ subject, textContent, from }` - Full-text search

### Redis Key Patterns

- `session:{token}` - Individual session data
- `mailbox_sessions:{mailboxId}` - Set of tokens for mailbox

## Testing

### Unit Tests

Run database configuration tests:

```bash
npm test -- --testPathPattern=database-config.test.ts
```

### Integration Tests

Test actual database connections (requires MongoDB and Redis running):

```bash
npm run test:db
```

### Test Coverage

The test suite covers:

- Model schema validation
- Instance and static methods
- Default values and constraints
- Business logic (expiration, extensions, etc.)
- Session management
- Database service initialization

## Health Monitoring

### Health Check Endpoint

```bash
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-08-01T00:00:00.000Z",
  "uptime": 3600,
  "database": {
    "mongodb": true,
    "redis": true,
    "overall": true
  }
}
```

### Migration Status Endpoint

```bash
GET /health/migrations
```

Response:

```json
{
  "applied": [
    {
      "version": "001",
      "description": "Create initial indexes",
      "appliedAt": "2025-08-01T00:00:00.000Z"
    }
  ],
  "pending": []
}
```

## Error Handling

### Connection Errors

- MongoDB connection failures result in process exit
- Redis connection failures result in process exit
- Automatic reconnection attempts with exponential backoff
- Comprehensive error logging

### Query Errors

- Validation errors are caught and logged
- Duplicate key errors are handled gracefully
- Connection timeouts trigger reconnection attempts

### Graceful Shutdown

The database service handles graceful shutdown:

1. Close active connections
2. Wait for pending operations
3. Clean up resources
4. Log shutdown completion

## Performance Considerations

### Connection Pooling

- MongoDB: 10 connection pool size
- Redis: Single connection with automatic reconnection

### Query Optimization

- Use compound indexes for common query patterns
- Implement pagination for large result sets
- Use projection to limit returned fields
- Leverage Redis for frequently accessed session data

### Memory Management

- TTL indexes for automatic cleanup
- Regular cleanup of expired sessions
- Efficient attachment metadata storage (no file content)

## Security

### Data Protection

- No sensitive data in logs
- Secure token generation
- Input validation and sanitization
- SQL injection prevention through Mongoose

### Access Control

- Token-based mailbox access
- Session validation
- IP address tracking
- User agent logging

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if MongoDB/Redis are running
2. **Migration Failures**: Check database permissions
3. **Memory Issues**: Monitor connection pool usage
4. **Performance**: Check index usage with explain()

### Debug Commands

```bash
# Check database connections
npm run test:db

# View migration status
curl http://localhost:3001/health/migrations

# Check overall health
curl http://localhost:3001/health
```

### Logging

Database operations are logged with appropriate levels:

- INFO: Successful connections and operations
- WARN: Connection issues and retries
- ERROR: Failed operations and critical errors

All logs include context information for debugging.
