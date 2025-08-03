import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMailboxContext } from '../contexts/MailboxContext';
import ConnectionStatus from './ConnectionStatus';

/**
 * Demo component to test real-time functionality
 * This component can be temporarily added to test WebSocket connections
 */
const RealTimeDemo: React.FC = () => {
  const { state } = useMailboxContext();
  const { isConnected, connect, disconnect, subscribeToMailbox, requestNotificationPermission } = useWebSocket();
  const [testMailboxId] = useState('test-mailbox-id');
  const [testToken] = useState('test-token');

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSubscribe = () => {
    subscribeToMailbox(testMailboxId, testToken);
  };

  const handleTestNotification = () => {
    // Simulate a new mail notification
    if (Notification.permission === 'granted') {
      new Notification('测试通知', {
        body: '这是一个测试通知，用于验证浏览器通知功能',
        icon: '/favicon.ico',
      });
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">实时功能测试</h3>
      
      {/* Connection Status */}
      <div className="mb-4">
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* Control Buttons */}
      <div className="space-y-2 mb-4">
        <div className="flex space-x-2">
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            连接 WebSocket
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            断开连接
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSubscribe}
            disabled={!isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            订阅邮箱更新
          </button>
          <button
            onClick={handleTestNotification}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            测试通知
          </button>
        </div>
      </div>

      {/* Status Information */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>连接状态: {isConnected ? '已连接' : '未连接'}</p>
        <p>当前邮箱: {state.currentMailbox?.address || '无'}</p>
        <p>邮件数量: {state.mails.length}</p>
        <p>通知权限: {Notification.permission}</p>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">测试说明:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. 点击"连接 WebSocket"建立实时连接</li>
          <li>2. 点击"订阅邮箱更新"订阅测试邮箱</li>
          <li>3. 点击"测试通知"验证浏览器通知功能</li>
          <li>4. 观察连接状态指示器的变化</li>
        </ul>
      </div>
    </div>
  );
};

export default RealTimeDemo;