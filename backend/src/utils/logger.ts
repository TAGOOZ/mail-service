import fs from 'fs';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  context?: any;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');

    // Create logs directory if it doesn't exist
    this.ensureLogDirectory();
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(
    level: string,
    message: string,
    context?: any
  ): LogEntry {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
    };

    if (context) {
      entry.context = context;
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    const logString = JSON.stringify(entry) + '\n';

    // Write to console in development
    if (process.env.NODE_ENV !== 'production') {
      const colorCode = this.getColorCode(entry.level);
      const resetCode = '\x1b[0m';
      console.log(
        `${colorCode}[${entry.timestamp}] ${entry.level}: ${entry.message}${resetCode}`
      );

      if (entry.context) {
        console.log(`${colorCode}Context:${resetCode}`, entry.context);
      }

      if (entry.stack) {
        console.log(`${colorCode}Stack:${resetCode}`, entry.stack);
      }
    }

    // Write to file
    try {
      fs.appendFileSync(this.logFile, logString);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private getColorCode(level: string): string {
    switch (level) {
      case 'ERROR':
        return '\x1b[31m'; // Red
      case 'WARN':
        return '\x1b[33m'; // Yellow
      case 'INFO':
        return '\x1b[36m'; // Cyan
      case 'DEBUG':
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m'; // Reset
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  public error(message: string, context?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.formatMessage('ERROR', message, context);

    // Add stack trace for errors
    if (context instanceof Error) {
      entry.stack = context.stack;
    } else if (context && context.stack) {
      entry.stack = context.stack;
    }

    this.writeLog(entry);
  }

  public warn(message: string, context?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.formatMessage('WARN', message, context);
    this.writeLog(entry);
  }

  public info(message: string, context?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.formatMessage('INFO', message, context);
    this.writeLog(entry);
  }

  public debug(message: string, context?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatMessage('DEBUG', message, context);
    this.writeLog(entry);
  }

  // HTTP request logging
  public http(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: any
  ): void {
    const message = `${method} ${url} ${statusCode} - ${responseTime}ms`;
    this.info(message, context);
  }

  // Security event logging
  public security(event: string, context?: any): void {
    const message = `SECURITY: ${event}`;
    this.warn(message, context);
  }

  // Performance logging
  public performance(operation: string, duration: number, context?: any): void {
    const message = `PERFORMANCE: ${operation} took ${duration}ms`;

    if (duration > 1000) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  // Database operation logging
  public database(
    operation: string,
    collection: string,
    duration?: number,
    context?: any
  ): void {
    const message = `DB: ${operation} on ${collection}${duration ? ` (${duration}ms)` : ''}`;
    this.debug(message, context);
  }

  // Log rotation (simple implementation)
  public rotateLog(): void {
    try {
      const stats = fs.statSync(this.logFile);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFile = path.join(this.logDir, `app-${timestamp}.log`);

        fs.renameSync(this.logFile, archiveFile);
        this.info('Log file rotated', { archiveFile });
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Rotate logs daily
setInterval(
  () => {
    logger.rotateLog();
  },
  24 * 60 * 60 * 1000
); // 24 hours

// Export logger types for use in other modules
export type { LogEntry };
