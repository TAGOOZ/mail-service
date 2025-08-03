import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useMails } from '../hooks/useMails';
import MailContent from '../components/MailContent';
import { Mail as MailType } from '../lib/mailboxApi';

const MailDetailPage: React.FC = () => {
  const { mailboxId, mailId } = useParams<{ mailboxId: string; mailId: string }>();
  const navigate = useNavigate();
  const { getMail, markAsRead } = useMails();
  
  const [mail, setMail] = useState<MailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMail = async () => {
      if (!mailboxId || !mailId) {
        setError('邮箱ID或邮件ID缺失');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const mailData = await getMail(mailboxId, mailId);
        setMail(mailData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载邮件失败';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadMail();
  }, [mailboxId, mailId, getMail]);

  const handleBack = () => {
    navigate(`/mailbox/${mailboxId}`);
  };

  const handleMarkAsRead = async () => {
    if (!mailboxId || !mailId || !mail || mail.isRead) return;

    try {
      await markAsRead(mailboxId, mailId);
      setMail(prev => prev ? { ...prev, isRead: true } : null);
    } catch (err) {
      console.error('Failed to mark mail as read:', err);
    }
  };

  // Show loading state
  if (loading && !mail) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载邮件内容...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">加载失败</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          返回邮件列表
        </button>
      </div>
    );
  }

  // Show not found if no mail
  if (!mail) {
    return (
      <div className="text-center py-12">
        <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">邮件未找到</h3>
        <p className="text-gray-400 mb-4">请检查链接是否正确</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          返回邮件列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <MailContent
        mail={mail}
        loading={loading}
        error={error}
        onBack={handleBack}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
};

export default MailDetailPage;