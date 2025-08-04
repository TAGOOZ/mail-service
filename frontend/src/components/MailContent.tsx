import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Paperclip,
  Eye,
  EyeOff,
  Mail,
  Clock,
  User,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { Mail as MailType, Attachment } from '../lib/mailboxApi';
import DOMPurify from 'dompurify';

interface MailContentProps {
  mail: MailType;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onMarkAsRead?: () => void;
}

const MailContent: React.FC<MailContentProps> = ({
  mail,
  loading,
  error,
  onBack,
  onMarkAsRead,
}) => {
  const [showHtml, setShowHtml] = useState(false);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');

  // Sanitize HTML content when component mounts or mail changes
  useEffect(() => {
    if (mail.htmlContent) {
      const sanitized = DOMPurify.sanitize(mail.htmlContent, {
        // Strict whitelist of allowed tags
        ALLOWED_TAGS: [
          'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
          'table', 'thead', 'tbody', 'tr', 'td', 'th',
          'blockquote', 'pre', 'code', 'hr'
        ],
        // Strict whitelist of allowed attributes
        ALLOWED_ATTR: [
          'class', 'style', 'title', 'alt', 'width', 'height',
          'colspan', 'rowspan', 'align', 'valign'
        ],
        // Remove all URI schemes except safe ones
        ALLOWED_URI_REGEXP: /^(?:mailto:|tel:|#)/i,
        // Additional security options
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'iframe', 'frame', 'frameset'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
        // Remove all scripts and event handlers
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false,
        // Sanitize CSS
        SANITIZE_DOM: true,
        // Remove data attributes that could contain scripts
        FORBID_CONTENTS: ['script', 'style'],
        // Additional hooks for custom sanitization
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: null,
          attributeNameCheck: null,
          allowCustomizedBuiltInElements: false,
        },
      });
      setSanitizedHtml(sanitized);
    }
  }, [mail.htmlContent]);

  // Mark as read when component mounts if mail is unread
  useEffect(() => {
    if (!mail.isRead && onMarkAsRead) {
      onMarkAsRead();
    }
  }, [mail.isRead, onMarkAsRead]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const getAttachmentIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (contentType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (contentType.includes('text/')) {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    // In a real implementation, this would download the attachment
    // For now, we'll just log it
    console.log('Download attachment:', attachment.filename);
    // TODO: Implement actual download functionality
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载邮件内容...</p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors touch-manipulation active:scale-95 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm sm:text-base">返回邮件列表</span>
          </button>

          {mail.htmlContent && (
            <button
              onClick={() => setShowHtml(!showHtml)}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors touch-manipulation active:scale-95 self-start sm:self-auto"
            >
              {showHtml ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span className="text-sm sm:text-base">纯文本</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="text-sm sm:text-base">HTML视图</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Mail Header Info */}
        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
            {mail.subject || '(无主题)'}
          </h1>

          <div className="flex flex-col space-y-3 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 min-w-0">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">{mail.from}</span>
              </div>
              <div className="flex items-center space-x-2 min-w-0">
                <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-600 truncate text-sm sm:text-base">{mail.to}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{formatDate(mail.receivedAt)}</span>
            </div>
          </div>

          {/* Mail Status and Size */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-sm text-gray-500">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {!mail.isRead && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  新邮件
                </span>
              )}
              <span>大小: {formatSize(mail.size)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attachments */}
      {mail.attachments.length > 0 && (
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 mb-3">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-900 text-sm sm:text-base">
              附件 ({mail.attachments.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mail.attachments.map((attachment, index) => (
              <AttachmentItem
                key={index}
                attachment={attachment}
                onDownload={() => handleDownloadAttachment(attachment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mail Content */}
      <div className="p-4 sm:p-6">
        <div className="prose max-w-none">
          {showHtml && mail.htmlContent ? (
            <div
              className="mail-html-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              style={{
                lineHeight: '1.6',
                fontSize: '14px',
                color: '#374151',
                wordBreak: 'break-word',
              }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm sm:text-base break-words">
              {mail.textContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// AttachmentItem component
interface AttachmentItemProps {
  attachment: Attachment;
  onDownload: () => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onDownload,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const getAttachmentIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (contentType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (contentType.includes('text/')) {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
      <div className="flex-shrink-0">
        {getAttachmentIcon(attachment.contentType)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.filename}
        </p>
        <p className="text-xs text-gray-500">
          {formatSize(attachment.size)} • {attachment.contentType}
        </p>
      </div>

      <button
        onClick={onDownload}
        className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation active:scale-95 min-h-[36px] min-w-[36px]"
        title="下载附件"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
};

export default MailContent;