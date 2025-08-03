import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useMailbox } from '../hooks/useMailbox';
import { useMails } from '../hooks/useMails';
import { useWebSocket } from '../hooks/useWebSocket';
import MailboxInfo from '../components/MailboxInfo';
import MailList from '../components/MailList';
import ActionButtons from '../components/ActionButtons';

const MailboxPage: React.FC = () => {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { 
    mailbox, 
    loading: mailboxLoading, 
    error: mailboxError, 
    loadMailbox, 
    extendMailbox,
    generateMailbox
  } = useMailbox();
  
  const { requestNotificationPermission, isConnected } = useWebSocket();
  const { 
    mails, 
    totalMails, 
    loading: mailsLoading, 
    error: mailsError, 
    loadMails,
    hasMoreMails,
    loadMoreMails,
    deleteMail,
    deleteMultipleMails,
    markAsRead,
    markAsUnread,
    clearAllMails
  } = useMails();

  // Load mailbox and mails on mount
  useEffect(() => {
    if (mailboxId) {
      loadMailbox(mailboxId).then(() => {
        loadMails(mailboxId);
      }).catch(console.error);
    }
  }, [mailboxId, loadMailbox, loadMails]);

  // Request notification permission when mailbox is loaded
  useEffect(() => {
    if (mailbox) {
      requestNotificationPermission();
    }
  }, [mailbox, requestNotificationPermission]);

  const handleCopyAddress = () => {
    if (mailbox?.address) {
      navigator.clipboard.writeText(mailbox.address);
      // TODO: Show toast notification
    }
  };

  const handleRefresh = async () => {
    if (mailboxId) {
      setIsRefreshing(true);
      try {
        await loadMails(mailboxId);
      } catch (error) {
        console.error('Failed to refresh mails:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (mailboxId) {
      loadMoreMails(mailboxId);
    }
  };

  const handleMailClick = (mailId: string) => {
    // Navigate to mail detail page or open modal
    navigate(`/mailbox/${mailboxId}/mail/${mailId}`);
  };

  const handleDeleteMail = async (mailId: string) => {
    if (mailboxId) {
      try {
        await deleteMail(mailboxId, mailId);
      } catch (error) {
        console.error('Failed to delete mail:', error);
      }
    }
  };

  const handleDeleteSelected = async (mailIds: string[]) => {
    if (mailboxId) {
      try {
        await deleteMultipleMails(mailboxId, mailIds);
      } catch (error) {
        console.error('Failed to delete mails:', error);
      }
    }
  };

  const handleMarkAsRead = async (mailId: string) => {
    if (mailboxId) {
      try {
        await markAsRead(mailboxId, mailId);
      } catch (error) {
        console.error('Failed to mark mail as read:', error);
      }
    }
  };

  const handleMarkAsUnread = async (mailId: string) => {
    if (mailboxId) {
      try {
        await markAsUnread(mailboxId, mailId);
      } catch (error) {
        console.error('Failed to mark mail as unread:', error);
      }
    }
  };

  const handleClearAllMailsFromList = async () => {
    await handleClearAllMails();
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

  const handleGenerateNew = async () => {
    try {
      await generateMailbox();
      // Navigation is handled in the generateMailbox function
    } catch (error) {
      console.error('Failed to generate new mailbox:', error);
    }
  };

  const handleClearAllMails = async () => {
    if (mailboxId) {
      await clearAllMails(mailboxId);
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

  const canExtend = mailbox ? mailbox.extensionCount < 2 : false;

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

      {/* Action Buttons Component */}
      <ActionButtons
        mailboxId={mailboxId!}
        canExtend={canExtend}
        isExtending={mailboxLoading}
        isRefreshing={isRefreshing}
        mailCount={totalMails}
        onGenerateNew={handleGenerateNew}
        onExtendExpiry={handleExtendExpiry}
        onRefreshMails={handleRefresh}
        onClearAllMails={handleClearAllMails}
      />

      {/* Mail List Component */}
      <MailList
        mails={mails}
        loading={mailsLoading}
        error={mailsError}
        hasMore={hasMoreMails}
        isConnected={isConnected}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        onMailClick={handleMailClick}
        onDeleteMail={handleDeleteMail}
        onDeleteSelected={handleDeleteSelected}
        onMarkAsRead={handleMarkAsRead}
        onMarkAsUnread={handleMarkAsUnread}
        onClearAllMails={handleClearAllMailsFromList}
      />
    </div>
  );
};

export default MailboxPage;