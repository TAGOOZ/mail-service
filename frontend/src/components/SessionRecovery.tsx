import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMailboxContext } from '../contexts/MailboxContext';
import { mailboxApi } from '../lib/mailboxApi';
import { useToast } from '../contexts/ToastContext';
import { MailboxInfoSkeleton } from './LoadingSkeletons';

/**
 * 会话恢复组件
 * 在应用启动时检查并恢复用户会话
 */
interface SessionRecoveryProps {
  children: React.ReactNode;
}

export const SessionRecovery: React.FC<SessionRecoveryProps> = ({ children }) => {
  const [isRecovering, setIsRecovering] = useState(true);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  const { login, checkSession } = useAuth();
  const { dispatch } = useMailboxContext();
  const { showToast } = useToast();

  /**
   * 尝试恢复会话
   */
  const attemptSessionRecovery = async () => {
    try {
      // 检查是否有有效的本地会话
      const hasValidSession = checkSession();

      if (!hasValidSession) {
        setIsRecovering(false);
        setRecoveryAttempted(true);
        return;
      }

      // 获取存储的认证信息
      const token = localStorage.getItem('mailbox_token');
      const mailboxId = localStorage.getItem('mailbox_id');

      if (!token || !mailboxId) {
        setIsRecovering(false);
        setRecoveryAttempted(true);
        return;
      }

      // 验证会话是否仍然有效（通过API调用）
      const mailbox = await mailboxApi.getMailbox(mailboxId);

      // 会话有效，恢复状态
      login(mailbox.token, mailbox.id);
      dispatch({ type: 'SET_MAILBOX', payload: mailbox });

      showToast({
        type: 'success',
        message: '会话已恢复',
      });

    } catch (error) {
      console.warn('Session recovery failed:', error);

      // 清除无效的会话数据
      localStorage.removeItem('mailbox_token');
      localStorage.removeItem('mailbox_id');

      // 不显示错误提示，静默失败
    } finally {
      setIsRecovering(false);
      setRecoveryAttempted(true);
    }
  };

  // 在组件挂载时尝试恢复会话
  useEffect(() => {
    if (!recoveryAttempted) {
      attemptSessionRecovery();
    }
  }, [recoveryAttempted]);

  // 显示加载状态
  if (isRecovering) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              正在恢复会话...
            </h2>
            <p className="text-gray-600">
              正在检查您的邮箱会话状态
            </p>
          </div>

          <div className="space-y-4">
            <MailboxInfoSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * 会话状态指示器组件
 * 显示当前会话状态和剩余时间
 */
export const SessionStatusIndicator: React.FC = () => {
  const {
    isAuthenticated,
    isTokenExpiring,
    tokenRemainingTime,
    isRefreshing
  } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const formatRemainingTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return '不到1分钟';
    }
  };

  const getStatusColor = (): string => {
    if (isRefreshing) return 'text-blue-600';
    if (isTokenExpiring) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusText = (): string => {
    if (isRefreshing) return '正在续期...';
    if (isTokenExpiring) return '即将过期';
    return '会话有效';
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        <div className={`w-2 h-2 rounded-full ${isRefreshing
          ? 'bg-blue-600 animate-pulse'
          : isTokenExpiring
            ? 'bg-orange-600'
            : 'bg-green-600'
          }`}></div>
        <span>{getStatusText()}</span>
      </div>

      {tokenRemainingTime > 0 && !isRefreshing && (
        <span className="text-gray-500">
          剩余: {formatRemainingTime(tokenRemainingTime)}
        </span>
      )}
    </div>
  );
};