import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

/**
 * 认证状态接口
 */
export interface AuthState {
  isAuthenticated: boolean;
  mailboxId: string | null;
  token: string | null;
  isTokenExpiring: boolean;
  tokenRemainingTime: number;
  isRefreshing: boolean;
}

/**
 * 认证操作接口
 */
export interface AuthActions {
  login: (token: string, mailboxId: string) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkSession: () => boolean;
}

/**
 * useAuth hook返回类型
 */
export interface UseAuthReturn extends AuthState, AuthActions {}

/**
 * 认证管理Hook
 * 提供JWT token的本地存储、自动刷新、会话恢复等功能
 */
export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    mailboxId: null,
    token: null,
    isTokenExpiring: false,
    tokenRemainingTime: 0,
    isRefreshing: false,
  });

  const { showToast } = useToast();
  const navigate = useNavigate();
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 更新认证状态
   */
  const updateAuthState = useCallback(() => {
    const token = authService.getToken();
    const mailboxId = authService.getMailboxId();
    const isAuthenticated = authService.hasValidSession();
    const isTokenExpiring = authService.isTokenExpiringSoon();
    const tokenRemainingTime = authService.getTokenRemainingTime();

    setAuthState(prev => ({
      ...prev,
      isAuthenticated,
      mailboxId,
      token,
      isTokenExpiring,
      tokenRemainingTime,
    }));
  }, []);

  /**
   * 启动状态更新定时器
   */
  const startUpdateTimer = useCallback(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    updateTimerRef.current = setInterval(() => {
      updateAuthState();
    }, 30000); // 每30秒更新一次状态
  }, [updateAuthState]);

  /**
   * 停止状态更新定时器
   */
  const stopUpdateTimer = useCallback(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);

  /**
   * 登录 - 存储认证信息
   */
  const login = useCallback(
    (token: string, mailboxId: string) => {
      authService.setAuthData(token, mailboxId);
      updateAuthState();
      startUpdateTimer();

      showToast({
        type: 'success',
        message: '邮箱会话已建立',
      });
    },
    [updateAuthState, startUpdateTimer, showToast]
  );

  /**
   * 登出 - 清除认证信息
   */
  const logout = useCallback(() => {
    authService.clearAuthData();
    stopUpdateTimer();

    setAuthState({
      isAuthenticated: false,
      mailboxId: null,
      token: null,
      isTokenExpiring: false,
      tokenRemainingTime: 0,
      isRefreshing: false,
    });

    showToast({
      type: 'info',
      message: '会话已结束',
    });

    // 导航到首页
    navigate('/');
  }, [stopUpdateTimer, showToast, navigate]);

  /**
   * 刷新token
   */
  const refreshToken = useCallback(async () => {
    if (authState.isRefreshing) {
      return; // 防止重复刷新
    }

    setAuthState(prev => ({ ...prev, isRefreshing: true }));

    try {
      await authService.refreshToken();
      updateAuthState();

      showToast({
        type: 'success',
        message: '会话已自动续期',
      });
    } catch (error) {
      console.error('Token refresh failed:', error);

      showToast({
        type: 'error',
        message: '会话续期失败，请重新生成邮箱',
      });

      // 刷新失败，执行登出
      logout();
    } finally {
      setAuthState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [authState.isRefreshing, updateAuthState, showToast, logout]);

  /**
   * 检查会话有效性
   */
  const checkSession = useCallback((): boolean => {
    const isValid = authService.hasValidSession();

    if (!isValid && authState.isAuthenticated) {
      // 会话无效但状态显示已认证，执行登出
      logout();
    }

    return isValid;
  }, [authState.isAuthenticated, logout]);

  /**
   * 处理token过期事件
   */
  const handleTokenExpired = useCallback(() => {
    showToast({
      type: 'warning',
      message: '会话已过期，请重新生成邮箱',
    });
    logout();
  }, [showToast, logout]);

  /**
   * 自动刷新token（当即将过期时）
   */
  const handleAutoRefresh = useCallback(async () => {
    if (
      authState.isTokenExpiring &&
      !authState.isRefreshing &&
      authState.isAuthenticated
    ) {
      try {
        await refreshToken();
      } catch (error) {
        // 刷新失败已在refreshToken中处理
      }
    }
  }, [
    authState.isTokenExpiring,
    authState.isRefreshing,
    authState.isAuthenticated,
    refreshToken,
  ]);

  // 初始化和清理
  useEffect(() => {
    // 初始化状态
    updateAuthState();

    // 如果有有效会话，启动定时器
    if (authService.hasValidSession()) {
      startUpdateTimer();
    }

    // 监听token过期事件
    window.addEventListener('auth:token-expired', handleTokenExpired);

    return () => {
      stopUpdateTimer();
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, [updateAuthState, startUpdateTimer, stopUpdateTimer, handleTokenExpired]);

  // 自动刷新token
  useEffect(() => {
    handleAutoRefresh();
  }, [handleAutoRefresh]);

  // 页面可见性变化时检查会话
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面变为可见时检查会话
        checkSession();
        updateAuthState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkSession, updateAuthState]);

  return {
    // 状态
    isAuthenticated: authState.isAuthenticated,
    mailboxId: authState.mailboxId,
    token: authState.token,
    isTokenExpiring: authState.isTokenExpiring,
    tokenRemainingTime: authState.tokenRemainingTime,
    isRefreshing: authState.isRefreshing,

    // 操作
    login,
    logout,
    refreshToken,
    checkSession,
  };
}
