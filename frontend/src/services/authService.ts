import { JWTPayload } from '../../../shared/src/types/session';

/**
 * 认证服务 - 处理JWT token的本地存储和管理
 */
export class AuthService {
  private static readonly TOKEN_KEY = 'mailbox_token';
  private static readonly MAILBOX_ID_KEY = 'mailbox_id';
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟
  private static readonly TOKEN_CHECK_INTERVAL = 60 * 1000; // 1分钟

  private tokenCheckTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<string> | null = null;

  /**
   * 存储认证token和邮箱ID
   */
  setAuthData(token: string, mailboxId: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
    localStorage.setItem(AuthService.MAILBOX_ID_KEY, mailboxId);

    // 启动token检查定时器
    this.startTokenCheck();
  }

  /**
   * 获取当前token
   */
  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  /**
   * 获取当前邮箱ID
   */
  getMailboxId(): string | null {
    return localStorage.getItem(AuthService.MAILBOX_ID_KEY);
  }

  /**
   * 清除认证数据
   */
  clearAuthData(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.MAILBOX_ID_KEY);

    // 停止token检查定时器
    this.stopTokenCheck();
  }

  /**
   * 检查token是否存在
   */
  hasValidSession(): boolean {
    const token = this.getToken();
    const mailboxId = this.getMailboxId();

    if (!token || !mailboxId) {
      return false;
    }

    // 检查token是否过期
    const payload = this.parseJWTPayload(token);
    if (!payload) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  }

  /**
   * 解析JWT载荷（不验证签名，仅用于客户端检查）
   */
  private parseJWTPayload(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      return {
        mailboxId: payload.mailboxId,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      console.warn('Failed to parse JWT payload:', error);
      return null;
    }
  }

  /**
   * 检查token是否即将过期
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = this.parseJWTPayload(token);
    if (!payload) {
      return false;
    }

    const now = Date.now();
    const expiryTime = payload.exp * 1000;

    return expiryTime - now <= AuthService.REFRESH_THRESHOLD;
  }

  /**
   * 获取token剩余有效时间（毫秒）
   */
  getTokenRemainingTime(): number {
    const token = this.getToken();
    if (!token) {
      return 0;
    }

    const payload = this.parseJWTPayload(token);
    if (!payload) {
      return 0;
    }

    const now = Date.now();
    const expiryTime = payload.exp * 1000;

    return Math.max(0, expiryTime - now);
  }

  /**
   * 刷新token（通过重新获取邮箱信息）
   */
  async refreshToken(): Promise<string> {
    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const mailboxId = this.getMailboxId();
    if (!mailboxId) {
      throw new Error('No mailbox ID found');
    }

    this.refreshPromise = this.performTokenRefresh(mailboxId);

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 执行token刷新
   */
  private async performTokenRefresh(mailboxId: string): Promise<string> {
    try {
      // 导入API客户端（避免循环依赖）
      const { mailboxApi } = await import('../lib/mailboxApi');

      // 重新获取邮箱信息来刷新token
      const mailbox = await mailboxApi.getMailbox(mailboxId);

      // 更新存储的token
      this.setAuthData(mailbox.token, mailbox.id);

      return mailbox.token;
    } catch (error) {
      // 刷新失败，清除认证数据
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * 启动token检查定时器
   */
  private startTokenCheck(): void {
    this.stopTokenCheck(); // 确保没有重复的定时器

    this.tokenCheckTimer = setInterval(() => {
      if (!this.hasValidSession()) {
        // Token已过期，清除数据并停止检查
        this.clearAuthData();
        this.notifyTokenExpired();
        return;
      }

      if (this.isTokenExpiringSoon()) {
        // Token即将过期，尝试刷新
        this.refreshToken().catch(error => {
          console.warn('Failed to refresh token:', error);
          this.clearAuthData();
          this.notifyTokenExpired();
        });
      }
    }, AuthService.TOKEN_CHECK_INTERVAL);
  }

  /**
   * 停止token检查定时器
   */
  private stopTokenCheck(): void {
    if (this.tokenCheckTimer) {
      clearInterval(this.tokenCheckTimer);
      this.tokenCheckTimer = null;
    }
  }

  /**
   * 通知token过期（通过自定义事件）
   */
  private notifyTokenExpired(): void {
    window.dispatchEvent(new CustomEvent('auth:token-expired'));
  }

  /**
   * 销毁服务（清理资源）
   */
  destroy(): void {
    this.stopTokenCheck();
    this.refreshPromise = null;
  }
}

// 创建单例实例
export const authService = new AuthService();

// 在页面卸载时清理资源
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authService.destroy();
  });
}
