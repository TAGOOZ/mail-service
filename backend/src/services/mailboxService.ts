import { Mailbox, IMailbox } from '../models/Mailbox';
import { Mail } from '../models/Mail';
import {
  generateMailboxAddress,
  calculateExpiryTime,
  generateSecureToken,
  CreateMailboxResponse,
  MailboxInfoResponse,
  ExtendMailboxResponse,
} from '@nnu/shared';
import { logger } from '../utils/logger';

export class MailboxService {
  /**
   * 生成新的临时邮箱
   * @returns 邮箱创建响应
   */
  static async generateMailbox(): Promise<CreateMailboxResponse> {
    try {
      // 生成随机邮箱地址
      let address: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      // 确保生成的邮箱地址是唯一的
      do {
        address = generateMailboxAddress();
        const existingMailbox = await Mailbox.findOne({ address });
        isUnique = !existingMailbox;
        attempts++;
      } while (!isUnique && attempts < maxAttempts);

      if (!isUnique) {
        throw new Error(
          'Failed to generate unique mailbox address after multiple attempts'
        );
      }

      // 生成访问令牌
      const token = generateSecureToken(32);

      // 计算过期时间（24小时后）
      const expiresAt = calculateExpiryTime(new Date(), 24);

      // 创建邮箱记录
      const mailbox = new Mailbox({
        address,
        token,
        expiresAt,
        extensionCount: 0,
        isActive: true,
        lastAccessAt: new Date(),
      });

      await mailbox.save();

      logger.info(`Generated new mailbox: ${address}`, {
        mailboxId: mailbox.id,
        address,
        expiresAt,
      });

      return {
        mailboxId: mailbox.id,
        address: mailbox.address,
        token: mailbox.token,
        expiresAt: mailbox.expiresAt,
      };
    } catch (error) {
      logger.error('Failed to generate mailbox:', error);
      throw error;
    }
  }

  /**
   * 根据令牌获取邮箱信息
   * @param token 访问令牌
   * @returns 邮箱信息
   */
  static async getMailboxByToken(token: string): Promise<IMailbox | null> {
    try {
      const mailbox = await Mailbox.findByToken(token);

      if (mailbox) {
        // 更新最后访问时间
        mailbox.lastAccessAt = new Date();
        await mailbox.save();
      }

      return mailbox;
    } catch (error) {
      logger.error('Failed to get mailbox by token:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱ID获取邮箱信息
   * @param mailboxId 邮箱ID
   * @returns 邮箱信息
   */
  static async getMailboxById(mailboxId: string): Promise<IMailbox | null> {
    try {
      const mailbox = await Mailbox.findById(mailboxId);

      if (mailbox && mailbox.isActive) {
        // 更新最后访问时间
        mailbox.lastAccessAt = new Date();
        await mailbox.save();
      }

      return mailbox;
    } catch (error) {
      logger.error('Failed to get mailbox by ID:', error);
      throw error;
    }
  }

  /**
   * 获取邮箱详细信息（包含邮件数量）
   * @param mailboxId 邮箱ID
   * @returns 邮箱信息响应
   */
  static async getMailboxInfo(
    mailboxId: string
  ): Promise<MailboxInfoResponse | null> {
    try {
      const mailbox = await Mailbox.findById(mailboxId);

      if (!mailbox || !mailbox.isActive) {
        return null;
      }

      // 检查邮箱是否过期
      if (mailbox.isExpired()) {
        await this.deactivateMailbox(mailboxId);
        return null;
      }

      // 获取邮件数量
      const mailCount = await Mail.countDocuments({ mailboxId });

      // 更新最后访问时间
      mailbox.lastAccessAt = new Date();
      await mailbox.save();

      return {
        address: mailbox.address,
        expiresAt: mailbox.expiresAt,
        mailCount,
        extensionCount: mailbox.extensionCount,
        maxExtensions: 2,
      };
    } catch (error) {
      logger.error('Failed to get mailbox info:', error);
      throw error;
    }
  }

  /**
   * 延长邮箱有效期
   * @param mailboxId 邮箱ID
   * @returns 延期响应
   */
  static async extendMailbox(
    mailboxId: string
  ): Promise<ExtendMailboxResponse | null> {
    try {
      const mailbox = await Mailbox.findById(mailboxId);

      if (!mailbox || !mailbox.isActive) {
        throw new Error('Mailbox not found or inactive');
      }

      // 检查是否可以延期
      if (!mailbox.canExtend()) {
        throw new Error('Maximum extensions reached');
      }

      // 检查邮箱是否已过期
      if (mailbox.isExpired()) {
        throw new Error('Cannot extend expired mailbox');
      }

      // 延长有效期
      mailbox.extend();
      mailbox.lastAccessAt = new Date();
      await mailbox.save();

      logger.info(`Extended mailbox: ${mailbox.address}`, {
        mailboxId: mailbox.id,
        newExpiresAt: mailbox.expiresAt,
        extensionCount: mailbox.extensionCount,
      });

      return {
        expiresAt: mailbox.expiresAt,
        extensionsLeft: 2 - mailbox.extensionCount,
      };
    } catch (error) {
      logger.error('Failed to extend mailbox:', error);
      throw error;
    }
  }

  /**
   * 停用邮箱
   * @param mailboxId 邮箱ID
   * @returns 是否成功停用
   */
  static async deactivateMailbox(mailboxId: string): Promise<boolean> {
    try {
      const mailbox = await Mailbox.findById(mailboxId);

      if (!mailbox) {
        return false;
      }

      mailbox.isActive = false;
      await mailbox.save();

      logger.info(`Deactivated mailbox: ${mailbox.address}`, {
        mailboxId: mailbox.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to deactivate mailbox:', error);
      throw error;
    }
  }

  /**
   * 删除邮箱及其所有邮件
   * @param mailboxId 邮箱ID
   * @returns 是否成功删除
   */
  static async deleteMailbox(mailboxId: string): Promise<boolean> {
    try {
      const mailbox = await Mailbox.findById(mailboxId);

      if (!mailbox) {
        return false;
      }

      // 删除所有相关邮件
      await Mail.deleteMany({ mailboxId });

      // 删除邮箱
      await Mailbox.findByIdAndDelete(mailboxId);

      logger.info(`Deleted mailbox: ${mailbox.address}`, {
        mailboxId: mailbox.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete mailbox:', error);
      throw error;
    }
  }

  /**
   * 清理过期邮箱
   * @returns 清理的邮箱数量
   */
  static async cleanupExpiredMailboxes(): Promise<number> {
    try {
      const expiredMailboxes = await Mailbox.findExpiredMailboxes();
      let cleanedCount = 0;

      for (const mailbox of expiredMailboxes) {
        // 删除邮箱的所有邮件
        await Mail.deleteMany({ mailboxId: mailbox.id });

        // 删除邮箱
        await Mailbox.findByIdAndDelete(mailbox.id);

        cleanedCount++;

        logger.info(`Cleaned up expired mailbox: ${mailbox.address}`, {
          mailboxId: mailbox.id,
          expiredAt: mailbox.expiresAt,
        });
      }

      if (cleanedCount > 0) {
        logger.info(
          `Cleanup completed: ${cleanedCount} expired mailboxes removed`
        );
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired mailboxes:', error);
      throw error;
    }
  }

  /**
   * 获取活跃邮箱统计信息
   * @returns 统计信息
   */
  static async getMailboxStats(): Promise<{
    totalActive: number;
    expiringIn1Hour: number;
    totalMails: number;
  }> {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const [totalActive, expiringIn1Hour, totalMails] = await Promise.all([
        Mailbox.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
        Mailbox.countDocuments({
          isActive: true,
          expiresAt: { $gt: now, $lt: oneHourLater },
        }),
        Mail.countDocuments(),
      ]);

      return {
        totalActive,
        expiringIn1Hour,
        totalMails,
      };
    } catch (error) {
      logger.error('Failed to get mailbox stats:', error);
      throw error;
    }
  }

  /**
   * 验证邮箱访问权限
   * @param mailboxId 邮箱ID
   * @param token 访问令牌
   * @returns 是否有访问权限
   */
  static async validateAccess(
    mailboxId: string,
    token: string
  ): Promise<boolean> {
    try {
      const mailbox = await Mailbox.findById(mailboxId);

      if (!mailbox || !mailbox.isActive) {
        return false;
      }

      // 验证令牌
      if (mailbox.token !== token) {
        return false;
      }

      // 检查是否过期
      if (mailbox.isExpired()) {
        await this.deactivateMailbox(mailboxId);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate access:', error);
      return false;
    }
  }
}
