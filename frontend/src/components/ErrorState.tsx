import React from 'react';
import {
  AlertCircle,
  Wifi,
  RefreshCw,
  Home,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: 'error' | 'warning' | 'info';
  showRetry: boolean;
  showGoHome: boolean;
}

const getErrorConfig = (error: unknown): ErrorConfig => {
  // Parse error message and type
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Network errors
  if (errorString.includes('网络') || errorString.includes('network') || errorString.includes('连接')) {
    return {
      icon: <Wifi className="h-8 w-8 text-red-500" />,
      title: '网络连接失败',
      description: '请检查您的网络连接，然后重试',
      variant: 'error',
      showRetry: true,
      showGoHome: false,
    };
  }

  // Authentication errors
  if (errorString.includes('过期') || errorString.includes('权限') || errorString.includes('unauthorized')) {
    return {
      icon: <Clock className="h-8 w-8 text-blue-500" />,
      title: '会话已过期',
      description: '您的邮箱访问权限已过期，请重新生成邮箱',
      variant: 'info',
      showRetry: false,
      showGoHome: true,
    };
  }

  // Not found errors
  if (errorString.includes('不存在') || errorString.includes('not found')) {
    return {
      icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
      title: '资源不存在',
      description: '请求的邮箱或邮件不存在，可能已被删除',
      variant: 'warning',
      showRetry: false,
      showGoHome: true,
    };
  }

  // Rate limit errors
  if (errorString.includes('频繁') || errorString.includes('rate limit')) {
    return {
      icon: <Clock className="h-8 w-8 text-orange-500" />,
      title: '请求过于频繁',
      description: '请稍等片刻后再试',
      variant: 'warning',
      showRetry: true,
      showGoHome: false,
    };
  }

  // Server errors
  if (errorString.includes('服务器') || errorString.includes('server') || errorString.includes('500')) {
    return {
      icon: <AlertCircle className="h-8 w-8 text-red-500" />,
      title: '服务器错误',
      description: '服务器暂时不可用，请稍后重试',
      variant: 'error',
      showRetry: true,
      showGoHome: false,
    };
  }

  // Default error
  return {
    icon: <AlertCircle className="h-8 w-8 text-red-500" />,
    title: '操作失败',
    description: errorMessage || '发生了未知错误，请重试',
    variant: 'error',
    showRetry: true,
    showGoHome: false,
  };
};

const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onGoHome,
  className = '',
  size = 'medium',
  showDetails = false,
}) => {
  const config = getErrorConfig(error);

  const sizeClasses = {
    small: {
      container: 'p-4',
      icon: 'h-6 w-6',
      title: 'text-lg',
      description: 'text-sm',
      button: 'px-3 py-1.5 text-sm',
    },
    medium: {
      container: 'p-6',
      icon: 'h-8 w-8',
      title: 'text-xl',
      description: 'text-base',
      button: 'px-4 py-2 text-sm',
    },
    large: {
      container: 'p-8',
      icon: 'h-12 w-12',
      title: 'text-2xl',
      description: 'text-lg',
      button: 'px-6 py-3 text-base',
    },
  };

  const variantClasses = {
    error: 'bg-red-50 border-red-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const classes = sizeClasses[size];
  const variantClass = variantClasses[config.variant];

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      // Default behavior: clear storage and go home
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className={`rounded-lg border ${variantClass} ${classes.container} ${className}`}>
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {React.cloneElement(config.icon as React.ReactElement, {
            className: classes.icon,
          })}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className={`font-semibold text-gray-900 ${classes.title}`}>
            {config.title}
          </h3>
          <p className={`text-gray-600 ${classes.description}`}>
            {config.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {config.showRetry && onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center justify-center ${classes.button} bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium`}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </button>
          )}

          {config.showGoHome && (
            <button
              onClick={handleGoHome}
              className={`inline-flex items-center justify-center ${classes.button} bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium`}
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </button>
          )}
        </div>

        {/* Error Details (Development) */}
        {showDetails && process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details className="w-full mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              错误详情 (开发模式)
            </summary>
            <div className="mt-3 p-4 bg-gray-100 rounded-lg text-left">
              <div className="text-sm font-medium text-gray-700 mb-2">
                错误信息:
              </div>
              <div className="text-sm text-red-600 mb-3">
                {error.message}
              </div>
              {error.stack && (
                <>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    堆栈跟踪:
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorState;