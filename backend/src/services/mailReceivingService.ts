import { createServer, Server } from 'net';
import { MailParserService, ParsedMailData } from './mailParserService';
import { MailboxService } from './mailboxService';
import { Mail } from '../models/Mail';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface MailReceivedEvent {
  mailboxId: string;
  mail: any;
}

export class MailReceivingService extends EventEmitter {
  private server: Server | null = null;
  private port: number;
  private isRunning = false;

  constructor(port: number = 2525) {
    super();
    this.port = port;
  }

  /**
   * 启动邮件接收服务器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Mail receiving service is already running');
      return;
    }

    try {
      this.server = createServer(socket => {
        this.handleConnection(socket);
      });

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.port, (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isRunning = true;
      logger.info(`Mail receiving service started on port ${this.port}`);
    } catch (error) {
      logger.error('Failed to start mail receiving service:', error);
      throw error;
    }
  }

  /**
   * 停止邮件接收服务器
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    try {
      await new Promise<void>(resolve => {
        this.server!.close(() => {
          resolve();
        });
      });

      this.isRunning = false;
      this.server = null;
      logger.info('Mail receiving service stopped');
    } catch (error) {
      logger.error('Failed to stop mail receiving service:', error);
      throw error;
    }
  }

  /**
   * 处理SMTP连接
   * @param socket 网络套接字
   */
  private handleConnection(socket: any): void {
    let mailData = '';
    let isDataMode = false;
    let currentCommand = '';

    logger.info('New SMTP connection established', {
      remoteAddress: socket.remoteAddress,
    });

    // 发送欢迎消息
    socket.write('220 nnu.edu.kg ESMTP Ready\r\n');

    socket.on('data', (data: Buffer) => {
      const input = data.toString();

      if (isDataMode) {
        // 数据模式：收集邮件内容
        mailData += input;

        // 检查邮件结束标志
        if (input.includes('\r\n.\r\n')) {
          isDataMode = false;
          // 移除结束标志
          mailData = mailData.replace(/\r\n\.\r\n$/, '');

          // 处理接收到的邮件
          this.processReceivedMail(mailData)
            .then(() => {
              socket.write('250 OK: Message accepted\r\n');
            })
            .catch(error => {
              logger.error('Failed to process received mail:', error);
              socket.write('550 Error: Message processing failed\r\n');
            });

          mailData = '';
        }
      } else {
        // 命令模式：处理SMTP命令
        const lines = input.split('\r\n').filter(line => line.length > 0);

        for (const line of lines) {
          const result = this.handleSmtpCommand(socket, line);
          if (result === 'DATA_MODE') {
            isDataMode = true;
            break;
          }
        }
      }
    });

    socket.on('close', () => {
      logger.info('SMTP connection closed');
    });

    socket.on('error', (error: Error) => {
      logger.error('SMTP connection error:', error);
    });
  }

  /**
   * 处理SMTP命令
   * @param socket 网络套接字
   * @param command SMTP命令
   * @returns 命令处理结果
   */
  private handleSmtpCommand(socket: any, command: string): string | void {
    const cmd = command.toUpperCase();

    logger.debug('Received SMTP command:', command);

    if (cmd.startsWith('HELO') || cmd.startsWith('EHLO')) {
      socket.write('250 nnu.edu.kg Hello\r\n');
    } else if (cmd.startsWith('MAIL FROM:')) {
      socket.write('250 OK\r\n');
    } else if (cmd.startsWith('RCPT TO:')) {
      // 验证收件人地址是否属于我们的域名
      const email = this.extractEmailFromCommand(command);
      if (MailParserService.isOurDomain(email)) {
        socket.write('250 OK\r\n');
      } else {
        socket.write('550 No such user here\r\n');
      }
    } else if (cmd === 'DATA') {
      socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
      return 'DATA_MODE';
    } else if (cmd === 'QUIT') {
      socket.write('221 Bye\r\n');
      socket.end();
    } else if (cmd === 'RSET') {
      socket.write('250 OK\r\n');
    } else if (cmd === 'NOOP') {
      socket.write('250 OK\r\n');
    } else {
      socket.write('500 Command not recognized\r\n');
    }
  }

  /**
   * 从SMTP命令中提取邮件地址
   * @param command SMTP命令
   * @returns 邮件地址
   */
  private extractEmailFromCommand(command: string): string {
    const match = command.match(/<([^>]+)>/);
    return match ? match[1] : '';
  }

  /**
   * 处理接收到的邮件
   * @param rawMailData 原始邮件数据
   */
  private async processReceivedMail(rawMailData: string): Promise<void> {
    try {
      logger.info('Processing received mail', {
        size: rawMailData.length,
      });

      // 解析邮件
      const parsedMail = await MailParserService.parseRawMail(rawMailData);

      // 验证收件人地址
      if (!MailParserService.isOurDomain(parsedMail.to)) {
        logger.warn('Received mail for non-local domain:', parsedMail.to);
        return;
      }

      // 提取邮箱地址
      const mailboxAddress = MailParserService.extractMailboxIdFromEmail(
        parsedMail.to
      );

      // 查找对应的邮箱
      const mailbox = await this.findMailboxByAddress(parsedMail.to);
      if (!mailbox) {
        logger.warn('Mailbox not found for address:', parsedMail.to);
        return;
      }

      // 检查邮箱是否过期
      if (new Date() > mailbox.expiresAt) {
        logger.warn('Received mail for expired mailbox:', parsedMail.to);
        return;
      }

      // 存储邮件
      const savedMail = await this.saveMail(mailbox.id, parsedMail);

      // 发出邮件接收事件
      this.emit('mailReceived', {
        mailboxId: mailbox.id,
        mail: savedMail,
      });

      logger.info('Mail processed and saved successfully', {
        mailId: savedMail.id,
        mailboxId: mailbox.id,
        from: parsedMail.from,
        subject: parsedMail.subject,
      });
    } catch (error) {
      logger.error('Failed to process received mail:', error);
      throw error;
    }
  }

  /**
   * 根据邮件地址查找邮箱
   * @param address 邮件地址
   * @returns 邮箱对象
   */
  private async findMailboxByAddress(address: string): Promise<any> {
    try {
      // 这里需要导入Mailbox模型
      const { Mailbox } = await import('../models/Mailbox');
      return await Mailbox.findOne({ address, isActive: true });
    } catch (error) {
      logger.error('Failed to find mailbox by address:', error);
      return null;
    }
  }

  /**
   * 保存邮件到数据库
   * @param mailboxId 邮箱ID
   * @param parsedMail 解析后的邮件数据
   * @returns 保存的邮件对象
   */
  private async saveMail(
    mailboxId: string,
    parsedMail: ParsedMailData
  ): Promise<any> {
    try {
      const mail = new Mail({
        mailboxId,
        from: parsedMail.from,
        to: parsedMail.to,
        subject: parsedMail.subject,
        textContent: parsedMail.textContent,
        htmlContent: parsedMail.htmlContent,
        attachments: parsedMail.attachments,
        size: parsedMail.size,
        receivedAt: new Date(),
        isRead: false,
      });

      await mail.save();
      return mail;
    } catch (error) {
      logger.error('Failed to save mail:', error);
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isRunning: boolean; port: number } {
    return {
      isRunning: this.isRunning,
      port: this.port,
    };
  }
}

// 导出单例实例
export const mailReceivingService = new MailReceivingService(
  parseInt(process.env.MAIL_PORT || '2525')
);
