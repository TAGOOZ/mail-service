import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MailboxProvider } from '../../contexts/MailboxContext';
import MailList from '../../components/MailList';
import { Mail } from '../../lib/mailboxApi';

// Mock toast
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockMails: Mail[] = [
  {
    id: '1',
    mailboxId: 'test-mailbox',
    from: 'test@example.com',
    to: 'user@nnu.edu.kg',
    subject: 'Test Email',
    textContent: 'This is a test email',
    htmlContent: '<p>This is a test email</p>',
    attachments: [],
    receivedAt: new Date().toISOString(),
    isRead: false,
    size: 1024,
  },
];

describe('Real-time Mail Updates', () => {
  const defaultProps = {
    mails: mockMails,
    loading: false,
    error: null,
    hasMore: false,
    isConnected: true,
    onLoadMore: vi.fn(),
    onRefresh: vi.fn(),
    onMailClick: vi.fn(),
    onDeleteMail: vi.fn(),
    onDeleteSelected: vi.fn(),
    onMarkAsRead: vi.fn(),
    onMarkAsUnread: vi.fn(),
    onClearAllMails: vi.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MailboxProvider>{children}</MailboxProvider>
  );

  it('shows connection status when connected', () => {
    render(
      <MailList {...defaultProps} isConnected={true} />,
      { wrapper }
    );

    expect(screen.getByText('实时连接')).toBeInTheDocument();
  });

  it('shows disconnected status when not connected', () => {
    render(
      <MailList {...defaultProps} isConnected={false} />,
      { wrapper }
    );

    expect(screen.getByText('连接断开')).toBeInTheDocument();
  });

  it('displays new mail indicator for recently received mails', async () => {
    const recentMail: Mail = {
      ...mockMails[0],
      receivedAt: new Date().toISOString(), // Just received
    };

    render(
      <MailList {...defaultProps} mails={[recentMail]} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('刚收到')).toBeInTheDocument();
    });
  });

  it('shows real-time connection message when no mails and connected', () => {
    render(
      <MailList {...defaultProps} mails={[]} isConnected={true} />,
      { wrapper }
    );

    expect(screen.getByText('📡 实时连接已建立，等待新邮件...')).toBeInTheDocument();
  });

  it('does not show real-time message when disconnected', () => {
    render(
      <MailList {...defaultProps} mails={[]} isConnected={false} />,
      { wrapper }
    );

    expect(screen.queryByText('📡 实时连接已建立，等待新邮件...')).not.toBeInTheDocument();
  });
});