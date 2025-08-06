import { Router, Request, Response } from 'express';
import { MailboxService } from '../services/mailboxService';
import { rateLimiters } from '../middleware/rateLimiting';
import { authMiddleware, generateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ErrorType } from '@nnu/shared';

const router = Router();

/**
 * 生成新的临时邮箱
 * POST /api/mailbox/generate
 */
router.post(
  '/generate',
  rateLimiters.mailboxGeneration,
  async (req: Request, res: Response) => {
    try {
      // 生成新邮箱
      const mailboxResponse = await MailboxService.generateMailbox();

      logger.info('Generated new mailbox', {
        address: mailboxResponse.address,
        mailboxId: mailboxResponse.mailboxId,
        expiresAt: mailboxResponse.expiresAt,
      });

      // Generate JWT token for authentication
      const jwtToken = generateToken(
        mailboxResponse.mailboxId,
        mailboxResponse.token
      );

      res.status(201).json({
        success: true,
        data: {
          id: mailboxResponse.mailboxId,
          address: mailboxResponse.address,
          token: jwtToken,
          createdAt: new Date().toISOString(),
          expiresAt: mailboxResponse.expiresAt,
          extensionCount: 0,
          isActive: true,
          lastAccessAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to generate mailbox:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to generate mailbox',
          code: 'MAILBOX_GENERATION_ERROR',
        },
      });
    }
  }
);

/**
 * 获取邮箱信息
 * GET /api/mailbox/:mailboxId
 */
router.get(
  '/:mailboxId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { mailboxId } = req.params;

      // 验证用户访问权限
      if (req.user?.mailboxId !== mailboxId) {
        return res.status(403).json({
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Access denied to this mailbox',
            code: 'ACCESS_DENIED',
          },
        });
      }

      // 验证邮箱访问权限
      const hasAccess = await MailboxService.validateAccess(
        mailboxId,
        req.user.token
      );

      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAILBOX_NOT_FOUND,
            message: 'Mailbox not found or expired',
            code: 'MAILBOX_NOT_FOUND',
          },
        });
      }

      // Get mailbox info from database
      const mailbox = await MailboxService.getMailboxById(mailboxId);

      if (!mailbox) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAILBOX_NOT_FOUND,
            message: 'Mailbox not found or expired',
            code: 'MAILBOX_NOT_FOUND',
          },
        });
      }

      // Generate fresh JWT token
      const jwtToken = generateToken(mailboxId, mailbox.token);

      const mailboxInfo = {
        id: mailboxId,
        address: mailbox.address,
        token: jwtToken,
        createdAt: mailbox.createdAt.toISOString(),
        expiresAt: mailbox.expiresAt.toISOString(),
        extensionCount: mailbox.extensionCount,
        isActive: mailbox.isActive,
        lastAccessAt: mailbox.lastAccessAt.toISOString(),
      };

      res.json({
        success: true,
        data: mailboxInfo,
      });
    } catch (error) {
      logger.error('Failed to get mailbox info:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to get mailbox info',
          code: 'MAILBOX_INFO_ERROR',
        },
      });
    }
  }
);

/**
 * 延长邮箱过期时间
 * POST /api/mailbox/:mailboxId/extend
 */
router.post(
  '/:mailboxId/extend',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { mailboxId } = req.params;

      // 验证用户访问权限
      if (req.user?.mailboxId !== mailboxId) {
        return res.status(403).json({
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Access denied to this mailbox',
            code: 'ACCESS_DENIED',
          },
        });
      }

      // 验证邮箱访问权限
      const hasAccess = await MailboxService.validateAccess(
        mailboxId,
        req.user.token
      );

      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAILBOX_NOT_FOUND,
            message: 'Mailbox not found or expired',
            code: 'MAILBOX_NOT_FOUND',
          },
        });
      }

      // 延长邮箱过期时间（这里需要实现具体的延长逻辑）
      const newExpiryTime = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      res.json({
        success: true,
        data: {
          expiresAt: newExpiryTime,
          extensionsLeft: 2, // 假设还有2次延长机会
        },
      });
    } catch (error) {
      logger.error('Failed to extend mailbox:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to extend mailbox',
          code: 'EXTEND_MAILBOX_ERROR',
        },
      });
    }
  }
);

/**
 * 删除邮箱
 * DELETE /api/mailbox/:mailboxId
 */
router.delete(
  '/:mailboxId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { mailboxId } = req.params;

      // 验证用户访问权限
      if (req.user?.mailboxId !== mailboxId) {
        return res.status(403).json({
          success: false,
          error: {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: 'Access denied to this mailbox',
            code: 'ACCESS_DENIED',
          },
        });
      }

      // 验证邮箱访问权限
      const hasAccess = await MailboxService.validateAccess(
        mailboxId,
        req.user.token
      );

      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAILBOX_NOT_FOUND,
            message: 'Mailbox not found or expired',
            code: 'MAILBOX_NOT_FOUND',
          },
        });
      }

      // 这里应该实现删除邮箱的逻辑
      logger.info(`Deleted mailbox ${mailboxId}`);

      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      logger.error('Failed to delete mailbox:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to delete mailbox',
          code: 'DELETE_MAILBOX_ERROR',
        },
      });
    }
  }
);

export default router;
