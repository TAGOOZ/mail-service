import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { MailboxService } from '../services/mailboxService';
import { Mail } from '../models/Mail';
import { logger } from '../utils/logger';
import { createCacheMiddleware } from '../utils/apiOptimizer';
import { ErrorType } from '@nnu/shared';

const router = Router();

/**
 * 获取邮件列表 - 支持分页
 * GET /api/mail/:mailboxId
 */
router.get(
  '/:mailboxId',
  authMiddleware,
  createCacheMiddleware({ ttl: 30, maxSize: 100 }),
  async (req: Request, res: Response) => {
    try {
      const { mailboxId } = req.params;
      const { page = 1, limit = 20 } = req.query;

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

      // 获取邮件列表
      const mails = await Mail.findByMailboxId(mailboxId, {
        page: Number(page),
        limit: Number(limit),
      });

      // 获取总数
      const total = await Mail.countByMailboxId(mailboxId);

      // 计算分页信息
      const hasMore = Number(page) * Number(limit) < total;

      const response = {
        mails: mails.map(mail => ({
          id: mail.id,
          mailboxId: mail.mailboxId,
          from: mail.from,
          to: mail.to,
          subject: mail.subject,
          textContent: mail.textContent,
          htmlContent: mail.htmlContent,
          attachments: mail.attachments,
          receivedAt: mail.receivedAt,
          isRead: mail.isRead,
          size: mail.size,
        })),
        total,
        hasMore,
      };

      logger.info(`Retrieved ${mails.length} mails for mailbox ${mailboxId}`, {
        mailboxId,
        page,
        limit,
        total,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to get mails:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to retrieve mails',
          code: 'GET_MAILS_ERROR',
        },
      });
    }
  }
);

/**
 * 获取邮件详情
 * GET /api/mail/:mailboxId/:mailId
 */
router.get(
  '/:mailboxId/:mailId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { mailboxId, mailId } = req.params;

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

      // 获取邮件详情
      const mail = await Mail.findOne({ _id: mailId, mailboxId });

      if (!mail) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAIL_NOT_FOUND,
            message: 'Mail not found',
            code: 'MAIL_NOT_FOUND',
          },
        });
      }

      // 自动标记为已读
      if (!mail.isRead) {
        mail.markAsRead();
        await mail.save();
      }

      const response = {
        id: mail.id,
        mailboxId: mail.mailboxId,
        from: mail.from,
        to: mail.to,
        subject: mail.subject,
        textContent: mail.textContent,
        htmlContent: mail.htmlContent,
        attachments: mail.attachments,
        receivedAt: mail.receivedAt,
        isRead: mail.isRead,
        size: mail.size,
      };

      logger.info(`Retrieved mail details for ${mailId}`, {
        mailboxId,
        mailId,
        from: mail.from,
        subject: mail.subject,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to get mail details:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to retrieve mail details',
          code: 'GET_MAIL_ERROR',
        },
      });
    }
  }
);

/**
 * 删除单个邮件
 * DELETE /api/mail/:mailboxId/:mailId
 */
router.delete(
  '/:mailboxId/:mailId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { mailboxId, mailId } = req.params;

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

      // 先查找邮件以获取信息用于日志
      const mailToDelete = await Mail.findOne({ _id: mailId, mailboxId });

      if (!mailToDelete) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAIL_NOT_FOUND,
            message: 'Mail not found',
            code: 'MAIL_NOT_FOUND',
          },
        });
      }

      // 删除邮件
      await Mail.findOneAndDelete({ _id: mailId, mailboxId });

      logger.info(`Deleted mail ${mailId} from mailbox ${mailboxId}`, {
        mailboxId,
        mailId,
        from: mailToDelete.from,
        subject: mailToDelete.subject,
      });

      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      logger.error('Failed to delete mail:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to delete mail',
          code: 'DELETE_MAIL_ERROR',
        },
      });
    }
  }
);

/**
 * 清空邮箱（批量删除所有邮件）
 * DELETE /api/mail/:mailboxId
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

      // 删除所有邮件
      const result = await Mail.deleteMany({ mailboxId });

      logger.info(`Cleared mailbox ${mailboxId}`, {
        mailboxId,
        deletedCount: result.deletedCount,
      });

      res.json({
        success: true,
        data: {
          deletedCount: result.deletedCount || 0,
          message: `Successfully deleted ${result.deletedCount || 0} mails`,
        },
      });
    } catch (error) {
      logger.error('Failed to clear mailbox:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to clear mailbox',
          code: 'CLEAR_MAILBOX_ERROR',
        },
      });
    }
  }
);

/**
 * 标记邮件为已读/未读
 * PATCH /api/mail/:mailboxId/:mailId/read
 */
router.patch(
  '/:mailboxId/:mailId/read',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { mailboxId, mailId } = req.params;
      const { isRead } = req.body;

      // 验证请求体
      if (typeof isRead !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'isRead must be a boolean value',
            code: 'INVALID_READ_STATUS',
          },
        });
      }

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

      // 更新邮件已读状态
      const mail = await Mail.findOne({ _id: mailId, mailboxId });

      if (!mail) {
        return res.status(404).json({
          success: false,
          error: {
            type: ErrorType.MAIL_NOT_FOUND,
            message: 'Mail not found',
            code: 'MAIL_NOT_FOUND',
          },
        });
      }

      mail.isRead = isRead;
      await mail.save();

      logger.info(`Updated read status for mail ${mailId}`, {
        mailboxId,
        mailId,
        isRead,
        from: mail.from,
        subject: mail.subject,
      });

      res.json({
        success: true,
        data: {
          id: mail.id,
          isRead: mail.isRead,
          message: `Mail marked as ${isRead ? 'read' : 'unread'}`,
        },
      });
    } catch (error) {
      logger.error('Failed to update mail read status:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to update mail read status',
          code: 'UPDATE_READ_STATUS_ERROR',
        },
      });
    }
  }
);

/**
 * 批量标记邮件为已读
 * PATCH /api/mail/:mailboxId/mark-all-read
 */
router.patch(
  '/:mailboxId/mark-all-read',
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

      // 批量更新所有未读邮件为已读
      const result = await Mail.updateMany(
        { mailboxId, isRead: false },
        { isRead: true }
      );

      logger.info(`Marked all mails as read for mailbox ${mailboxId}`, {
        mailboxId,
        updatedCount: result.modifiedCount,
      });

      res.json({
        success: true,
        data: {
          updatedCount: result.modifiedCount,
          message: `Marked ${result.modifiedCount} mails as read`,
        },
      });
    } catch (error) {
      logger.error('Failed to mark all mails as read:', error);
      res.status(500).json({
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to mark all mails as read',
          code: 'MARK_ALL_READ_ERROR',
        },
      });
    }
  }
);

export default router;
