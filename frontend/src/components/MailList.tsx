import React, { useState, useCallback } from 'react';
import { Mail, Clock, Paperclip, CheckSquare, Square, Trash2, RefreshCw } from 'lucide-react';
import { Mail as MailType } from '../lib/mailboxApi';

interface MailListProps {
  mails: MailType[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onMailClick: (mailId: string) => void;
  onDeleteMail: (mailId: string) => void;
  onDeleteSelected: (mailIds: string[]) => void;
  onMarkAsRead: (mailId: string) => void;
}

const MailList: React.FC<MailListProps> = ({
  mails,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRefresh,
  onMailClick,
  onDeleteMail,
  onDeleteSelected,
  onMarkAsRead,
}) => {
  const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const handleSelectAll = useCallback(() => {
    if (selectedMails.size === mails.length) {
      setSelectedMails(new Set());
    } else {
      setSelectedMails(new Set(mails.map(mail => mail.id)));
    }
  }, [selectedMails.size, mails]);

  const handleSelectMail = useCallback((mailId: string) => {
    const newSelected = new Set(selectedMails);
    if (newSelected.has(mailId)) {
      newSelected.delete(mailId);
    } else {
      newSelected.add(mailId);
    }
    setSelectedMails(newSelected);
  }, [selectedMails]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedMails.size > 0) {
      onDeleteSelected(Array.from(selectedMails));
      setSelectedMails(new Set());
      setIsSelectionMode(false);
    }
  }, [selectedMails, onDeleteSelected]);

  const handleMailClick = useCallback((mail: MailType) => {
    if (isSelectionMode) {
      handleSelectMail(mail.id);
    } else {
      onMailClick(mail.id);
      if (!mail.isRead) {
        onMarkAsRead(mail.id);
      }
    }
  }, [isSelectionMode, handleSelectMail, onMailClick, onMarkAsRead]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedMails(new Set());
    }
  }, [isSelectionMode]);

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">收件箱</h2>
          <div className="flex items-center space-x-2">
            {mails.length > 0 && (
              <button
                onClick={toggleSelectionMode}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {isSelectionMode ? '取消选择' : '批量操作'}
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              title="刷新邮件"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Batch Operations */}
        {isSelectionMode && (
          <div className="mt-3 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-md">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-800"
              >
                {selectedMails.size === mails.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>
                  {selectedMails.size === mails.length ? '取消全选' : '全选'}
                </span>
              </button>
              {selectedMails.size > 0 && (
                <span className="text-sm text-gray-600">
                  已选择 {selectedMails.size} 封邮件
                </span>
              )}
            </div>
            {selectedMails.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>删除选中</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mail List */}
      <div className="divide-y divide-gray-200">
        {mails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">暂无邮件</h3>
            <p className="text-gray-400">新邮件将会显示在这里</p>
          </div>
        ) : (
          <>
            {mails.map((mail) => (
              <MailItem
                key={mail.id}
                mail={mail}
                isSelected={selectedMails.has(mail.id)}
                isSelectionMode={isSelectionMode}
                onClick={() => handleMailClick(mail)}
                onDelete={() => onDeleteMail(mail.id)}
              />
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 text-center border-t border-gray-200">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// MailItem component
interface MailItemProps {
  mail: MailType;
  isSelected: boolean;
  isSelectionMode: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const MailItem: React.FC<MailItemProps> = ({
  mail,
  isSelected,
  isSelectionMode,
  onClick,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      } ${!mail.isRead ? 'bg-blue-50/30' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="flex-shrink-0 pt-1">
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-blue-600" />
            ) : (
              <Square className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}

        {/* Mail Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`font-medium truncate ${
                mail.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'
              }`}>
                {mail.from}
              </span>
              {!mail.isRead && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex-shrink-0">
                  新邮件
                </span>
              )}
              {mail.attachments.length > 0 && (
                <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{formatDate(mail.receivedAt)}</span>
            </div>
          </div>

          <h4 className={`text-sm mb-1 truncate ${
            mail.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'
          }`}>
            {mail.subject || '(无主题)'}
          </h4>

          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {mail.textContent.substring(0, 150)}
            {mail.textContent.length > 150 ? '...' : ''}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              {mail.attachments.length > 0 && (
                <span>{mail.attachments.length} 个附件</span>
              )}
              <span>{formatSize(mail.size)}</span>
            </div>
            {!isSelectionMode && (
              <button
                onClick={handleDeleteClick}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="删除邮件"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailList;