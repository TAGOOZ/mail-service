import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useMailbox } from '../hooks/useMailbox';
import { useMails } from '../hooks/useMails';
import MailboxInfo from '../components/MailboxInfo';
import MailList from '../components/MailList';

const MailboxPage: React.FC = () => {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const navigate = useNavigate();
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
    loadMails,
    hasMoreMails,
    loadMoreMails,
    deleteMail,
    deleteMultipleMails,
    markAsRead
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

      {/* Mail List Component */}
      <MailList
        mails={mails}
        loading={mailsLoading}
        error={mailsError}
        hasMore={hasMoreMails}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        onMailClick={handleMailClick}
        onDeleteMail={handleDeleteMail}
        onDeleteSelected={handleDeleteSelected}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
};

export default MailboxPage;