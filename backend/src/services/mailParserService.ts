import {
  simpleParser,
  ParsedMail,
  Attachment as NodemailerAttachment,
} from 'mailparser';
import { IAttachment } from '../models/Mail';
import { logger } from '../utils/logger';

export interface ParsedMailData {
  from: string;
  to: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachments: IAttachment[];
  size: number;
}

export class MailParserService {
  /**
   * 解析原始邮件数据
   * @param rawMail 原始邮件数据 (Buffer 或 string)
   * @returns 解析后的邮件数据
   */
  static async parseRawMail(rawMail: Buffer | string): Promise<ParsedMailData> {
    try {
      const parsed: ParsedMail = await simpleParser(rawMail);

      // 提取基本信息
      const from = this.extractEmailAddress(parsed.from);
      const to = this.extractEmailAddress(parsed.to);
      const subject = parsed.subject || '(No Subject)';

      // 提取邮件内容
      const textContent = this.extractTextContent(parsed);
      const htmlContent = this.extractHtmlContent(parsed);

      // 提取附件信息（不存储附件内容）
      const attachments = this.extractAttachmentInfo(parsed.attachments);

      // 计算邮件大小
      const size = Buffer.isBuffer(rawMail)
        ? rawMail.length
        : Buffer.byteLength(rawMail, 'utf8');

      logger.info('Mail parsed successfully', {
        from,
        to,
        subject,
        attachmentCount: attachments.length,
        size,
      });

      return {
        from,
        to,
        subject,
        textContent,
        htmlContent,
        attachments,
        size,
      };
    } catch (error) {
      logger.error('Failed to parse mail:', error);
      throw new Error(
        `Mail parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 从地址对象中提取邮箱地址
   * @param addressObj 地址对象
   * @returns 邮箱地址字符串
   */
  private static extractEmailAddress(addressObj: any): string {
    if (!addressObj) {
      return '';
    }

    if (typeof addressObj === 'string') {
      return addressObj;
    }

    if (Array.isArray(addressObj) && addressObj.length > 0) {
      const firstAddress = addressObj[0];
      return firstAddress.address || firstAddress.text || '';
    }

    if (addressObj.address) {
      return addressObj.address;
    }

    if (addressObj.text) {
      return addressObj.text;
    }

    return '';
  }

  /**
   * 提取纯文本内容
   * @param parsed 解析后的邮件对象
   * @returns 纯文本内容
   */
  private static extractTextContent(parsed: ParsedMail): string {
    if (parsed.text) {
      return this.sanitizeTextContent(parsed.text);
    }

    // 如果没有纯文本内容，尝试从HTML中提取
    if (parsed.html) {
      return this.extractTextFromHtml(parsed.html);
    }

    return '';
  }

  /**
   * 提取HTML内容
   * @param parsed 解析后的邮件对象
   * @returns HTML内容
   */
  private static extractHtmlContent(parsed: ParsedMail): string | undefined {
    if (!parsed.html) {
      return undefined;
    }

    return this.sanitizeHtmlContent(parsed.html);
  }

  /**
   * 提取附件信息（不存储附件内容）
   * @param attachments 附件数组
   * @returns 附件信息数组
   */
  private static extractAttachmentInfo(
    attachments?: NodemailerAttachment[]
  ): IAttachment[] {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    return attachments.map(attachment => ({
      filename: attachment.filename || 'unnamed',
      contentType: attachment.contentType || 'application/octet-stream',
      size: attachment.size || 0,
      contentId: attachment.cid || undefined,
    }));
  }

  /**
   * 清理纯文本内容
   * @param text 原始文本
   * @returns 清理后的文本
   */
  private static sanitizeTextContent(text: string): string {
    // 移除过多的空白字符
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 清理HTML内容
   * @param html 原始HTML
   * @returns 清理后的HTML
   */
  private static sanitizeHtmlContent(html: string): string {
    // 基本的HTML清理，移除潜在的危险标签和属性
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .trim();
  }

  /**
   * 从HTML中提取纯文本
   * @param html HTML内容
   * @returns 纯文本内容
   */
  private static extractTextFromHtml(html: string): string {
    // 简单的HTML标签移除
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 验证邮件地址是否属于我们的域名
   * @param email 邮件地址
   * @returns 是否属于我们的域名
   */
  static isOurDomain(email: string): boolean {
    const domain = email.split('@')[1];
    return domain === 'nnu.edu.kg';
  }

  /**
   * 从邮件地址中提取邮箱ID部分
   * @param email 邮件地址
   * @returns 邮箱ID部分
   */
  static extractMailboxIdFromEmail(email: string): string {
    return email.split('@')[0];
  }
}
