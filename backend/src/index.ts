import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
// CSRF middleware removed for better compatibility
import { rateLimiters } from './middleware/rateLimiting';
import {
  securityMonitoringMiddleware,
  securityHeadersMiddleware,
  getSecurityStats,
} from './middleware/securityMonitoring';
import { performanceMiddleware } from './utils/performanceMonitor';
import { logger } from './utils/logger';
import { securityLogger } from './utils/securityLogger';
import { DatabaseService } from './services/database';
import { CleanupScheduler } from './services/cleanupScheduler';
import { BackupService } from './services/backupService';
import { DataCleanupService } from './services/dataCleanupService';
import { MonitoringService } from './services/monitoringService';
import { mailReceivingService } from './services/mailReceivingService';
import { mailHogForwardingService } from './services/mailHogForwardingService';
import { webSocketService } from './services/websocketService';
import { mailWebSocketIntegration } from './services/mailWebSocketIntegration';

// Load environment variables from root directory
// Only load if the file exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
} catch (error: any) {
  // If dotenv fails, continue with environment variables from Docker
  console.warn('Could not load .env file, using environment variables from Docker:', error.message);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware - more permissive for development
const helmetConfig =
  process.env.NODE_ENV === 'development'
    ? {
        contentSecurityPolicy: false, // Disable CSP in development
        crossOriginEmbedderPolicy: false,
        hsts: false, // Disable HSTS in development
      }
    : {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      };

app.use(helmet(helmetConfig));

// Additional security headers
app.use(securityHeadersMiddleware);

// Security monitoring middleware (before other middleware)
app.use(securityMonitoringMiddleware);

// Performance monitoring middleware
app.use(performanceMiddleware);

// CORS configuration from environment variables
const getCorsOptions = () => {
  // Parse allowed origins from environment
  const primaryOrigin =
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000';
  const additionalOrigins = process.env.CORS_ADDITIONAL_ORIGINS
    ? process.env.CORS_ADDITIONAL_ORIGINS.split(',').map((origin: string) =>
        origin.trim()
      )
    : [];

  const allowedOrigins = [primaryOrigin, ...additionalOrigins];

  // Parse other CORS settings
  const credentials = process.env.CORS_CREDENTIALS === 'true';
  const methods = process.env.CORS_METHODS
    ? process.env.CORS_METHODS.split(',').map((method: string) => method.trim())
    : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];
  const allowedHeaders = process.env.CORS_ALLOWED_HEADERS
    ? process.env.CORS_ALLOWED_HEADERS.split(',').map((header: string) => header.trim())
    : [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token',
      ];
  const exposedHeaders = process.env.CORS_EXPOSED_HEADERS
    ? process.env.CORS_EXPOSED_HEADERS.split(',').map((header: string) => header.trim())
    : ['X-CSRF-Token'];

  return {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, be more permissive with localhost
      if (process.env.NODE_ENV === 'development') {
        if (origin.includes('localhost') || origin.includes('0.0.0.0')) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS: Origin not allowed', { origin, allowedOrigins });
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials,
    methods,
    allowedHeaders,
    exposedHeaders,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  };
};

const corsOptions = getCorsOptions();

// Log CORS configuration in development
if (process.env.NODE_ENV === 'development') {
  logger.info('CORS configuration loaded', {
    primaryOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL,
    additionalOrigins: process.env.CORS_ADDITIONAL_ORIGINS,
    credentials: corsOptions.credentials,
    methods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
    exposedHeaders: corsOptions.exposedHeaders,
  });
}

app.use(cors(corsOptions));

// Rate limiting with enhanced security
app.use('/api', rateLimiters.general);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF protection removed for better compatibility

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

// CSRF token endpoint removed

// Security statistics endpoint (protected)
app.get('/api/security/stats', authMiddleware, (req, res) => {
  try {
    const stats = getSecurityStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get security stats:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get security statistics',
        code: 'SECURITY_STATS_ERROR',
      },
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await DatabaseService.getHealthStatus();
    const status = dbHealth.overall ? 'ok' : 'degraded';
    const statusCode = dbHealth.overall ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
    });
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        mongodb: false,
        redis: false,
        overall: false,
      },
    });
  }
});

// API Health check endpoint (for nginx proxy)
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await DatabaseService.getHealthStatus();
    const status = dbHealth.overall ? 'ok' : 'degraded';
    const statusCode = dbHealth.overall ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
    });
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        mongodb: false,
        redis: false,
        overall: false,
      },
    });
  }
});

// Database migration status endpoint
app.get('/health/migrations', async (req, res) => {
  try {
    const migrationStatus = await DatabaseService.getMigrationStatus();
    res.status(200).json(migrationStatus);
  } catch (error: any) {
    logger.error('Migration status check failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get migration status',
        code: 'MIGRATION_STATUS_ERROR',
      },
    });
  }
});

// Cleanup scheduler status endpoint
app.get('/health/cleanup', async (req, res) => {
  try {
    const schedulerStatus = CleanupScheduler.getStatus();
    res.status(200).json({
      scheduler: schedulerStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cleanup status check failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get cleanup status',
        code: 'CLEANUP_STATUS_ERROR',
      },
    });
  }
});

// Mail service status endpoint
app.get('/health/mail', async (req, res) => {
  try {
    const mailServiceStatus = await mailReceivingService.getStatus();
    const mailHogStatus = await mailHogForwardingService.getStatus();

    res.status(200).json({
      mailService: mailServiceStatus,
      mailHogForwarding: mailHogStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Mail service status check failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get mail service status',
        code: 'MAIL_SERVICE_STATUS_ERROR',
      },
    });
  }
});

// WebSocket service status endpoint
app.get('/health/websocket', async (req, res) => {
  try {
    const wsStats = await webSocketService.getStats();
    res.status(200).json({
      websocket: wsStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('WebSocket service status check failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get WebSocket service status',
        code: 'WEBSOCKET_STATUS_ERROR',
      },
    });
  }
});

// Mail-WebSocket integration status endpoint
app.get('/health/integration', async (req, res) => {
  try {
    const integrationStats = await mailWebSocketIntegration.getDetailedStats();
    const statusCode = integrationStats.isHealthy ? 200 : 503;

    res.status(statusCode).json({
      integration: integrationStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Integration status check failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get integration status',
        code: 'INTEGRATION_STATUS_ERROR',
      },
    });
  }
});

// Admin routes for backup, cleanup, and monitoring
app.get('/api/admin/backup/status', authMiddleware, async (req, res) => {
  try {
    const backupService = BackupService.getInstance();
    const status = backupService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get backup status:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get backup status',
        code: 'BACKUP_STATUS_ERROR',
      },
    });
  }
});

app.post('/api/admin/backup', authMiddleware, async (req, res) => {
  try {
    const backupService = BackupService.getInstance();
    const result = await backupService.performBackup();
    res.json(result);
  } catch (error) {
    logger.error('Manual backup failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Manual backup failed',
        code: 'BACKUP_FAILED',
      },
    });
  }
});

app.get('/api/admin/backups', authMiddleware, async (req, res) => {
  try {
    const backupService = BackupService.getInstance();
    const backups = await backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to list backups',
        code: 'BACKUP_LIST_ERROR',
      },
    });
  }
});

app.get('/api/admin/cleanup/status', authMiddleware, async (req, res) => {
  try {
    const cleanupService = DataCleanupService.getInstance();
    const status = cleanupService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get cleanup status:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get cleanup status',
        code: 'CLEANUP_STATUS_ERROR',
      },
    });
  }
});

app.post('/api/admin/cleanup/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = [
      'expiredMailboxes',
      'oldMails',
      'orphanedData',
      'redisCleanup',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid cleanup type',
          code: 'INVALID_CLEANUP_TYPE',
        },
      });
    }

    const cleanupService = DataCleanupService.getInstance();
    const result = await cleanupService.triggerCleanup(type as any);
    res.json(result);
  } catch (error) {
    logger.error('Manual cleanup failed:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Manual cleanup failed',
        code: 'CLEANUP_FAILED',
      },
    });
  }
});

app.get('/api/admin/cleanup/stats', authMiddleware, async (req, res) => {
  try {
    const cleanupService = DataCleanupService.getInstance();
    const stats = await cleanupService.getCleanupStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cleanup stats:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get cleanup stats',
        code: 'CLEANUP_STATS_ERROR',
      },
    });
  }
});

app.get('/api/admin/monitoring/status', authMiddleware, async (req, res) => {
  try {
    const monitoringService = MonitoringService.getInstance();
    const status = monitoringService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get monitoring status:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get monitoring status',
        code: 'MONITORING_STATUS_ERROR',
      },
    });
  }
});

app.get('/api/admin/monitoring/metrics', authMiddleware, async (req, res) => {
  try {
    const monitoringService = MonitoringService.getInstance();
    const metrics = monitoringService.getCurrentMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get monitoring metrics:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get monitoring metrics',
        code: 'MONITORING_METRICS_ERROR',
      },
    });
  }
});

app.get('/api/admin/monitoring/alerts', authMiddleware, async (req, res) => {
  try {
    const monitoringService = MonitoringService.getInstance();
    const alerts = monitoringService.getActiveAlerts();
    res.json({ alerts });
  } catch (error) {
    logger.error('Failed to get monitoring alerts:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get monitoring alerts',
        code: 'MONITORING_ALERTS_ERROR',
      },
    });
  }
});

app.get('/api/admin/monitoring/history', authMiddleware, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    const monitoringService = MonitoringService.getInstance();
    const history = monitoringService.getMetricsHistory(hours);
    res.json({ history });
  } catch (error) {
    logger.error('Failed to get monitoring history:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get monitoring history',
        code: 'MONITORING_HISTORY_ERROR',
      },
    });
  }
});

// API routes
import mailRoutes from './routes/mail';
import mailboxRoutes from './routes/mailbox';
import performanceRoutes from './routes/performance';
app.use('/api/mail', mailRoutes);
app.use('/api/mailbox', mailboxRoutes);
app.use('/api/performance', performanceRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      type: 'NOT_FOUND_ERROR',
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
    },
  });
});

/**
 * Setup integration between mail receiving service and WebSocket service
 * This function implements the core integration for real-time mail push notifications
 */
async function setupMailWebSocketIntegration(): Promise<void> {
  try {
    // Initialize the integration service
    await mailWebSocketIntegration.initialize(
      mailReceivingService,
      webSocketService
    );

    // Set up integration event listeners for monitoring
    mailWebSocketIntegration.on('broadcastSuccess', data => {
      logger.debug('Integration broadcast success event', {
        mailboxId: data.mailboxId,
        mailId: data.mail.id,
        processingTime: data.processingTime,
      });
    });

    mailWebSocketIntegration.on('broadcastFailure', data => {
      logger.warn('Integration broadcast failure event', {
        error: data.error.message,
        mailboxId: data.mailboxId,
        mailId: data.mail?.id,
        processingTime: data.processingTime,
      });
    });

    mailWebSocketIntegration.on('healthReport', stats => {
      // Health reports are already logged by the integration service
      // This event can be used for external monitoring systems
    });

    logger.info(
      'Mail receiving and WebSocket integration setup completed successfully',
      {
        integrationFeatures: [
          'Real-time mail push notifications',
          'Message formatting and validation',
          'Error handling and recovery',
          'Integration health monitoring',
          'Performance tracking',
        ],
      }
    );
  } catch (error: any) {
    logger.error('Failed to setup Mail-WebSocket integration:', error);
    throw new Error(`Mail-WebSocket integration setup failed: ${error.message}`);
  }
}

// Initialize and start server
async function startServer() {
  try {
    // Initialize database connections
    await DatabaseService.initialize();

    // Start cleanup scheduler (legacy - will be replaced by DataCleanupService)
    CleanupScheduler.start();

    // Start enhanced data cleanup service
    const dataCleanupService = DataCleanupService.getInstance();
    await dataCleanupService.start();

    // Start backup service
    const backupService = BackupService.getInstance();
    await backupService.start();

    // Start monitoring service
    const monitoringService = MonitoringService.getInstance();
    await monitoringService.start();

    // Start mail receiving service
    await mailReceivingService.start();

    // Initialize WebSocket service
    webSocketService.initialize(httpServer);

    // Connect mail receiving service with WebSocket service
    await setupMailWebSocketIntegration();

    // Start server only if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      const HOST = process.env.HOST || '0.0.0.0';
      const server = httpServer.listen(Number(PORT), HOST, () => {
        logger.info(`Server running on ${HOST}:${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('WebSocket server initialized');
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.info(`${signal} received, shutting down gracefully`);

        server.close(async () => {
          try {
            // Stop WebSocket service
            await webSocketService.shutdown();

            // Stop mail-WebSocket integration
            await mailWebSocketIntegration.shutdown();

            // Stop monitoring service
            const monitoringService = MonitoringService.getInstance();
            monitoringService.stop();

            // Stop backup service
            const backupService = BackupService.getInstance();
            backupService.stop();

            // Stop data cleanup service
            const dataCleanupService = DataCleanupService.getInstance();
            dataCleanupService.stop();

            // Stop legacy cleanup scheduler
            CleanupScheduler.stop();

            // Stop mail receiving service
            await mailReceivingService.stop();

            await DatabaseService.shutdown();
            logger.info('Process terminated');
            process.exit(0);
          } catch (error: any) {
            logger.error('Error during shutdown:', error);
            console.error('Shutdown failed:', error.message);
            process.exit(1);
          }
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
