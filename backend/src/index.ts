import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database';

// Load environment variables
dotenv.config();

const app = express();
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
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      type: 'RATE_LIMIT_ERROR',
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

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

// API routes will be added here
// app.use('/api/mailbox', mailboxRoutes);
// app.use('/api/mail', mailRoutes);

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

// Initialize and start server
async function startServer() {
  try {
    // Initialize database connections
    await DatabaseService.initialize();

    // Start server only if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.info(`${signal} received, shutting down gracefully`);

        server.close(async () => {
          try {
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
