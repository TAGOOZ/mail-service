import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWebSocket } from '../useWebSocket';
import websocketService, {
  ConnectionStatus,
} from '../../services/websocketService';
import { useMailboxContext } from '../../contexts/MailboxContext';
import { useMails } from '../useMails';

// Mock dependencies
vi.mock('../../services/websocketService');
vi.mock('../../contexts/MailboxContext');
vi.mock('../useMails');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockWebsocketService = websocketService as any;
const mockUseMailboxContext = useMailboxContext as any;
const mockUseMails = useMails as any;

describe('useWebSocket', () => {
  const mockDispatch = vi.fn();
  const mockAddNewMail = vi.fn();

  const mockMailbox = {
    id: 'test-mailbox-id',
    address: 'test@nnu.edu.kg',
    token: 'test-token',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    extensionCount: 0,
    isActive: true,
    lastAccessAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseMailboxContext.mockReturnValue({
      state: {
        currentMailbox: mockMailbox,
        mails: [],
        loading: false,
        error: null,
        isConnected: false,
        totalMails: 0,
        hasMoreMails: false,
      },
      dispatch: mockDispatch,
    });

    mockUseMails.mockReturnValue({
      mails: [],
      totalMails: 0,
      hasMoreMails: false,
      loading: false,
      error: null,
      loadMails: vi.fn(),
      loadMoreMails: vi.fn(),
      getMail: vi.fn(),
      deleteMail: vi.fn(),
      deleteMultipleMails: vi.fn(),
      clearAllMails: vi.fn(),
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      addNewMail: mockAddNewMail,
      updateMail: vi.fn(),
    });

    mockWebsocketService.getConnectionStatus.mockReturnValue(
      ConnectionStatus.DISCONNECTED
    );
    mockWebsocketService.isConnected.mockReturnValue(false);
    mockWebsocketService.setEventListeners.mockImplementation(() => {});
    mockWebsocketService.connect.mockImplementation(() => {});
    mockWebsocketService.disconnect.mockImplementation(() => {});
    mockWebsocketService.subscribeToMailbox.mockImplementation(() => {});
    mockWebsocketService.unsubscribeFromMailbox.mockImplementation(() => {});
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionStatus).toBe(ConnectionStatus.DISCONNECTED);
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.subscribeToMailbox).toBe('function');
    expect(typeof result.current.unsubscribeFromMailbox).toBe('function');
    expect(typeof result.current.requestNotificationPermission).toBe(
      'function'
    );
  });

  it('should connect and subscribe when mailbox is available', () => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('test-token'),
      },
      writable: true,
    });

    renderHook(() => useWebSocket());

    expect(mockWebsocketService.setEventListeners).toHaveBeenCalled();
    expect(mockWebsocketService.connect).toHaveBeenCalled();
    expect(mockWebsocketService.subscribeToMailbox).toHaveBeenCalledWith(
      mockMailbox.id,
      'test-token'
    );
  });

  it('should handle connection status changes', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    expect(mockWebsocketService.setEventListeners).toHaveBeenCalled();
    expect(mockWebsocketService.connect).toHaveBeenCalled();
  });

  it('should handle subscription to mailbox', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.subscribeToMailbox('test-mailbox-id', 'test-token');
    });

    expect(mockWebsocketService.subscribeToMailbox).toHaveBeenCalledWith(
      'test-mailbox-id',
      'test-token'
    );
  });

  it('should handle unsubscription from mailbox', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.unsubscribeFromMailbox('test-mailbox-id');
    });

    expect(mockWebsocketService.unsubscribeFromMailbox).toHaveBeenCalledWith(
      'test-mailbox-id'
    );
  });

  it('should disconnect when called', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.disconnect();
    });

    expect(mockWebsocketService.disconnect).toHaveBeenCalled();
  });

  it('should request notification permission', async () => {
    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
    });

    const { result } = renderHook(() => useWebSocket());

    let permission;
    await act(async () => {
      permission = await result.current.requestNotificationPermission();
    });

    expect(window.Notification.requestPermission).toHaveBeenCalled();
    expect(permission).toBe('granted');
  });

  it('should handle case when no mailbox is available', () => {
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

    renderHook(() => useWebSocket());

    // Should not connect or subscribe when no mailbox
    expect(mockWebsocketService.connect).not.toHaveBeenCalled();
    expect(mockWebsocketService.subscribeToMailbox).not.toHaveBeenCalled();
  });
});
