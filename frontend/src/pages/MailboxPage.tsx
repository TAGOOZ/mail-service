import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { useMailbox } from '../hooks/useMailbox';
import { useMails } from '../hooks/useMails';
import MailboxInfo from '../components/MailboxInfo';

const MailboxPage: React.FC = () => {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const { 
    mailbox, 
    loading: mailboxLoading, 
    error: mailboxError, 
    loadMailbox, 
    extendMailbox
  } = useMailbox();
  const { 
    mails, 
    totalMails, 
    loading: mailsLoading, 
    error: mailsError, 
    loadMails 
  } = useMails();

  // Load mailbox and mails on mount
  useEffect(() => {
    if (mailboxId) {
      loadMailbox(mailboxId).then(() => {
        loadMails(mailboxId);
      }).catch(console.error);
    }
  }, [mailboxId, loadMailbox, loadMails]);

  const handleCopyAddress = () => {
    if (mailbox?.address) {
      navigator.clipboard.writeText(mailbox.address);
      // TODO: Show toast notification
    }
  };

  const handleRefresh = () => {
    if (mailboxId) {
      loadMails(mailboxId);
    }
  };

  const handleExtendExpiry = async () => {
    if (mailboxId) {
      try {
        await extendMailbox(mailboxId);
        // TODO: Show success toast
      } catch (error) {
        console.error('Failed to extend mailbox:', error);
      }
    }
  };

  // Show loading state
  if (mailboxLoading && !mailbox) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载邮箱信息...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (mailboxError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {mailboxError}
      </div>
    );
  }

  // Show not found if no mailbox
  if (!mailbox) {
    return (
      <div className="text-center py-12">
        <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">邮箱未找到</h3>
        <p className="text-gray-400">请检查链接是否正确或生成新的邮箱</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mailbox Info Component */}
      <MailboxInfo
        address={mailbox.address}
        expiresAt={mailbox.expiresAt}
        mailCount={totalMails}
        extensionCount={mailbox.extensionCount}
        maxExtensions={2} // Based on requirements
        onCopyAddress={handleCopyAddress}
        onExtendExpiry={handleExtendExpiry}
        isExtending={mailboxLoading}
      />

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={mailsLoading}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${mailsLoading ? 'animate-spin' : ''}`} />
          <span>刷新邮件</span>
        </button>
      </div>

      {/* Mail List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">收件箱</h2>
        
        {mailsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {mailsError}
          </div>
        )}
        
        {mails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">暂无邮件</h3>
            <p className="text-gray-400">
              发送到 {mailbox.address} 的邮件将会显示在这里
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mails.map((mail) => (
              <div key={mail.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-gray-900">{mail.from}</span>
                      {!mail.isRead && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          新邮件
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{mail.subject}</h4>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {mail.textContent.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(mail.receivedAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MailboxPage;