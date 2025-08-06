import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType, ToastContainer } from '../components/Toast';

interface ToastContextType {
  showToast: (
    type: ToastType,
    title: string,
    message?: string,
    options?: {
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string, options?: { action?: { label: string; onClick: () => void } }) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    options?: {
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    // Ensure we don't show toasts with empty titles
    const cleanTitle = (title && title.trim()) || '通知';
    const cleanMessage = message && message.trim() ? message : undefined;

    const id = generateId();
    const duration = options?.duration ?? (type === 'error' ? 0 : 5000); // Error toasts don't auto-dismiss

    const newToast: Toast = {
      id,
      type,
      title: cleanTitle,
      message: cleanMessage,
      duration,
      action: options?.action,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration (if duration > 0)
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    const cleanTitle = (title && title.trim()) || '操作成功';
    const cleanMessage = message && message.trim() ? message : undefined;
    showToast('success', cleanTitle, cleanMessage);
  }, [showToast]);

  const showError = useCallback((
    title: string,
    message?: string,
    options?: { action?: { label: string; onClick: () => void } }
  ) => {
    // Ensure we don't show empty messages
    const cleanTitle = (title && title.trim()) || '操作失败';
    const cleanMessage = message && message.trim() ? message : undefined;
    showToast('error', cleanTitle, cleanMessage, { duration: 0, action: options?.action });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    const cleanTitle = (title && title.trim()) || '警告';
    const cleanMessage = message && message.trim() ? message : undefined;
    showToast('warning', cleanTitle, cleanMessage);
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    const cleanTitle = (title && title.trim()) || '提示';
    const cleanMessage = message && message.trim() ? message : undefined;
    showToast('info', cleanTitle, cleanMessage);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeToast,
        clearAllToasts,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};