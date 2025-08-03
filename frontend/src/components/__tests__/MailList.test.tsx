import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MailList from '../MailList';
import { Mail } from '../../lib/mailboxApi';

const mockMails: Mail[] = [
  {
    id: '1',
    mailboxId: 'mailbox-1',
    from: 'sender1@example.com',
    to: 'test@nnu.edu.kg',
    subject: 'Test Email 1',
    textContent: 'This is the content of the first test email.',
    htmlContent: '<p>This is the content of the first test email.</p>',
    attachments: [],
    receivedAt: new Date().toISOString(),
    isRead: false,
    size: 1024,
  },
  {
    id: '2',
    mailboxId: 'mailbox-1',
    from: 'sender2@example.com',
    to: 'test@nnu.edu.kg',
    subject: 'Test Email 2 with Attachment',
    textContent: 'This is the content of the second test email with attachment.',
    htmlContent: '<p>This is the content of the second test email with attachment.</p>',
    attachments: [
      {
        filename: 'document.pdf',
        contentType: 'application/pdf',
        size: 2048,
      },
    ],
    receivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    isRead: true,
    size: 3072,
  },
];

describe('MailList', () => {
  const defaultProps = {
    mails: mockMails,
    loading: false,
    error: null,
    hasMore: false,
    onLoadMore: vi.fn(),
    onRefresh: vi.fn(),
    onMailClick: vi.fn(),
    onDeleteMail: vi.fn(),
    onDeleteSelected: vi.fn(),
    onMarkAsRead: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mail list correctly', () => {
    render(<MailList {...defaultProps} />);
    
    expect(screen.getByText('收件箱')).toBeInTheDocument();
    expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    expect(screen.getByText('Test Email 2 with Attachment')).toBeInTheDocument();
    expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
    expect(screen.getByText('sender2@example.com')).toBeInTheDocument();
  });

  it('shows empty state when no mails', () => {
    const props = {
      ...defaultProps,
      mails: [],
    };
    
    render(<MailList {...props} />);
    
    expect(screen.getByText('暂无邮件')).toBeInTheDocument();
    expect(screen.getByText('新邮件将会显示在这里')).toBeInTheDocument();
  });

  it('shows error state when error exists', () => {
    const props = {
      ...defaultProps,
      error: 'Failed to load mails',
    };
    
    render(<MailList {...props} />);
    
    expect(screen.getByText('Failed to load mails')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    const refreshButton = screen.getByTitle('刷新邮件');
    fireEvent.click(refreshButton);
    
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onMailClick and onMarkAsRead when unread mail is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    const mailItem = screen.getByText('Test Email 1').closest('div[class*="cursor-pointer"]');
    fireEvent.click(mailItem!);
    
    expect(defaultProps.onMailClick).toHaveBeenCalledWith('1');
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('1');
  });

  it('calls onMailClick but not onMarkAsRead when read mail is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    const mailItem = screen.getByText('Test Email 2 with Attachment').closest('div[class*="cursor-pointer"]');
    fireEvent.click(mailItem!);
    
    expect(defaultProps.onMailClick).toHaveBeenCalledWith('2');
    expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled();
  });

  it('shows new mail badge for unread mails', () => {
    render(<MailList {...defaultProps} />);
    
    const newMailBadges = screen.getAllByText('新邮件');
    expect(newMailBadges).toHaveLength(1); // Only one unread mail
  });

  it('shows attachment icon for mails with attachments', () => {
    render(<MailList {...defaultProps} />);
    
    // Check for attachment count text
    expect(screen.getByText('1 个附件')).toBeInTheDocument();
  });

  it('enters selection mode when batch operation button is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    const batchButton = screen.getByText('批量操作');
    fireEvent.click(batchButton);
    
    expect(screen.getByText('取消选择')).toBeInTheDocument();
    expect(screen.getByText('全选')).toBeInTheDocument();
  });

  it('selects and deselects mails in selection mode', () => {
    render(<MailList {...defaultProps} />);
    
    // Enter selection mode
    const batchButton = screen.getByText('批量操作');
    fireEvent.click(batchButton);
    
    // Select first mail
    const firstMail = screen.getByText('Test Email 1').closest('div[class*="cursor-pointer"]');
    fireEvent.click(firstMail!);
    
    expect(screen.getByText('已选择 1 封邮件')).toBeInTheDocument();
    
    // Deselect first mail
    fireEvent.click(firstMail!);
    
    expect(screen.queryByText('已选择 1 封邮件')).not.toBeInTheDocument();
  });

  it('selects all mails when select all is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    // Enter selection mode
    const batchButton = screen.getByText('批量操作');
    fireEvent.click(batchButton);
    
    // Click select all
    const selectAllButton = screen.getByText('全选');
    fireEvent.click(selectAllButton);
    
    expect(screen.getByText('已选择 2 封邮件')).toBeInTheDocument();
    expect(screen.getByText('取消全选')).toBeInTheDocument();
  });

  it('calls onDeleteSelected when delete selected button is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    // Enter selection mode
    const batchButton = screen.getByText('批量操作');
    fireEvent.click(batchButton);
    
    // Select all mails
    const selectAllButton = screen.getByText('全选');
    fireEvent.click(selectAllButton);
    
    // Click delete selected
    const deleteButton = screen.getByText('删除选中');
    fireEvent.click(deleteButton);
    
    expect(defaultProps.onDeleteSelected).toHaveBeenCalledWith(['1', '2']);
  });

  it('calls onDeleteMail when individual delete button is clicked', () => {
    render(<MailList {...defaultProps} />);
    
    const deleteButtons = screen.getAllByTitle('删除邮件');
    fireEvent.click(deleteButtons[0]);
    
    expect(defaultProps.onDeleteMail).toHaveBeenCalledWith('1');
  });

  it('shows load more button when hasMore is true', () => {
    const props = {
      ...defaultProps,
      hasMore: true,
    };
    
    render(<MailList {...props} />);
    
    expect(screen.getByText('加载更多')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', () => {
    const props = {
      ...defaultProps,
      hasMore: true,
    };
    
    render(<MailList {...props} />);
    
    const loadMoreButton = screen.getByText('加载更多');
    fireEvent.click(loadMoreButton);
    
    expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on refresh button when loading', () => {
    const props = {
      ...defaultProps,
      loading: true,
    };
    
    render(<MailList {...props} />);
    
    const refreshButton = screen.getByTitle('刷新邮件');
    expect(refreshButton).toBeDisabled();
  });

  it('shows loading state on load more button when loading', () => {
    const props = {
      ...defaultProps,
      hasMore: true,
      loading: true,
    };
    
    render(<MailList {...props} />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('formats mail size correctly', () => {
    render(<MailList {...defaultProps} />);
    
    expect(screen.getByText('1KB')).toBeInTheDocument(); // 1024 bytes
    expect(screen.getByText('3KB')).toBeInTheDocument(); // 3072 bytes
  });

  it('shows subject placeholder for mails without subject', () => {
    const mailsWithoutSubject = [
      {
        ...mockMails[0],
        subject: '',
      },
    ];
    
    const props = {
      ...defaultProps,
      mails: mailsWithoutSubject,
    };
    
    render(<MailList {...props} />);
    
    expect(screen.getByText('(无主题)')).toBeInTheDocument();
  });

  it('truncates long mail content', () => {
    const longContentMail = [
      {
        ...mockMails[0],
        textContent: 'A'.repeat(200), // 200 characters
      },
    ];
    
    const props = {
      ...defaultProps,
      mails: longContentMail,
    };
    
    render(<MailList {...props} />);
    
    const content = screen.getByText(/A{150}\.\.\.$/);
    expect(content).toBeInTheDocument();
  });
});