import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface NetworkStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
  showOfflineMessage?: boolean;
  className?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  onStatusChange,
  showOfflineMessage = true,
  className = '',
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      onStatusChange?.(true);

      // Hide status after 3 seconds when back online
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show status initially if offline
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  if (!showStatus && isOnline) {
    return null;
  }

  if (!showOfflineMessage && isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${className}`}
    >
      <div
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${isOnline
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
          }`}
      >
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>网络连接已恢复</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>网络连接已断开</span>
          </>
        )}
      </div>
    </div>
  );
};

// Hook for using network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Mark that we were offline so we can show recovery message
      if (!isOnline) {
        setWasOffline(true);
        // Reset the flag after a delay
        setTimeout(() => setWasOffline(false), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return {
    isOnline,
    wasOffline,
    isRecovering: isOnline && wasOffline,
  };
};

// Component for showing network-related error states
interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  className = '',
}) => {
  const { isOnline } = useNetworkStatus();

  return (
    <div className={`text-center space-y-4 ${className}`}>
      <div className="flex justify-center">
        {isOnline ? (
          <AlertTriangle className="h-12 w-12 text-orange-500" />
        ) : (
          <WifiOff className="h-12 w-12 text-red-500" />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {isOnline ? '连接超时' : '网络连接断开'}
        </h3>
        <p className="text-gray-600">
          {isOnline
            ? '服务器响应超时，请检查网络连接或稍后重试'
            : '请检查您的网络连接，然后重试'
          }
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={!isOnline}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${isOnline
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          <Wifi className="h-4 w-4" />
          <span>{isOnline ? '重试' : '等待网络连接'}</span>
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;