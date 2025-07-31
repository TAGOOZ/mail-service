import { randomBytes, createHash } from 'crypto';

/**
 * 生成随机邮箱地址
 * @param domain 邮箱域名，默认为 'nnu.edu.kg'
 * @returns 生成的邮箱地址
 */
export function generateMailboxAddress(domain: string = 'nnu.edu.kg'): string {
  // 生成8位随机字符串，包含字母和数字
  const randomString = randomBytes(4).toString('hex');
  const timestamp = Date.now().toString(36).slice(-4);
  const address = `${randomString}${timestamp}`;
  
  return `${address}@${domain}`;
}

/**
 * 验证邮箱地址格式
 * @param address 邮箱地址
 * @param domain 允许的域名，默认为 'nnu.edu.kg'
 * @returns 是否为有效的邮箱地址
 */
export function validateMailboxAddress(address: string, domain: string = 'nnu.edu.kg'): boolean {
  const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(address)) {
    return false;
  }
  
  const [localPart, domainPart] = address.split('@');
  
  // 检查域名是否匹配
  if (domainPart !== domain) {
    return false;
  }
  
  // 检查本地部分长度（8位字符）
  if (localPart.length !== 8) {
    return false;
  }
  
  // 检查本地部分只包含字母和数字
  if (!/^[a-zA-Z0-9]+$/.test(localPart)) {
    return false;
  }
  
  return true;
}

/**
 * 生成邮箱ID
 * @returns UUID格式的邮箱ID
 */
export function generateMailboxId(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * 计算邮箱过期时间
 * @param createdAt 创建时间
 * @param hoursToAdd 要添加的小时数，默认24小时
 * @returns 过期时间
 */
export function calculateExpiryTime(createdAt: Date = new Date(), hoursToAdd: number = 24): Date {
  const expiryTime = new Date(createdAt);
  expiryTime.setHours(expiryTime.getHours() + hoursToAdd);
  return expiryTime;
}

/**
 * 检查邮箱是否过期
 * @param expiresAt 过期时间
 * @param currentTime 当前时间，默认为当前时间
 * @returns 是否已过期
 */
export function isMailboxExpired(expiresAt: Date, currentTime: Date = new Date()): boolean {
  return currentTime > expiresAt;
}

/**
 * 计算邮箱剩余时间（分钟）
 * @param expiresAt 过期时间
 * @param currentTime 当前时间，默认为当前时间
 * @returns 剩余分钟数，如果已过期返回0
 */
export function getRemainingMinutes(expiresAt: Date, currentTime: Date = new Date()): number {
  const diffMs = expiresAt.getTime() - currentTime.getTime();
  if (diffMs <= 0) {
    return 0;
  }
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * 检查是否可以延长邮箱有效期
 * @param extensionCount 当前延期次数
 * @param maxExtensions 最大延期次数，默认为2
 * @returns 是否可以延期
 */
export function canExtendMailbox(extensionCount: number, maxExtensions: number = 2): boolean {
  return extensionCount < maxExtensions;
}

/**
 * 生成邮箱地址的哈希值（用于索引）
 * @param address 邮箱地址
 * @returns 地址的哈希值
 */
export function hashMailboxAddress(address: string): string {
  return createHash('sha256').update(address.toLowerCase()).digest('hex');
}