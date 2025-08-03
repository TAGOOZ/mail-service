import React from 'react';
import { Wifi, WifiOff, RotateCw, AlertTriangle } from 'lucide-react';
import { ConnectionStatus as Status } from '../services/websocketService';

interface ConnectionStatusProps {
  status: Status;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case Status.CONNECTED:
        return {
          icon: Wifi,
          text: '实时连接',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case Status.CONNECTING:
        return {
          icon: RotateCw,
          text: '连接中...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          animate: true,
        };
      case Status.RECONNECTING:
        return {
          icon: RotateCw,
          text: '重连中...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          animate: true,
        };
      case Status.ERROR:
        return {
          icon: AlertTriangle,
          text: '连接错误',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case Status.DISCONNECTED:
      default:
        return {
          icon: WifiOff,
          text: '未连接',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium
        ${config.color} ${config.bgColor} ${config.borderColor}
        ${className}
      `}
    >
      <Icon 
        size={14} 
        className={config.animate ? 'animate-spin' : ''} 
      />
      <span>{config.text}</span>
    </div>
  );
};

export default ConnectionStatus;