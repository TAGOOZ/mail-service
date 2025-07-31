import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

/**
 * 生成安全的随机令牌
 * @param length 令牌长度（字节），默认32字节
 * @returns 十六进制格式的令牌
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * 生成JWT密钥
 * @param length 密钥长度（字节），默认64字节
 * @returns Base64格式的密钥
 */
export function generateJWTSecret(length: number = 64): string {
  return randomBytes(length).toString('base64');
}

/**
 * 创建HMAC签名
 * @param data 要签名的数据
 * @param secret 密钥
 * @param algorithm 算法，默认sha256
 * @returns 签名字符串
 */
export function createHMACSignature(
  data: string,
  secret: string,
  algorithm: string = 'sha256'
): string {
  return createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * 验证HMAC签名
 * @param data 原始数据
 * @param signature 签名
 * @param secret 密钥
 * @param algorithm 算法，默认sha256
 * @returns 签名是否有效
 */
export function verifyHMACSignature(
  data: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expectedSignature = createHMACSignature(data, secret, algorithm);
  
  // 使用时间安全的比较函数防止时序攻击
  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');
    
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * 生成带过期时间的令牌
 * @param payload 载荷数据
 * @param secret 密钥
 * @param expiresInSeconds 过期时间（秒）
 * @returns 令牌字符串
 */
export function generateExpiringToken(
  payload: Record<string, any>,
  secret: string,
  expiresInSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenData = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  
  const encodedPayload = Buffer.from(JSON.stringify(tokenData)).toString('base64url');
  const signature = createHMACSignature(encodedPayload, secret);
  
  return `${encodedPayload}.${signature}`;
}

/**
 * 验证带过期时间的令牌
 * @param token 令牌字符串
 * @param secret 密钥
 * @returns 解析后的载荷数据，如果无效返回null
 */
export function verifyExpiringToken(
  token: string,
  secret: string
): Record<string, any> | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    
    if (!encodedPayload || !signature) {
      return null;
    }
    
    // 验证签名
    if (!verifyHMACSignature(encodedPayload, signature, secret)) {
      return null;
    }
    
    // 解析载荷
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 生成API密钥
 * @param prefix 前缀，默认'tmp'
 * @param length 随机部分长度，默认32字节
 * @returns API密钥
 */
export function generateApiKey(prefix: string = 'tmp', length: number = 32): string {
  const randomPart = randomBytes(length).toString('hex');
  return `${prefix}_${randomPart}`;
}

/**
 * 验证API密钥格式
 * @param apiKey API密钥
 * @param expectedPrefix 期望的前缀，默认'tmp'
 * @returns 是否为有效格式
 */
export function validateApiKeyFormat(apiKey: string, expectedPrefix: string = 'tmp'): boolean {
  const pattern = new RegExp(`^${expectedPrefix}_[a-f0-9]{64}$`);
  return pattern.test(apiKey);
}

/**
 * 生成会话ID
 * @returns 会话ID
 */
export function generateSessionId(): string {
  return generateSecureToken(16);
}

/**
 * 创建令牌指纹（用于令牌撤销）
 * @param token 令牌
 * @returns 令牌指纹
 */
export function createTokenFingerprint(token: string): string {
  return createHmac('sha256', 'fingerprint').update(token).digest('hex').substring(0, 16);
}

/**
 * 生成一次性令牌（OTP）
 * @param length 令牌长度，默认6位
 * @returns 数字格式的一次性令牌
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes(1)[0] % digits.length;
    otp += digits[randomIndex];
  }
  
  return otp;
}