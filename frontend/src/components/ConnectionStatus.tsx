import React from 'react';
import { Wifi, WifiOff, RotateCcw, AlertTriangle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  hasError?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isReconnecting = false,
  hasError = false,
  className = '',
}) => {
  const getStatusConfig = () => {
    if (hasError) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: '连接错误',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        dotColor: 'bg-red-500',
      };
    }

    if (isReconnecting) {
      return {
        icon: <RotateCcw className="h-4 w-4 animate-spin" />,
        text: '重新连接中',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        dotColor: 'bg-orange-500',
      };
    }

    if (isConnected) {
      return {
        icon: <Wifi className="h-4 w-4" />,
        text: '实时连接',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        dotColor: 'bg-green-500 animate-pulse',
      };
    }

    return {
      icon: <WifiOff className="h-4 w-4" />,
      text: '连接断开',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      dotColor: 'bg-red-500',
    };
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        <div className={config.color}>
          {config.icon}
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;