import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('../../services/authService');
vi.mock('../../contexts/ToastContext');
vi.mock('react-router-dom');

const mockAuthService = authService as any;
const mockUseToast = useToast as any;
const mockUseNavigate = useNavigate as any;

describe('useAuth', () => {
  const mockShowToast = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      toasts: [],
      removeToast: jest.fn(),
    });
    mockUseNavigate.mockReturnValue(mockNavigate);

    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockAuthService.getToken.mockReturnValue(null);
    mockAuthService.getMailboxId.mockReturnValue(null);
    mockAuthService.hasValidSession.mockReturnValue(false);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(false);
    mockAuthService.getTokenRemainingTime.mockReturnValue(0);
  });

  it('should initialize with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.mailboxId).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isTokenExpiring).toBe(false);
    expect(result.current.tokenRemainingTime).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('should initialize with authenticated state if valid session exists', () => {
    mockAuthService.getToken.mockReturnValue('test-token');
    mockAuthService.getMailboxId.mockReturnValue('test-mailbox-id');
    mockAuthService.hasValidSession.mockReturnValue(true);
    mockAuthService.getTokenRemainingTime.mockReturnValue(3600000);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.mailboxId).toBe('test-mailbox-id');
    expect(result.current.token).toBe('test-token');
    expect(result.current.tokenRemainingTime).toBe(3600000);
  });

  it('should handle login correctly', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login('test-token', 'test-mailbox-id');
    });

    expect(mockAuthService.setAuthData).toHaveBeenCalledWith(
      'test-token',
      'test-mailbox-id'
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'success',
      message: '邮箱会话已建立',
    });
  });

  it('should handle logout correctly', () => {
    // Start with authenticated state
    mockAuthService.getToken.mockReturnValue('test-token');
    mockAuthService.getMailboxId.mockReturnValue('test-mailbox-id');
    mockAuthService.hasValidSession.mockReturnValue(true);

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(mockAuthService.clearAuthData).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'info',
      message: '会话已结束',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle token refresh successfully', async () => {
    mockAuthService.refreshToken.mockResolvedValue('new-token');

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'success',
      message: '会话已自动续期',
    });
  });

  it('should handle token refresh failure', async () => {
    mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'error',
      message: '会话续期失败，请重新生成邮箱',
    });
    expect(mockAuthService.clearAuthData).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should check session validity', () => {
    mockAuthService.hasValidSession.mockReturnValue(true);

    const { result } = renderHook(() => useAuth());

    const isValid = result.current.checkSession();

    expect(isValid).toBe(true);
    expect(mockAuthService.hasValidSession).toHaveBeenCalled();
  });

  it('should logout if session is invalid but state shows authenticated', () => {
    // Mock initial authenticated state
    mockAuthService.getToken.mockReturnValue('test-token');
    mockAuthService.getMailboxId.mockReturnValue('test-mailbox-id');
    mockAuthService.hasValidSession.mockReturnValueOnce(true);

    const { result } = renderHook(() => useAuth());

    // Now mock session as invalid
    mockAuthService.hasValidSession.mockReturnValue(false);

    act(() => {
      result.current.checkSession();
    });

    expect(mockAuthService.clearAuthData).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle token expiry event', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      // Simulate token expiry event
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'warning',
      message: '会话已过期，请重新生成邮箱',
    });
    expect(mockAuthService.clearAuthData).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should auto-refresh token when expiring', async () => {
    mockAuthService.getToken.mockReturnValue('test-token');
    mockAuthService.getMailboxId.mockReturnValue('test-mailbox-id');
    mockAuthService.hasValidSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshToken.mockResolvedValue('new-token');

    const { result } = renderHook(() => useAuth());

    // Wait for auto-refresh effect to trigger
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
  });
});
