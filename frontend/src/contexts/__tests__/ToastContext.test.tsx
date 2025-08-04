import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ToastProvider, useToast } from '../ToastContext';

// Test component that uses the toast context
const TestComponent: React.FC = () => {
  const {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAllToasts,
  } = useToast();

  return (
    <div>
      <button onClick={() => showSuccess('Success', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showError('Error', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showWarning('Warning', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info', 'Info message')}>
        Show Info
      </button>
      <button
        onClick={() =>
          showToast('info', 'Custom', 'Custom message', {
            duration: 1000,
            action: { label: 'Action', onClick: () => { } },
          })
        }
      >
        Show Custom
      </button>
      <button onClick={() => removeToast('test-id')}>Remove Toast</button>
      <button onClick={clearAllToasts}>Clear All</button>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('provides toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Show Success')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
    expect(screen.getByText('Show Warning')).toBeInTheDocument();
    expect(screen.getByText('Show Info')).toBeInTheDocument();
  });

  it('shows success toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('shows error toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('shows warning toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('shows info toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('shows custom toast with action', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Custom'));

    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('auto-removes success toasts after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    // Fast-forward time by default duration (5000ms)
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
  });

  it('does not auto-remove error toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('removes toast with custom duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Custom'));
    expect(screen.getByText('Custom')).toBeInTheDocument();

    // Fast-forward time by custom duration (1000ms)
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    });
  });

  it('clears all toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Show multiple toasts
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();

    // Clear all toasts
    fireEvent.click(screen.getByText('Clear All'));

    expect(screen.queryByText('Success')).not.toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
    expect(screen.queryByText('Warning')).not.toBeInTheDocument();
  });

  it('generates unique IDs for toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Show multiple toasts of the same type
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Success'));

    // Both should be visible (different IDs)
    const successToasts = screen.getAllByText('Success');
    expect(successToasts).toHaveLength(2);
  });

  it('handles toast removal by ID', () => {
    // This test would require exposing the toast ID, which isn't currently done
    // in the implementation. This is more of an internal functionality test.
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    // The removeToast function is called internally when close button is clicked
    // We can test this through the close button interaction
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);

    // Wait for animation
    vi.advanceTimersByTime(300);

    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });
});