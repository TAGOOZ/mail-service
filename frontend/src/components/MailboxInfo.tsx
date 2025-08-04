import React, { useState, useEffect } from 'react';
import { Mail, Copy, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface MailboxInfoProps {
  address: string;
  expiresAt: string;
  mailCount: number;
  extensionCount: number;
  maxExtensions: number;
  onCopyAddress: () => void;
  onExtendExpiry: () => void;
  isExtending?: boolean;
}

const MailboxInfo: React.FC<MailboxInfoProps> = ({
  address,
  expiresAt,
  mailCount,
  extensionCount,
  maxExtensions,
  onCopyAddress,
  onExtendExpiry,
  isExtending = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    onCopyAddress();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canExtend = extensionCount < maxExtensions;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col space-y-4">
        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">您的临时邮箱</h1>
          
          {/* Email Address Display */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="flex items-center space-x-2 flex-1">
              <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="text-sm sm:text-lg font-mono bg-gray-100 px-2 sm:px-3 py-2 rounded-md break-all flex-1 min-w-0">
                {address}
              </span>
            </div>
            <button
              onClick={handleCopyClick}
              className="p-3 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0 touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
              title="复制邮箱地址"
            >
              {copied ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end">
          <button
            onClick={onExtendExpiry}
            disabled={!canExtend || isExtending}
            className={`inline-flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 rounded-md font-medium transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0 ${
              canExtend && !isExtending
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={
              !canExtend 
                ? `已达到最大延期次数 (${maxExtensions})`
                : '延长邮箱有效期12小时'
            }
          >
            <Clock className="h-4 w-4" />
            <span>{isExtending ? '延期中...' : '延长有效期'}</span>
          </button>
        </div>
      </div>
      
      {/* Statistics and Timer */}
      <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Expiry Timer */}
          <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
            <span className="text-gray-500 text-sm">剩余时间:</span>
            <ExpiryTimer expiresAt={expiresAt} />
          </div>
          
          {/* Mail Count */}
          <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
            <span className="text-gray-500 text-sm">邮件数量:</span>
            <span className="font-medium text-gray-900">{mailCount}</span>
          </div>
          
          {/* Extension Info */}
          <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
            <span className="text-gray-500 text-sm">延期次数:</span>
            <span className="font-medium text-gray-900">
              {extensionCount}/{maxExtensions}
            </span>
          </div>
        </div>
      </div>
      
      {/* Copy Success Message */}
      {copied && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>邮箱地址已复制到剪贴板</span>
          </p>
        </div>
      )}
    </div>
  );
};

// ExpiryTimer component to show remaining time
interface ExpiryTimerProps {
  expiresAt: string;
}

const ExpiryTimer: React.FC<ExpiryTimerProps> = ({ expiresAt }) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    isWarning: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false, isWarning: false });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining({
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          isWarning: false,
        });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const isWarning = diff <= 60 * 60 * 1000; // Warning when less than 1 hour

      setTimeRemaining({
        hours,
        minutes,
        seconds,
        isExpired: false,
        isWarning,
      });
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeRemaining.isExpired) {
    return (
      <span className="font-medium text-red-600 flex items-center space-x-1">
        <AlertTriangle className="h-4 w-4" />
        <span>已过期</span>
      </span>
    );
  }

  const timeColor = timeRemaining.isWarning ? 'text-orange-600' : 'text-green-600';

  return (
    <span className={`font-medium ${timeColor} flex items-center space-x-1`}>
      {timeRemaining.isWarning && <AlertTriangle className="h-4 w-4" />}
      <span>
        {timeRemaining.hours.toString().padStart(2, '0')}:
        {timeRemaining.minutes.toString().padStart(2, '0')}:
        {timeRemaining.seconds.toString().padStart(2, '0')}
      </span>
    </span>
  );
};

export default MailboxInfo;