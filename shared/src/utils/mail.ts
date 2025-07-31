import { randomBytes } from 'crypto';
import { Attachment } from '../types/mail';

/**
 * 生成邮件ID
 * @returns UUID格式的邮件ID
 */
export function generateMailId(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * 清理HTML内容，移除危险标签和属性
 * @param htmlContent HTML内容
 * @returns 清理后的HTML内容
 */
export function sanitizeHtmlContent(htmlContent: string): string {
  // 移除script标签
  let cleaned = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除危险的事件处理器
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // 移除javascript: 协议
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // 移除style标签中的expression
  cleaned = cleaned.replace(/expression\s*\(/gi, '');
  
  // 移除iframe标签
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // 移除object和embed标签
  cleaned = cleaned.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  
  return cleaned;
}

/**
 * 从HTML内容中提取纯文本
 * @param htmlContent HTML内容
 * @returns 提取的纯文本
 */
export function extractTextFromHtml(htmlContent: string): string {
  // 移除HTML标签
  let text = htmlContent.replace(/<[^>]*>/g, '');
  
  // 解码HTML实体
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // 清理多余的空白字符
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * 验证邮件地址格式
 * @param email 邮件地址
 * @returns 是否为有效的邮件地址
 */
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * 解析邮件主题，移除不必要的前缀
 * @param subject 原始主题
 * @returns 清理后的主题
 */
export function parseMailSubject(subject: string): string {
  // 移除常见的邮件前缀
  let cleaned = subject.replace(/^(Re:|RE:|Fwd:|FWD:|回复:|转发:)\s*/i, '');
  
  // 清理多余的空白字符
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned || '(无主题)';
}

/**
 * 计算邮件内容大小（字节）
 * @param textContent 纯文本内容
 * @param htmlContent HTML内容（可选）
 * @param attachments 附件列表
 * @returns 邮件总大小（字节）
 */
export function calculateMailSize(
  textContent: string,
  htmlContent?: string,
  attachments: Attachment[] = []
): number {
  let size = 0;
  
  // 计算文本内容大小
  size += Buffer.byteLength(textContent, 'utf8');
  
  // 计算HTML内容大小
  if (htmlContent) {
    size += Buffer.byteLength(htmlContent, 'utf8');
  }
  
  // 计算附件大小
  size += attachments.reduce((total, attachment) => total + attachment.size, 0);
  
  return size;
}

/**
 * 验证附件信息
 * @param attachment 附件信息
 * @returns 是否为有效的附件信息
 */
export function validateAttachment(attachment: Attachment): boolean {
  // 检查必需字段
  if (!attachment.filename || !attachment.contentType || attachment.size < 0) {
    return false;
  }
  
  // 检查文件名长度
  if (attachment.filename.length > 255) {
    return false;
  }
  
  // 检查内容类型格式
  const contentTypeRegex = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/;
  if (!contentTypeRegex.test(attachment.contentType)) {
    return false;
  }
  
  // 检查文件大小限制（最大10MB）
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (attachment.size > maxSize) {
    return false;
  }
  
  return true;
}

/**
 * 格式化邮件大小显示
 * @param bytes 字节数
 * @returns 格式化的大小字符串
 */
export function formatMailSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查邮件内容是否包含敏感信息（简单检查）
 * @param content 邮件内容
 * @returns 是否包含敏感信息
 */
export function containsSensitiveContent(content: string): boolean {
  const sensitivePatterns = [
    /password\s*[:=]\s*\S+/i,
    /密码\s*[:：=]\s*\S+/i,
    /credit\s*card/i,
    /信用卡/i,
    /social\s*security/i,
    /身份证/i,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(content));
}