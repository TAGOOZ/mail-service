import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// Security event types
export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  AUTHORIZATION_FAILURE = 'AUTHORIZATION_FAILURE',
  CSRF_ATTACK = 'CSRF_ATTACK',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_REUSE = 'TOKEN_REUSE',
  UNUSUAL_USER_AGENT = 'UNUSUAL_USER_AGENT',
  GEOLOCATION_ANOMALY = 'GEOLOCATION_ANOMALY',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  timestamp: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  mailboxId?: string;
  sessionId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  headers?: Record<string, any>;
  payload?: any;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  additionalContext?: Record<string, any>;
}

class SecurityLogger {
  private securityLogFile: string;
  private alertThresholds: Map<SecurityEventType, number>;
  private eventCounts: Map<string, number>;
  private lastReset: Date;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    this.securityLogFile = path.join(logDir, 'security.log');
    this.alertThresholds = new Map();
    this.eventCounts = new Map();
    this.lastReset = new Date();

    // Initialize alert thresholds
    this.initializeAlertThresholds();

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Reset counters daily
    this.scheduleCounterReset();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.securityLogFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private initializeAlertThresholds(): void {
    // Set thresholds for different event types (events per hour)
    this.alertThresholds.set(SecurityEventType.AUTHENTICATION_FAILURE, 10);
    this.alertThresholds.set(SecurityEventType.CSRF_ATTACK, 5);
    this.alertThresholds.set(SecurityEventType.XSS_ATTEMPT, 3);
    this.alertThresholds.set(SecurityEventType.RATE_LIMIT_EXCEEDED, 20);
    this.alertThresholds.set(SecurityEventType.BRUTE_FORCE_ATTEMPT, 5);
    this.alertThresholds.set(SecurityEventType.SUSPICIOUS_REQUEST, 15);
    this.alertThresholds.set(SecurityEventType.SQL_INJECTION_ATTEMPT, 1);
    this.alertThresholds.set(SecurityEventType.PATH_TRAVERSAL_ATTEMPT, 1);
  }

  private scheduleCounterReset(): void {
    // Reset counters every hour
    setInterval(
      () => {
        this.eventCounts.clear();
        this.lastReset = new Date();
      },
      60 * 60 * 1000
    );
  }

  private incrementEventCount(eventType: SecurityEventType, ip: string): void {
    const key = `${eventType}:${ip}`;
    const currentCount = this.eventCounts.get(key) || 0;
    this.eventCounts.set(key, currentCount + 1);

    // Check if threshold is exceeded
    const threshold = this.alertThresholds.get(eventType);
    if (threshold && currentCount + 1 >= threshold) {
      this.logAlert(eventType, ip, currentCount + 1, threshold);
    }
  }

  private logAlert(
    eventType: SecurityEventType,
    ip: string,
    count: number,
    threshold: number
  ): void {
    const alertEvent: SecurityEvent = {
      type: SecurityEventType.SUSPICIOUS_REQUEST,
      severity: SecuritySeverity.HIGH,
      message: `Security alert: ${eventType} threshold exceeded`,
      timestamp: new Date().toISOString(),
      ip,
      additionalContext: {
        eventType,
        count,
        threshold,
        timeWindow: '1 hour',
        alertTriggered: true,
      },
    };

    this.writeSecurityLog(alertEvent);
    logger.error('SECURITY ALERT', alertEvent);
  }

  private writeSecurityLog(event: SecurityEvent): void {
    const logEntry = JSON.stringify(event) + '\n';

    try {
      fs.appendFileSync(this.securityLogFile, logEntry);
    } catch (error) {
      logger.error('Failed to write security log', error);
    }
  }

  public logSecurityEvent(event: Partial<SecurityEvent>): void {
    const fullEvent: SecurityEvent = {
      type: event.type || SecurityEventType.SUSPICIOUS_REQUEST,
      severity: event.severity || SecuritySeverity.MEDIUM,
      message: event.message || 'Security event detected',
      timestamp: new Date().toISOString(),
      ip: event.ip || 'unknown',
      userAgent: event.userAgent,
      userId: event.userId,
      mailboxId: event.mailboxId,
      sessionId: event.sessionId,
      requestId: event.requestId,
      method: event.method,
      path: event.path,
      headers: event.headers,
      payload: event.payload,
      geolocation: event.geolocation,
      additionalContext: event.additionalContext,
    };

    // Write to security log
    this.writeSecurityLog(fullEvent);

    // Log to main logger based on severity
    switch (fullEvent.severity) {
      case SecuritySeverity.CRITICAL:
      case SecuritySeverity.HIGH:
        logger.error(`SECURITY: ${fullEvent.message}`, fullEvent);
        break;
      case SecuritySeverity.MEDIUM:
        logger.warn(`SECURITY: ${fullEvent.message}`, fullEvent);
        break;
      case SecuritySeverity.LOW:
        logger.info(`SECURITY: ${fullEvent.message}`, fullEvent);
        break;
    }

    // Increment event count for alerting
    this.incrementEventCount(fullEvent.type, fullEvent.ip);
  }

  // Convenience methods for common security events
  public logAuthenticationFailure(ip: string, context: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.AUTHENTICATION_FAILURE,
      severity: SecuritySeverity.MEDIUM,
      message: 'Authentication attempt failed',
      ip,
      additionalContext: context,
    });
  }

  public logCSRFAttack(ip: string, context: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.CSRF_ATTACK,
      severity: SecuritySeverity.HIGH,
      message: 'CSRF attack detected',
      ip,
      additionalContext: context,
    });
  }

  public logXSSAttempt(ip: string, context: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.XSS_ATTEMPT,
      severity: SecuritySeverity.HIGH,
      message: 'XSS attempt detected',
      ip,
      additionalContext: context,
    });
  }

  public logRateLimitExceeded(ip: string, context: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.MEDIUM,
      message: 'Rate limit exceeded',
      ip,
      additionalContext: context,
    });
  }

  public logSuspiciousRequest(ip: string, context: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_REQUEST,
      severity: SecuritySeverity.MEDIUM,
      message: 'Suspicious request detected',
      ip,
      additionalContext: context,
    });
  }

  public logBruteForceAttempt(ip: string, context: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      severity: SecuritySeverity.HIGH,
      message: 'Brute force attempt detected',
      ip,
      additionalContext: context,
    });
  }

  // Get security statistics
  public getSecurityStats(): any {
    const stats = {
      totalEvents: 0,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      topIPs: {} as Record<string, number>,
      lastReset: this.lastReset.toISOString(),
    };

    // Count events by type and IP
    for (const [key, count] of this.eventCounts.entries()) {
      const [eventType, ip] = key.split(':');
      stats.totalEvents += count;
      stats.eventsByType[eventType] =
        (stats.eventsByType[eventType] || 0) + count;
      stats.topIPs[ip] = (stats.topIPs[ip] || 0) + count;
    }

    return stats;
  }

  // Rotate security logs
  public rotateSecurityLog(): void {
    try {
      const stats = fs.statSync(this.securityLogFile);
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFile = path.join(
          path.dirname(this.securityLogFile),
          `security-${timestamp}.log`
        );

        fs.renameSync(this.securityLogFile, archiveFile);
        logger.info('Security log file rotated', { archiveFile });
      }
    } catch (error) {
      logger.error('Failed to rotate security log file', error);
    }
  }
}

// Create singleton security logger instance
export const securityLogger = new SecurityLogger();

// Rotate security logs daily
if (process.env.NODE_ENV !== 'test') {
  setInterval(
    () => {
      securityLogger.rotateSecurityLog();
    },
    24 * 60 * 60 * 1000
  ); // 24 hours
}
