import { getRedisClient } from '../config/database';
import { logger } from '../utils/logger';

export interface ISession {
  mailboxId: string;
  token: string;
  createdAt: Date;
  lastAccessAt: Date;
  userAgent: string;
  ipAddress: string;
}

export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly MAILBOX_SESSIONS_PREFIX = 'mailbox_sessions:';
  private static readonly SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Create a new session
   */
  static async createSession(sessionData: ISession): Promise<void> {
    try {
      const redis = getRedisClient();
      const sessionKey = this.getSessionKey(sessionData.token);
      const mailboxSessionsKey = this.getMailboxSessionsKey(
        sessionData.mailboxId
      );

      // Store session data
      await redis.hSet(sessionKey, {
        mailboxId: sessionData.mailboxId,
        token: sessionData.token,
        createdAt: sessionData.createdAt.toISOString(),
        lastAccessAt: sessionData.lastAccessAt.toISOString(),
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress,
      });

      // Set TTL for session
      await redis.expire(sessionKey, this.SESSION_TTL);

      // Add token to mailbox sessions set
      await redis.sAdd(mailboxSessionsKey, sessionData.token);
      await redis.expire(mailboxSessionsKey, this.SESSION_TTL);

      logger.info(`Session created for mailbox ${sessionData.mailboxId}`);
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session by token
   */
  static async getSession(token: string): Promise<ISession | null> {
    try {
      const redis = getRedisClient();
      const sessionKey = this.getSessionKey(token);

      const sessionData = await redis.hGetAll(sessionKey);

      if (!sessionData || Object.keys(sessionData).length === 0) {
        return null;
      }

      return {
        mailboxId: sessionData.mailboxId,
        token: sessionData.token,
        createdAt: new Date(sessionData.createdAt),
        lastAccessAt: new Date(sessionData.lastAccessAt),
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress,
      };
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session last access time
   */
  static async updateLastAccess(token: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const sessionKey = this.getSessionKey(token);

      await redis.hSet(sessionKey, 'lastAccessAt', new Date().toISOString());
      await redis.expire(sessionKey, this.SESSION_TTL);
    } catch (error) {
      logger.error('Failed to update session last access:', error);
    }
  }

  /**
   * Delete session
   */
  static async deleteSession(token: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const sessionKey = this.getSessionKey(token);

      // Get session data to find mailbox ID
      const sessionData = await this.getSession(token);
      if (sessionData) {
        const mailboxSessionsKey = this.getMailboxSessionsKey(
          sessionData.mailboxId
        );
        await redis.sRem(mailboxSessionsKey, token);
      }

      await redis.del(sessionKey);
      logger.info(`Session deleted for token ${token}`);
    } catch (error) {
      logger.error('Failed to delete session:', error);
    }
  }

  /**
   * Delete all sessions for a mailbox
   */
  static async deleteMailboxSessions(mailboxId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const mailboxSessionsKey = this.getMailboxSessionsKey(mailboxId);

      // Get all tokens for this mailbox
      const tokens = await redis.sMembers(mailboxSessionsKey);

      // Delete each session
      const deletePromises = tokens.map(token => {
        const sessionKey = this.getSessionKey(token);
        return redis.del(sessionKey);
      });

      await Promise.all(deletePromises);

      // Delete the mailbox sessions set
      await redis.del(mailboxSessionsKey);

      logger.info(`All sessions deleted for mailbox ${mailboxId}`);
    } catch (error) {
      logger.error('Failed to delete mailbox sessions:', error);
    }
  }

  /**
   * Get all active sessions for a mailbox
   */
  static async getMailboxSessions(mailboxId: string): Promise<ISession[]> {
    try {
      const redis = getRedisClient();
      const mailboxSessionsKey = this.getMailboxSessionsKey(mailboxId);

      const tokens = await redis.sMembers(mailboxSessionsKey);

      const sessionPromises = tokens.map(token => this.getSession(token));
      const sessions = await Promise.all(sessionPromises);

      // Filter out null sessions (expired or invalid)
      return sessions.filter(
        (session): session is ISession => session !== null
      );
    } catch (error) {
      logger.error('Failed to get mailbox sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const redis = getRedisClient();

      // Redis TTL will automatically handle session cleanup
      // This method can be used for additional cleanup logic if needed
      logger.info('Session cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Check if session exists and is valid
   */
  static async isValidSession(token: string): Promise<boolean> {
    const session = await this.getSession(token);
    return session !== null;
  }

  private static getSessionKey(token: string): string {
    return `${this.SESSION_PREFIX}${token}`;
  }

  private static getMailboxSessionsKey(mailboxId: string): string {
    return `${this.MAILBOX_SESSIONS_PREFIX}${mailboxId}`;
  }
}
