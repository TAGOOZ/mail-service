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
    onMarkAsUnread: vi.fn(),
    onClearAllMails: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mail list correctly', () => {
    render(<MailList {...defaultProps} />);
    
    expect(screen.getByText('收件箱 (2)')).toBeInTheDocument();
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
    // Create a mail that was just received (within 10 seconds)
    const newMail = {
      ...mockMails[0],
      receivedAt: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
      isRead: false,
    };
    
    const propsWithNewMail = {
      ...defaultProps,
      mails: [newMail, mockMails[1]],
    };
    
    render(<MailList {...propsWithNewMail} />);
    
    // Should show "刚收到" for the new mail
    expect(screen.getByText('刚收到')).toBeInTheDocument();
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

  describe('Search and Filter Functionality', () => {
    it('shows search input when mails exist', () => {
      render(<MailList {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('搜索邮件 (发件人、主题、内容)')).toBeInTheDocument();
    });

    it('filters mails by search query', () => {
      render(<MailList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('搜索邮件 (发件人、主题、内容)');
      fireEvent.change(searchInput, { target: { value: 'sender1' } });
      
      expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Email 2 with Attachment')).not.toBeInTheDocument();
    });

    it('shows clear search button when search query exists', () => {
      render(<MailList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('搜索邮件 (发件人、主题、内容)');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Find the clear button by looking for the X icon within the search input container
      const clearButton = searchInput.parentElement?.querySelector('button');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', () => {
      render(<MailList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('搜索邮件 (发件人、主题、内容)');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Find the clear button by looking for the X icon within the search input container
      const clearButton = searchInput.parentElement?.querySelector('button');
      fireEvent.click(clearButton!);
      
      expect(searchInput).toHaveValue('');
    });

    it('shows filter buttons when filter toggle is clicked', () => {
      render(<MailList {...defaultProps} />);
      
      const filterButton = screen.getByTitle('筛选邮件');
      fireEvent.click(filterButton);
      
      expect(screen.getByText('全部 (2)')).toBeInTheDocument();
      expect(screen.getByText('未读 (1)')).toBeInTheDocument();
      expect(screen.getByText('已读 (1)')).toBeInTheDocument();
      expect(screen.getByText('有附件 (1)')).toBeInTheDocument();
    });

    it('filters mails by unread status', () => {
      render(<MailList {...defaultProps} />);
      
      const filterButton = screen.getByTitle('筛选邮件');
      fireEvent.click(filterButton);
      
      const unreadFilter = screen.getByText('未读 (1)');
      fireEvent.click(unreadFilter);
      
      expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Email 2 with Attachment')).not.toBeInTheDocument();
    });

    it('shows no results message when search returns no matches', () => {
      render(<MailList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('搜索邮件 (发件人、主题、内容)');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      expect(screen.getByText('未找到匹配的邮件')).toBeInTheDocument();
      expect(screen.getByText('尝试使用不同的搜索关键词')).toBeInTheDocument();
    });
  });

  describe('Clear All Mails Functionality', () => {
    it('shows clear all button when mails exist', () => {
      render(<MailList {...defaultProps} />);
      
      expect(screen.getByText('清空邮箱')).toBeInTheDocument();
    });

    it('shows confirmation dialog when clear all is clicked', () => {
      render(<MailList {...defaultProps} />);
      
      const clearButton = screen.getByText('清空邮箱');
      fireEvent.click(clearButton);
      
      expect(screen.getByRole('heading', { name: '清空邮箱' })).toBeInTheDocument();
      expect(screen.getByText('您确定要删除所有 2 封邮件吗？此操作无法撤销。')).toBeInTheDocument();
    });

    it('calls onClearAllMails when confirmed', () => {
      render(<MailList {...defaultProps} />);
      
      const clearButton = screen.getByText('清空邮箱');
      fireEvent.click(clearButton);
      
      const confirmButton = screen.getByText('确认清空');
      fireEvent.click(confirmButton);
      
      expect(defaultProps.onClearAllMails).toHaveBeenCalledTimes(1);
    });

    it('closes dialog when cancelled', () => {
      render(<MailList {...defaultProps} />);
      
      const clearButton = screen.getByText('清空邮箱');
      fireEvent.click(clearButton);
      
      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('确认清空')).not.toBeInTheDocument();
    });
  });

  describe('Mark as Read/Unread Functionality', () => {
    it('shows mark as read button for unread mails', () => {
      render(<MailList {...defaultProps} />);
      
      const markAsReadButtons = screen.getAllByTitle('标记为已读');
      expect(markAsReadButtons).toHaveLength(1); // Only one unread mail
    });

    it('shows mark as unread button for read mails', () => {
      render(<MailList {...defaultProps} />);
      
      const markAsUnreadButtons = screen.getAllByTitle('标记为未读');
      expect(markAsUnreadButtons).toHaveLength(1); // Only one read mail
    });

    it('calls onMarkAsRead when mark as read button is clicked', () => {
      render(<MailList {...defaultProps} />);
      
      const markAsReadButton = screen.getByTitle('标记为已读');
      fireEvent.click(markAsReadButton);
      
      expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('calls onMarkAsUnread when mark as unread button is clicked', () => {
      render(<MailList {...defaultProps} />);
      
      const markAsUnreadButton = screen.getByTitle('标记为未读');
      fireEvent.click(markAsUnreadButton);
      
      expect(defaultProps.onMarkAsUnread).toHaveBeenCalledWith('2');
    });
  });

  describe('Mail Count Display', () => {
    it('shows correct mail count in header', () => {
      render(<MailList {...defaultProps} />);
      
      expect(screen.getByText('收件箱 (2)')).toBeInTheDocument();
    });

    it('updates mail count when filtered', () => {
      render(<MailList {...defaultProps} />);
      
      const filterButton = screen.getByTitle('筛选邮件');
      fireEvent.click(filterButton);
      
      const unreadFilter = screen.getByText('未读 (1)');
      fireEvent.click(unreadFilter);
      
      expect(screen.getByText('收件箱 (1)')).toBeInTheDocument();
    });
  });
});