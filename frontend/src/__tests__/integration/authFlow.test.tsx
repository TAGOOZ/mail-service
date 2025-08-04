import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MailboxProvider } from '../../contexts/MailboxContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { SessionRecovery } from '../../components/SessionRecovery';
import { authService } from '../../services/authService';

// Mock the mailbox API
vi.mock('../../lib/mailboxApi', () => ({
  mailboxApi: {
    getMailbox: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ToastProvider>
          <MailboxProvider>
            {component}
          </MailboxProvider>
        </ToastProvider>
      </BrowserRouter>
    );
  };

  it('should handle authentication lifecycle correctly', async () => {
    // Test initial unauthenticated state
    expect(authService.hasValidSession()).toBe(false);
    expect(authService.getToken()).toBeNull();
    expect(authService.getMailboxId()).toBeNull();

    // Test setting auth data
    const token = 'test-token';
    const mailboxId = 'test-mailbox-id';

    authService.setAuthData(token, mailboxId);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('mailbox_token', token);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('mailbox_id', mailboxId);

    // Test clearing auth data
    authService.clearAuthData();

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mailbox_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mailbox_id');
  });

  it('should render SessionRecovery component without errors', async () => {
    renderWithProviders(
      <SessionRecovery>
        <div data-testid="app-content">App Content</div>
      </SessionRecovery>
    );

    // Should eventually show the app content after recovery attempt
    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle token parsing correctly', () => {
    // Create a valid JWT-like token for testing
    const payload = {
      mailboxId: 'test-mailbox-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'mailbox_token') return token;
      if (key === 'mailbox_id') return 'test-mailbox-id';
      return null;
    });

    expect(authService.hasValidSession()).toBe(true);
    expect(authService.getTokenRemainingTime()).toBeGreaterThan(0);
  });
});