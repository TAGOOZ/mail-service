import { useEffect, useCallback, useRef } from 'react';
import { useMailboxContext } from '../contexts/MailboxContext';
import { useMails } from './useMails';
import websocketService, {
  ConnectionStatus,
  WebSocketEventListeners,
} from '../services/websocketService';
import {
  NewMailEventData,
  ExpiryWarningEventData,
  MailboxExpiredEventData,
  WebSocketErrorEventData,
} from '../services/websocketService';
import toast from 'react-hot-toast';

/**
 * WebSocket 连接管理 Hook
 */
export const useWebSocket = () => {
  const { state, dispatch } = useMailboxContext();
  const { addNewMail } = useMails();
  const isSubscribedRef = useRef<string | null>(null);

  /**
   * 处理连接状态变化
   */
  const handleConnectionChange = useCallback(
    (status: ConnectionStatus) => {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: status === ConnectionStatus.CONNECTED,
      });

      // 显示连接状态提示
      switch (status) {
        case ConnectionStatus.CONNECTED:
          if (isSubscribedRef.current) {
            toast.success('实时连接已建立', { duration: 2000 });
          }
          break;
        case ConnectionStatus.DISCONNECTED:
          toast.error('实时连接已断开', { duration: 3000 });
          break;
        case ConnectionStatus.RECONNECTING:
          toast.loading('正在重新连接...', { duration: 2000 });
          break;
        case ConnectionStatus.ERROR:
          toast.error('连接出现错误，请刷新页面', { duration: 5000 });
          break;
      }
    },
    [dispatch]
  );

  /**
   * 处理新邮件事件
   */
  const handleNewMail = useCallback(
    (data: NewMailEventData) => {
      // 只处理当前邮箱的邮件
      if (state.currentMailbox && data.mailboxId === state.currentMailbox.id) {
        addNewMail(data.mail);

        // 显示新邮件通知
        toast.success(`收到新邮件: ${data.mail.subject || '(无主题)'}`, {
          duration: 5000,
          icon: '📧',
        });

        // 播放通知声音（如果浏览器支持）
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // 忽略播放失败（可能是用户未交互过页面）
          });
        } catch (error) {
          // 忽略音频播放错误
        }

        // 发送浏览器通知（如果用户已授权）
        if (Notification.permission === 'granted') {
          new Notification('新邮件', {
            body: `来自: ${data.mail.from}\n主题: ${data.mail.subject || '(无主题)'}`,
            icon: '/favicon.ico',
            tag: 'new-mail',
          });
        }
      }
    },
    [state.currentMailbox, addNewMail]
  );

  /**
   * 处理邮箱过期警告
   */
  const handleExpiryWarning = useCallback(
    (data: ExpiryWarningEventData) => {
      if (state.currentMailbox && data.mailboxId === state.currentMailbox.id) {
        const minutesText =
          data.minutesLeft === 1 ? '1 分钟' : `${data.minutesLeft} 分钟`;

        toast.error(`邮箱将在 ${minutesText} 后过期`, {
          duration: 10000,
          icon: '⏰',
        });

        // 发送浏览器通知
        if (Notification.permission === 'granted') {
          new Notification('邮箱即将过期', {
            body: `您的临时邮箱将在 ${minutesText} 后过期，请及时延长有效期`,
            icon: '/favicon.ico',
            tag: 'expiry-warning',
          });
        }
      }
    },
    [state.currentMailbox]
  );

  /**
   * 处理邮箱已过期事件
   */
  const handleMailboxExpired = useCallback(
    (data: MailboxExpiredEventData) => {
      if (state.currentMailbox && data.mailboxId === state.currentMailbox.id) {
        toast.error('邮箱已过期，请生成新的邮箱', {
          duration: 10000,
          icon: '❌',
        });

        // 清除本地状态
        dispatch({ type: 'RESET_STATE' });
        localStorage.removeItem('mailbox_id');
        localStorage.removeItem('mailbox_token');

        // 取消订阅
        websocketService.unsubscribeFromMailbox(data.mailboxId);
        isSubscribedRef.current = null;
      }
    },
    [state.currentMailbox, dispatch]
  );

  /**
   * 处理 WebSocket 错误
   */
  const handleWebSocketError = useCallback((data: WebSocketErrorEventData) => {
    console.error('WebSocket error:', data);

    toast.error(`连接错误: ${data.message}`, {
      duration: 5000,
    });
  }, []);

  /**
   * 连接到 WebSocket
   */
  const connect = useCallback(() => {
    const listeners: WebSocketEventListeners = {
      onConnectionChange: handleConnectionChange,
      onNewMail: handleNewMail,
      onExpiryWarning: handleExpiryWarning,
      onMailboxExpired: handleMailboxExpired,
      onError: handleWebSocketError,
    };

    websocketService.setEventListeners(listeners);
    websocketService.connect();
  }, [
    handleConnectionChange,
    handleNewMail,
    handleExpiryWarning,
    handleMailboxExpired,
    handleWebSocketError,
  ]);

  /**
   * 断开 WebSocket 连接
   */
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    isSubscribedRef.current = null;
  }, []);

  /**
   * 订阅邮箱更新
   */
  const subscribeToMailbox = useCallback((mailboxId: string, token: string) => {
    // 如果已经订阅了相同的邮箱，不需要重复订阅
    if (isSubscribedRef.current === mailboxId) {
      return;
    }

    // 如果之前订阅了其他邮箱，先取消订阅
    if (isSubscribedRef.current) {
      websocketService.unsubscribeFromMailbox(isSubscribedRef.current);
    }

    websocketService.subscribeToMailbox(mailboxId, token);
    isSubscribedRef.current = mailboxId;
  }, []);

  /**
   * 取消订阅邮箱
   */
  const unsubscribeFromMailbox = useCallback((mailboxId: string) => {
    websocketService.unsubscribeFromMailbox(mailboxId);
    if (isSubscribedRef.current === mailboxId) {
      isSubscribedRef.current = null;
    }
  }, []);

  /**
   * 请求浏览器通知权限
   */
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('已启用浏览器通知');
        }
        return permission;
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
      }
    }
    return Notification.permission;
  }, []);

  /**
   * 自动连接和订阅管理
   */
  useEffect(() => {
    // 当有邮箱时自动连接和订阅
    if (state.currentMailbox) {
      connect();

      const token = localStorage.getItem('mailbox_token');
      if (token) {
        subscribeToMailbox(state.currentMailbox.id, token);
      }
    } else {
      // 没有邮箱时断开连接
      if (isSubscribedRef.current) {
        unsubscribeFromMailbox(isSubscribedRef.current);
      }
    }

    // 组件卸载时清理
    return () => {
      if (isSubscribedRef.current) {
        unsubscribeFromMailbox(isSubscribedRef.current);
      }
    };
  }, [
    state.currentMailbox,
    connect,
    subscribeToMailbox,
    unsubscribeFromMailbox,
  ]);

  /**
   * 页面可见性变化处理
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时保持连接但可以降低活动频率
        console.log('Page hidden, WebSocket connection maintained');
      } else {
        // 页面显示时确保连接正常
        if (state.currentMailbox && !websocketService.isConnected()) {
          console.log('Page visible, reconnecting WebSocket');
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.currentMailbox, connect]);

  return {
    isConnected: state.isConnected,
    connectionStatus: websocketService.getConnectionStatus(),
    connect,
    disconnect,
    subscribeToMailbox,
    unsubscribeFromMailbox,
    requestNotificationPermission,
  };
};

export default useWebSocket;
