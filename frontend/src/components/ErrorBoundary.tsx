import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send error to monitoring service
      console.error('Error ID:', this.state.errorId, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  private handleGoHome = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center space-y-6 max-w-md w-full">
            <div className="space-y-4">
              <AlertCircle className="h-20 w-20 text-red-500 mx-auto" />
              <h1 className="text-3xl font-bold text-gray-900">应用程序错误</h1>
              <p className="text-gray-600">
                很抱歉，应用程序遇到了一个意外错误。您可以尝试刷新页面或返回首页。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                返回首页
              </button>
            </div>

            {this.state.errorId && (
              <div className="text-xs text-gray-500">
                错误ID: {this.state.errorId}
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  错误详情 (开发模式)
                </summary>
                <div className="mt-3 p-4 bg-gray-100 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    错误信息:
                  </div>
                  <div className="text-sm text-red-600 mb-3">
                    {this.state.error.message}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    堆栈跟踪:
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;