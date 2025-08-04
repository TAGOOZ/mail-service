import React, { useState, useCallback, useMemo } from 'react';
import { 
  Mail, 
  Clock, 
  Paperclip, 
  CheckSquare, 
  Square, 
  Trash2, 
  RefreshCw, 
  Search,
  Filter,
  X,
  AlertTriangle,
  MailOpen,
  MailX
} from 'lucide-react';
import { Mail as MailType } from '../lib/mailboxApi';
import ConnectionStatus from './ConnectionStatus';

interface MailListProps {
  mails: MailType[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isConnected?: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onMailClick: (mailId: string) => void;
  onDeleteMail: (mailId: string) => void;
  onDeleteSelected: (mailIds: string[]) => void;
  onMarkAsRead: (mailId: string) => void;
  onMarkAsUnread: (mailId: string) => void;
  onClearAllMails: () => void;
}

type FilterType = 'all' | 'unread' | 'read' | 'attachments';

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

const MailList: React.FC<MailListProps> = ({
  mails,
  loading,
  error,
  hasMore,
  isConnected = false,
  onLoadMore,
  onRefresh,
  onMailClick,
  onDeleteMail,
  onDeleteSelected,
  onMarkAsRead,
  onMarkAsUnread,
  onClearAllMails,
}) => {
  const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search mails
  const filteredMails = useMemo(() => {
    let filtered = mails;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(mail => 
        mail.from.toLowerCase().includes(query) ||
        mail.subject.toLowerCase().includes(query) ||
        mail.textContent.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'unread':
        filtered = filtered.filter(mail => !mail.isRead);
        break;
      case 'read':
        filtered = filtered.filter(mail => mail.isRead);
        break;
      case 'attachments':
        filtered = filtered.filter(mail => mail.attachments.length > 0);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    return filtered;
  }, [mails, searchQuery, filterType]);

  const handleSelectAll = useCallback(() => {
    if (selectedMails.size === filteredMails.length) {
      setSelectedMails(new Set());
    } else {
      setSelectedMails(new Set(filteredMails.map(mail => mail.id)));
    }
  }, [selectedMails.size, filteredMails]);

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

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleClearAllMails = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleConfirmClearAll = useCallback(() => {
    setShowClearConfirm(false);
    onClearAllMails();
  }, [onClearAllMails]);

  const getFilterCount = useCallback((type: FilterType) => {
    switch (type) {
      case 'unread':
        return mails.filter(mail => !mail.isRead).length;
      case 'read':
        return mails.filter(mail => mail.isRead).length;
      case 'attachments':
        return mails.filter(mail => mail.attachments.length > 0).length;
      default:
        return mails.length;
    }
  }, [mails]);

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
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              收件箱 ({filteredMails.length})
            </h2>
            {/* Connection Status Indicator */}
            <ConnectionStatus isConnected={isConnected} />
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {mails.length > 0 && (
              <>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors touch-manipulation active:scale-95 min-h-[40px] min-w-[40px]"
                  title="筛选邮件"
                >
                  <Filter className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleSelectionMode}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors touch-manipulation active:scale-95 min-h-[32px]"
                >
                  {isSelectionMode ? '取消选择' : '批量操作'}
                </button>
                <button
                  onClick={handleClearAllMails}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors touch-manipulation active:scale-95 min-h-[32px]"
                  title="清空所有邮件"
                >
                  清空邮箱
                </button>
              </>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 touch-manipulation active:scale-95 min-h-[40px] min-w-[40px]"
              title="刷新邮件"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {mails.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索邮件 (发件人、主题、内容)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 sm:py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation active:scale-95"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        {showFilters && mails.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {[
                { key: 'all' as FilterType, label: '全部', count: getFilterCount('all') },
                { key: 'unread' as FilterType, label: '未读', count: getFilterCount('unread') },
                { key: 'read' as FilterType, label: '已读', count: getFilterCount('read') },
                { key: 'attachments' as FilterType, label: '有附件', count: getFilterCount('attachments') },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors touch-manipulation active:scale-95 min-h-[36px] ${
                    filterType === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Batch Operations */}
        {isSelectionMode && (
          <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-md">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-800"
              >
                {selectedMails.size === filteredMails.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>
                  {selectedMails.size === filteredMails.length ? '取消全选' : '全选'}
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
            <p className="text-gray-400">
              新邮件将会显示在这里
              {isConnected && (
                <span className="block mt-2 text-green-600 text-sm">
                  📡 实时连接已建立，等待新邮件...
                </span>
              )}
            </p>
          </div>
        ) : filteredMails.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">未找到匹配的邮件</h3>
            <p className="text-gray-400">
              {searchQuery ? '尝试使用不同的搜索关键词' : '尝试更改筛选条件'}
            </p>
          </div>
        ) : (
          <>
            {filteredMails.map((mail) => (
              <MailItem
                key={mail.id}
                mail={mail}
                isSelected={selectedMails.has(mail.id)}
                isSelectionMode={isSelectionMode}
                onClick={() => handleMailClick(mail)}
                onDelete={() => onDeleteMail(mail.id)}
                onMarkAsRead={() => onMarkAsRead(mail.id)}
                onMarkAsUnread={() => onMarkAsUnread(mail.id)}
              />
            ))}
            
            {/* Load More Button */}
            {hasMore && !searchQuery && filterType === 'all' && (
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

      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="清空邮箱"
        message={`您确定要删除所有 ${mails.length} 封邮件吗？此操作无法撤销。`}
        confirmText="确认清空"
        cancelText="取消"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
        variant="danger"
      />
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
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
}

const MailItem: React.FC<MailItemProps> = ({
  mail,
  isSelected,
  isSelectionMode,
  onClick,
  onDelete,
  onMarkAsRead,
  onMarkAsUnread,
}) => {
  const [isNewMail, setIsNewMail] = React.useState(false);

  // Check if this is a new mail (received in the last 10 seconds)
  React.useEffect(() => {
    const receivedTime = new Date(mail.receivedAt).getTime();
    const now = Date.now();
    const timeDiff = now - receivedTime;
    
    if (timeDiff < 10000) { // 10 seconds
      setIsNewMail(true);
      // Remove the "new" indicator after 30 seconds
      const timer = setTimeout(() => {
        setIsNewMail(false);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [mail.receivedAt]);
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

  const handleMarkAsReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mail.isRead) {
      onMarkAsUnread();
    } else {
      onMarkAsRead();
    }
  };

  return (
    <div
      className={`p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-all duration-300 touch-manipulation ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      } ${!mail.isRead ? 'bg-blue-50/30' : ''} ${
        isNewMail ? 'bg-green-50 border-l-4 border-l-green-500 animate-pulse' : ''
      }`}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className={`font-medium truncate ${
                mail.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'
              }`}>
                {mail.from}
              </span>
              {isNewMail && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex-shrink-0 animate-bounce">
                  刚收到
                </span>
              )}
              {!mail.isRead && !isNewMail && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex-shrink-0">
                  未读
                </span>
              )}
              {mail.attachments.length > 0 && (
                <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 flex-shrink-0">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
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
            <div className="flex items-center space-x-3 sm:space-x-4">
              {mail.attachments.length > 0 && (
                <span>{mail.attachments.length} 个附件</span>
              )}
              <span>{formatSize(mail.size)}</span>
            </div>
            {!isSelectionMode && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleMarkAsReadClick}
                  className="p-2 sm:p-1 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation active:scale-95 min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0"
                  title={mail.isRead ? '标记为未读' : '标记为已读'}
                >
                  {mail.isRead ? (
                    <MailX className="h-4 w-4" />
                  ) : (
                    <MailOpen className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="p-2 sm:p-1 text-gray-400 hover:text-red-600 transition-colors touch-manipulation active:scale-95 min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0"
                  title="删除邮件"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailList;