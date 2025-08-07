import * as nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { ParsedMailData } from './mailParserService';

export class MailHogForwardingService {
  private transporter: nodemailer.Transporter | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * 初始化 MailHog SMTP 传输器
   */
  private initializeTransporter(): void {
    // 只在开发环境启用
    if (process.env.NODE_ENV !== 'development') {
      logger.info('MailHog forwarding disabled in non-development environment');
      return;
    }

    // 检查是否配置了 MailHog
    const mailhogHost = process.env.MAILHOG_HOST;
    if (!mailhogHost) {
      logger.info('MAILHOG_HOST not configured, MailHog forwarding disabled');
      return;
    }

    const smtpHost = mailhogHost;
    const smtpPort = parseInt(process.env.MAILHOG_PORT || '1025');

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // MailHog doesn't use TLS
        ignoreTLS: true, // MailHog doesn't support TLS
        // MailHog doesn't require authentication, so we omit the auth property
      });

      this.isEnabled = true;
      logger.info(`MailHog forwarding enabled: ${smtpHost}:${smtpPort}`);
    } catch (error) {
      logger.error('Failed to initialize MailHog transporter:', error);
    }
  }

  /**
   * 将邮件转发到 MailHog 进行可视化
   * @param parsedMail 解析后的邮件数据
   * @param rawMailData 原始邮件数据（可选）
   */
  async forwardToMailHog(
    parsedMail: ParsedMailData,
    rawMailData?: string
  ): Promise<void> {
    if (!this.isEnabled || !this.transporter) {
      return;
    }

    try {
      const mailOptions = {
        from: parsedMail.from,
        to: parsedMail.to,
        subject: `[Forwarded] ${parsedMail.subject}`,
        text: this.formatTextForMailHog(parsedMail),
        html: this.formatHtmlForMailHog(parsedMail),
        headers: {
          'X-Original-From': parsedMail.from,
          'X-Original-To': parsedMail.to,
          'X-Forwarded-By': 'TempMail-Backend',
          'X-Forwarded-At': new Date().toISOString(),
        },
      };

      await this.transporter.sendMail(mailOptions);

      logger.debug('Mail forwarded to MailHog successfully', {
        from: parsedMail.from,
        to: parsedMail.to,
        subject: parsedMail.subject,
      });
    } catch (error) {
      logger.error('Failed to forward mail to MailHog:', error);
      // Don't throw error - forwarding failure shouldn't break main functionality
    }
  }

  /**
   * 格式化纯文本内容用于 MailHog 显示
   */
  private formatTextForMailHog(parsedMail: ParsedMailData): string {
    return `
=== FORWARDED EMAIL ===
Original From: ${parsedMail.from}
Original To: ${parsedMail.to}
Subject: ${parsedMail.subject}
Size: ${parsedMail.size} bytes
Attachments: ${parsedMail.attachments.length}
Forwarded At: ${new Date().toISOString()}

=== ORIGINAL CONTENT ===
${parsedMail.textContent}

=== ATTACHMENTS ===
${parsedMail.attachments
  .map(att => `- ${att.filename} (${att.contentType}, ${att.size} bytes)`)
  .join('\n')}
`;
  }

  /**
   * 格式化 HTML 内容用于 MailHog 显示
   */
  private formatHtmlForMailHog(parsedMail: ParsedMailData): string {
    const originalHtml =
      parsedMail.htmlContent || `<pre>${parsedMail.textContent}</pre>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Forwarded Email</title>
    <style>
        .forward-header {
            background: #f0f8ff;
            border: 1px solid #4a90e2;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
        }
        .forward-info {
            margin: 5px 0;
            font-size: 14px;
        }
        .original-content {
            border-top: 2px solid #ddd;
            padding-top: 20px;
        }
        .attachments {
            background: #f9f9f9;
            padding: 10px;
            margin-top: 15px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="forward-header">
        <h3>📧 Forwarded Email</h3>
        <div class="forward-info"><strong>Original From:</strong> ${parsedMail.from}</div>
        <div class="forward-info"><strong>Original To:</strong> ${parsedMail.to}</div>
        <div class="forward-info"><strong>Subject:</strong> ${parsedMail.subject}</div>
        <div class="forward-info"><strong>Size:</strong> ${parsedMail.size} bytes</div>
        <div class="forward-info"><strong>Forwarded At:</strong> ${new Date().toISOString()}</div>
    </div>
    
    <div class="original-content">
        ${originalHtml}
    </div>
    
    ${
      parsedMail.attachments.length > 0
        ? `
    <div class="attachments">
        <h4>📎 Attachments (${parsedMail.attachments.length})</h4>
        <ul>
            ${parsedMail.attachments
              .map(
                att =>
                  `<li>${att.filename} (${att.contentType}, ${att.size} bytes)</li>`
              )
              .join('')}
        </ul>
    </div>
    `
        : ''
    }
</body>
</html>
`;
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isEnabled: boolean; host?: string; port?: number } {
    if (!this.isEnabled) {
      return { isEnabled: false };
    }

    return {
      isEnabled: true,
      host: process.env.MAILHOG_HOST || process.env.SMTP_HOST,
      port: parseInt(
        process.env.MAILHOG_PORT || process.env.SMTP_PORT || '1025'
      ),
    };
  }
}

// 导出单例实例
export const mailHogForwardingService = new MailHogForwardingService();
