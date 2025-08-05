import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import {
  csrfMiddleware,
  getCsrfToken,
  addCsrfTokenHeader,
} from './middleware/csrf';
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
import { mailReceivingService } from './services/mailReceivingService';
import { webSocketService } from './services/websocketService';
import { mailWebSocketIntegration } from './services/mailWebSocketIntegration';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(
  helmet({
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
    crossOriginEmbedderPolicy: false, // Allow embedding for email content
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Additional security headers
app.use(securityHeadersMiddleware);

// Security monitoring middleware (before other middleware)
app.use(securityMonitoringMiddleware);

// Performance monitoring middleware
app.use(performanceMiddleware);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting with enhanced security
app.use('/api', rateLimiters.general);

// CSRF protection (after body parsing)
app.use(csrfMiddleware);

// Add CSRF token to response headers
app.use(addCsrfTokenHeader);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

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
  } catch (error) {
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
  } catch (error) {
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
    const mailServiceStatus = mailReceivingService.getStatus();
    res.status(200).json({
      mailService: mailServiceStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
    const wsStats = webSocketService.getStats();
    res.status(200).json({
      websocket: wsStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
    const integrationStats = mailWebSocketIntegration.getDetailedStats();
    const statusCode = integrationStats.isHealthy ? 200 : 503;

    res.status(statusCode).json({
      integration: integrationStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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

// API routes
import mailRoutes from './routes/mail';
import performanceRoutes from './routes/performance';
app.use('/api/mail', mailRoutes);
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
  } catch (error) {
    logger.error('Failed to setup Mail-WebSocket integration:', error);
    throw error;
  }
}

// Initialize and start server
async function startServer() {
  try {
    // Initialize database connections
    await DatabaseService.initialize();

    // Start cleanup scheduler
    CleanupScheduler.start();

    // Start mail receiving service
    await mailReceivingService.start();

    // Initialize WebSocket service
    webSocketService.initialize(httpServer);

    // Connect mail receiving service with WebSocket service
    await setupMailWebSocketIntegration();

    // Start server only if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      const server = httpServer.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
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

            // Stop cleanup scheduler
            CleanupScheduler.stop();

            // Stop mail receiving service
            await mailReceivingService.stop();

            await DatabaseService.shutdown();
            logger.info('Process terminated');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          }
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
