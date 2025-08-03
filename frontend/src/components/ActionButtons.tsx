import React, { useState } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Clock, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

interface ActionButtonsProps {
  mailboxId: string;
  canExtend: boolean;
  isExtending: boolean;
  isRefreshing: boolean;
  mailCount: number;
  onGenerateNew: () => void;
  onExtendExpiry: () => void;
  onRefreshMails: () => void;
  onClearAllMails: () => void;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 className="h-6 w-6 text-red-600" />,
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
      iconBg: 'bg-red-100'
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white',
      iconBg: 'bg-orange-100'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-full ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex space-x-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${styles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  mailboxId,
  canExtend,
  isExtending,
  isRefreshing,
  mailCount,
  onGenerateNew,
  onExtendExpiry,
  onRefreshMails,
  onClearAllMails,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleGenerateNew = () => {
    setShowGenerateConfirm(true);
  };

  const handleConfirmGenerate = () => {
    setShowGenerateConfirm(false);
    onGenerateNew();
  };

  const handleClearAll = () => {
    if (mailCount === 0) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    setShowClearConfirm(false);
    
    try {
      await onClearAllMails();
    } catch (error) {
      console.error('Failed to clear mails:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Generate New Mailbox */}
          <button
            onClick={handleGenerateNew}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            title="生成新的临时邮箱"
          >
            <Plus className="h-4 w-4" />
            <span>生成新邮箱</span>
          </button>

          {/* Extend Expiry */}
          <button
            onClick={onExtendExpiry}
            disabled={!canExtend || isExtending}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              canExtend && !isExtending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={
              !canExtend 
                ? '已达到最大延期次数'
                : '延长邮箱有效期12小时'
            }
          >
            <Clock className="h-4 w-4" />
            <span>{isExtending ? '延期中...' : '延长有效期'}</span>
          </button>

          {/* Refresh Mails */}
          <button
            onClick={onRefreshMails}
            disabled={isRefreshing}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors font-medium"
            title="手动刷新邮件列表"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? '刷新中...' : '刷新邮件'}</span>
          </button>

          {/* Clear All Mails */}
          <button
            onClick={handleClearAll}
            disabled={mailCount === 0 || isClearing}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              mailCount > 0 && !isClearing
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={mailCount === 0 ? '没有邮件可清空' : '清空所有邮件'}
          >
            <Trash2 className="h-4 w-4" />
            <span>{isClearing ? '清空中...' : '清空邮箱'}</span>
          </button>
        </div>

        {/* Action Status Messages */}
        <div className="mt-3 space-y-2">
          {isExtending && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>正在延长邮箱有效期...</span>
            </div>
          )}
          
          {isRefreshing && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
              <span>正在刷新邮件列表...</span>
            </div>
          )}
          
          {isClearing && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
              <span>正在清空邮箱...</span>
            </div>
          )}
        </div>
      </div>

      {/* Generate New Mailbox Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showGenerateConfirm}
        title="生成新邮箱"
        message="生成新邮箱将会丢失当前邮箱及其所有邮件。您确定要继续吗？"
        confirmText="确认生成"
        cancelText="取消"
        onConfirm={handleConfirmGenerate}
        onCancel={() => setShowGenerateConfirm(false)}
        variant="warning"
      />

      {/* Clear All Mails Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="清空邮箱"
        message={`您确定要删除所有 ${mailCount} 封邮件吗？此操作无法撤销。`}
        confirmText="确认清空"
        cancelText="取消"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
        variant="danger"
      />
    </>
  );
};

export default ActionButtons;