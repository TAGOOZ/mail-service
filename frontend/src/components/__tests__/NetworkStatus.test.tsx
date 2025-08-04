import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import NetworkStatus, { useNetworkStatus, NetworkError } from '../NetworkStatus';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('NetworkStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('does not render when online initially', () => {
    const { container } = render(<NetworkStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline status when initially offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<NetworkStatus />);

    expect(screen.getByText('网络连接已断开')).toBeInTheDocument();
  });

  it('shows offline status when going offline', () => {
    render(<NetworkStatus />);

    // Initially should not be visible
    expect(screen.queryByText('网络连接已断开')).not.toBeInTheDocument();

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    fireEvent(window, new Event('offline'));

    expect(screen.getByText('网络连接已断开')).toBeInTheDocument();
  });

  it('shows online status when coming back online', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<NetworkStatus />);

    expect(screen.getByText('网络连接已断开')).toBeInTheDocument();

    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    fireEvent(window, new Event('online'));

    expect(screen.getByText('网络连接已恢复')).toBeInTheDocument();
  });

  it('hides online status after 3 seconds', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<NetworkStatus />);

    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    fireEvent(window, new Event('online'));

    expect(screen.getByText('网络连接已恢复')).toBeInTheDocument();

    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('网络连接已恢复')).not.toBeInTheDocument();
    });
  });

  it('calls onStatusChange callback', () => {
    const onStatusChange = jest.fn();

    render(<NetworkStatus onStatusChange={onStatusChange} />);

    // Go offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    fireEvent(window, new Event('offline'));

    expect(onStatusChange).toHaveBeenCalledWith(false);

    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    fireEvent(window, new Event('online'));

    expect(onStatusChange).toHaveBeenCalledWith(true);
  });

  it('does not show offline message when showOfflineMessage is false', () => {
    render(<NetworkStatus showOfflineMessage={false} />);

    // Go offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    fireEvent(window, new Event('offline'));

    expect(screen.getByText('网络连接已断开')).toBeInTheDocument();

    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    fireEvent(window, new Event('online'));

    // Should not show online message
    expect(screen.queryByText('网络连接已恢复')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<NetworkStatus className="custom-class" />);

    const container = screen.getByText('网络连接已断开').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('returns initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.isRecovering).toBe(false);
  });

  it('updates status when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      fireEvent(window, new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.isRecovering).toBe(false);
  });

  it('updates status when coming back online', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Go offline first
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      fireEvent(window, new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    // Go back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      fireEvent(window, new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
    expect(result.current.isRecovering).toBe(true);
  });

  it('resets wasOffline flag after 5 seconds', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Go offline then online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      fireEvent(window, new Event('offline'));
    });

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      fireEvent(window, new Event('online'));
    });

    expect(result.current.wasOffline).toBe(true);
    expect(result.current.isRecovering).toBe(true);

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.wasOffline).toBe(false);
    expect(result.current.isRecovering).toBe(false);
  });
});

describe('NetworkError', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('renders connection timeout when online', () => {
    render(<NetworkError />);

    expect(screen.getByText('连接超时')).toBeInTheDocument();
    expect(screen.getByText('服务器响应超时，请检查网络连接或稍后重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试/ })).not.toBeDisabled();
  });

  it('renders network disconnected when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<NetworkError />);

    expect(screen.getByText('网络连接断开')).toBeInTheDocument();
    expect(screen.getByText('请检查您的网络连接，然后重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /等待网络连接/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /等待网络连接/ })).toBeDisabled();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();

    render(<NetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /重试/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<NetworkError />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<NetworkError className="custom-class" />);

    const container = screen.getByText('连接超时').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});