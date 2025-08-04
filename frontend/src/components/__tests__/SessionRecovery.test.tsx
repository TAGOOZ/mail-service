import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SessionRecovery, SessionStatusIndicator } from '../SessionRecovery';
import { useAuth } from '../../hooks/useAuth';
import { useMailboxContext } from '../../contexts/MailboxContext';
import { mailboxApi } from '../../lib/mailboxApi';
import { useToast } from '../../contexts/ToastContext';

// Mock dependencies
jest.mock('../../hooks/useAuth');
jest.mock('../../contexts/MailboxContext');
jest.mock('../../lib/mailboxApi');
jest.mock('../../contexts/ToastContext');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseMailboxContext = useMailboxContext as jest.MockedFunction<typeof useMailboxContext>;
const mockMailboxApi = mailboxApi as jest.Mocked<typeof mailboxApi>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('SessionRecovery', () => {
  const mockLogin = jest.fn();
  const mockCheckSession = jest.fn();
  const mockDispatch = jest.fn();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      mailboxId: null,
      token: null,
      isTokenExpiring: false,
      tokenRemainingTime: 0,
      isRefreshing: false,
      login: mockLogin,
      logout: jest.fn(),
      refreshToken: jest.fn(),
      checkSession: mockCheckSession,
    });

    mockUseMailboxContext.mockReturnValue({
      state: {
        currentMailbox: null,
        mails: [],
        loading: false,
        error: null,
        isConnected: false,
        totalMails: 0,
        hasMoreMails: false,
      },
      dispatch: mockDispatch,
    });

    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      toasts: [],
      removeToast: jest.fn(),
    });

    jest.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('should show loading state during recovery', () => {
    mockCheckSession.mockReturnValue(true);
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'mailbox_token') return 'test-token';
      if (key === 'mailbox_id') return 'test-mailbox-id';
      return null;
    });

    renderWithRouter(
      <SessionRecovery>
        <div>App Content</div>
      </SessionRecovery>
    );

    expect(screen.getByText('正在恢复会话...')).toBeInTheDocument();
    expect(screen.getByText('正在检查您的邮箱会话状态')).toBeInTheDocument();
  });

  it('should recover session successfully', async () => {
    mockCheckSession.mockReturnValue(true);
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'mailbox_token') return 'test-token';
      if (key === 'mailbox_id') return 'test-mailbox-id';
      return null;
    });

    const mockMailbox = {
      id: 'test-mailbox-id',
      address: 'test@nnu.edu.kg',
      token: 'new-token',
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-01T24:00:00Z',
      extensionCount: 0,
      isActive: true,
      lastAccessAt: '2023-01-01T00:00:00Z',
    };

    mockMailboxApi.getMailbox.mockResolvedValue(mockMailbox);

    renderWithRouter(
      <SessionRecovery>
        <div>App Content</div>
      </SessionRecovery>
    );

    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });

    expect(mockMailboxApi.getMailbox).toHaveBeenCalledWith('test-mailbox-id');
    expect(mockLogin).toHaveBeenCalledWith('new-token', 'test-mailbox-id');
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_MAILBOX', payload: mockMailbox });
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'success',
      message: '会话已恢复',
    });
  });

  it('should handle recovery failure gracefully', async () => {
    mockCheckSession.mockReturnValue(true);
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'mailbox_token') return 'test-token';
      if (key === 'mailbox_id') return 'test-mailbox-id';
      return null;
    });

    mockMailboxApi.getMailbox.mockRejectedValue(new Error('Mailbox not found'));

    renderWithRouter(
      <SessionRecovery>
        <div>App Content</div>
      </SessionRecovery>
    );

    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mailbox_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mailbox_id');
    expect(mockShowToast).not.toHaveBeenCalled(); // Should fail silently
  });

  it('should skip recovery if no valid session', async () => {
    mockCheckSession.mockReturnValue(false);

    renderWithRouter(
      <SessionRecovery>
        <div>App Content</div>
      </SessionRecovery>
    );

    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });

    expect(mockMailboxApi.getMailbox).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('SessionStatusIndicator', () => {
  const mockUseAuthReturn = {
    isAuthenticated: false,
    mailboxId: null,
    token: null,
    isTokenExpiring: false,
    tokenRemainingTime: 0,
    isRefreshing: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    checkSession: jest.fn(),
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUseAuthReturn);
  });

  it('should not render when not authenticated', () => {
    const { container } = render(<SessionStatusIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should show valid session status', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuthReturn,
      isAuthenticated: true,
      tokenRemainingTime: 3600000, // 1 hour
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText('会话有效')).toBeInTheDocument();
    expect(screen.getByText('剩余: 1小时0分钟')).toBeInTheDocument();
  });

  it('should show expiring session status', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuthReturn,
      isAuthenticated: true,
      isTokenExpiring: true,
      tokenRemainingTime: 300000, // 5 minutes
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText('即将过期')).toBeInTheDocument();
    expect(screen.getByText('剩余: 5分钟')).toBeInTheDocument();
  });

  it('should show refreshing status', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuthReturn,
      isAuthenticated: true,
      isRefreshing: true,
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText('正在续期...')).toBeInTheDocument();
  });

  it('should format remaining time correctly', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuthReturn,
      isAuthenticated: true,
      tokenRemainingTime: 90000, // 1.5 minutes
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText('剩余: 1分钟')).toBeInTheDocument();
  });

  it('should show less than 1 minute for very short time', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuthReturn,
      isAuthenticated: true,
      tokenRemainingTime: 30000, // 30 seconds
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText('剩余: 不到1分钟')).toBeInTheDocument();
  });
});