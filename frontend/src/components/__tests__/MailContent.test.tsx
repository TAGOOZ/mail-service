import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MailContent from '../MailContent';
import { Mail } from '../../lib/mailboxApi';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html), // Return the HTML as-is for testing
  },
}));

const mockMail: Mail = {
  id: '1',
  mailboxId: 'mailbox-1',
  from: 'sender@example.com',
  to: 'test@nnu.edu.kg',
  subject: 'Test Email Subject',
  textContent: 'This is the plain text content of the email.\nIt has multiple lines.',
  htmlContent: '<p>This is the <strong>HTML</strong> content of the email.</p>',
  attachments: [
    {
      filename: 'document.pdf',
      contentType: 'application/pdf',
      size: 2048,
    },
    {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
      size: 1024,
    },
  ],
  receivedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
  isRead: false,
  size: 3072,
};

describe('MailContent', () => {
  const defaultProps = {
    mail: mockMail,
    loading: false,
    error: null,
    onBack: vi.fn(),
    onMarkAsRead: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mail content correctly', () => {
    render(<MailContent {...defaultProps} />);
    
    expect(screen.getByText('Test Email Subject')).toBeInTheDocument();
    expect(screen.getByText('sender@example.com')).toBeInTheDocument();
    expect(screen.getByText('test@nnu.edu.kg')).toBeInTheDocument();
    expect(screen.getByText(/This is the plain text content/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const props = {
      ...defaultProps,
      loading: true,
    };
    
    render(<MailContent {...props} />);
    
    expect(screen.getByText('加载邮件内容...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const props = {
      ...defaultProps,
      error: 'Failed to load mail',
    };
    
    render(<MailContent {...props} />);
    
    expect(screen.getByText('Failed to load mail')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<MailContent {...defaultProps} />);
    
    const backButton = screen.getByText('返回邮件列表');
    fireEvent.click(backButton);
    
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkAsRead for unread mail', () => {
    render(<MailContent {...defaultProps} />);
    
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledTimes(1);
  });

  it('does not call onMarkAsRead for read mail', () => {
    const props = {
      ...defaultProps,
      mail: { ...mockMail, isRead: true },
    };
    
    render(<MailContent {...props} />);
    
    expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled();
  });

  it('shows new mail badge for unread mail', () => {
    render(<MailContent {...defaultProps} />);
    
    expect(screen.getByText('新邮件')).toBeInTheDocument();
  });

  it('does not show new mail badge for read mail', () => {
    const props = {
      ...defaultProps,
      mail: { ...mockMail, isRead: true },
    };
    
    render(<MailContent {...props} />);
    
    expect(screen.queryByText('新邮件')).not.toBeInTheDocument();
  });

  it('displays attachments correctly', () => {
    render(<MailContent {...defaultProps} />);
    
    expect(screen.getByText('附件 (2)')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
    expect(screen.getByText('2KB • application/pdf')).toBeInTheDocument();
    expect(screen.getByText('1KB • image/jpeg')).toBeInTheDocument();
  });

  it('does not show attachments section when no attachments', () => {
    const props = {
      ...defaultProps,
      mail: { ...mockMail, attachments: [] },
    };
    
    render(<MailContent {...props} />);
    
    expect(screen.queryByText(/附件/)).not.toBeInTheDocument();
  });

  it('toggles between text and HTML view', () => {
    render(<MailContent {...defaultProps} />);
    
    // Initially shows text content
    expect(screen.getByText(/This is the plain text content/)).toBeInTheDocument();
    
    // Click HTML view button
    const htmlButton = screen.getByText('HTML视图');
    fireEvent.click(htmlButton);
    
    // Should show HTML content
    expect(screen.getByText(/This is the/)).toBeInTheDocument();
    expect(screen.getByText('纯文本')).toBeInTheDocument();
    
    // Click back to text view
    const textButton = screen.getByText('纯文本');
    fireEvent.click(textButton);
    
    // Should show text content again
    expect(screen.getByText(/This is the plain text content/)).toBeInTheDocument();
    expect(screen.getByText('HTML视图')).toBeInTheDocument();
  });

  it('does not show HTML toggle when no HTML content', () => {
    const props = {
      ...defaultProps,
      mail: { ...mockMail, htmlContent: undefined },
    };
    
    render(<MailContent {...props} />);
    
    expect(screen.queryByText('HTML视图')).not.toBeInTheDocument();
    expect(screen.queryByText('纯文本')).not.toBeInTheDocument();
  });

  it('shows subject placeholder when no subject', () => {
    const props = {
      ...defaultProps,
      mail: { ...mockMail, subject: '' },
    };
    
    render(<MailContent {...props} />);
    
    expect(screen.getByText('(无主题)')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<MailContent {...defaultProps} />);
    
    // Should show formatted date (exact format may vary by locale)
    expect(screen.getByText(/2024.*1.*15/)).toBeInTheDocument();
  });

  it('formats mail size correctly', () => {
    render(<MailContent {...defaultProps} />);
    
    expect(screen.getByText('大小: 3KB')).toBeInTheDocument();
  });

  it('handles download attachment click', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<MailContent {...defaultProps} />);
    
    const downloadButtons = screen.getAllByTitle('下载附件');
    fireEvent.click(downloadButtons[0]);
    
    expect(consoleSpy).toHaveBeenCalledWith('Download attachment:', 'document.pdf');
    
    consoleSpy.mockRestore();
  });

  it('preserves text formatting with whitespace', () => {
    render(<MailContent {...defaultProps} />);
    
    const textContent = screen.getByText(/This is the plain text content/);
    expect(textContent).toHaveClass('whitespace-pre-wrap');
  });

  it('shows correct attachment icons', () => {
    render(<MailContent {...defaultProps} />);
    
    // Should have icons for different file types
    const attachmentItems = screen.getAllByTitle('下载附件');
    expect(attachmentItems).toHaveLength(2);
  });

  it('handles responsive layout', () => {
    const { container } = render(<MailContent {...defaultProps} />);
    
    // Check for responsive classes
    expect(container.querySelector('.sm\\:flex-row')).toBeInTheDocument();
    expect(container.querySelector('.sm\\:grid-cols-2')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();
  });

  it('applies proper styling to HTML content', () => {
    render(<MailContent {...defaultProps} />);
    
    // Switch to HTML view
    const htmlButton = screen.getByText('HTML视图');
    fireEvent.click(htmlButton);
    
    const htmlContent = document.querySelector('.mail-html-content');
    expect(htmlContent).toBeInTheDocument();
    expect(htmlContent).toHaveStyle({
      lineHeight: '1.6',
      fontSize: '14px',
      color: '#374151',
    });
  });
});