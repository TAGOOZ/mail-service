import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ToastContainer, Toast } from '../Toast';

const mockToasts: Toast[] = [
  {
    id: '1',
    type: 'success',
    title: 'Success',
    message: 'Operation completed successfully',
    duration: 5000,
  },
  {
    id: '2',
    type: 'error',
    title: 'Error',
    message: 'Something went wrong',
    duration: 0,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Warning',
    message: 'Please be careful',
    duration: 3000,
  },
  {
    id: '4',
    type: 'info',
    title: 'Info',
    message: 'Here is some information',
    duration: 4000,
    action: {
      label: 'Action',
      onClick: vi.fn(),
    },
  },
];

describe('ToastContainer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all toasts', () => {
    render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renders toast messages', () => {
    render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);

    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please be careful')).toBeInTheDocument();
    expect(screen.getByText('Here is some information')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);

    const actionButton = screen.getByRole('button', { name: 'Action' });
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(mockToasts[3].action!.onClick).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: '' }); // X button has no accessible name
    fireEvent.click(closeButton);

    // Wait for the animation to complete
    jest.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('auto-closes toasts with duration > 0', async () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onClose={mockOnClose} />);

    // Fast-forward time by the duration
    vi.advanceTimersByTime(5000);

    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('does not auto-close toasts with duration = 0', () => {
    render(<ToastContainer toasts={[mockToasts[1]]} onClose={mockOnClose} />);

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('applies correct styling for success toast', () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onClose={mockOnClose} />);

    const toastElement = screen.getByText('Success').closest('div');
    expect(toastElement).toHaveClass('bg-green-50', 'border-green-200');
  });

  it('applies correct styling for error toast', () => {
    render(<ToastContainer toasts={[mockToasts[1]]} onClose={mockOnClose} />);

    const toastElement = screen.getByText('Error').closest('div');
    expect(toastElement).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('applies correct styling for warning toast', () => {
    render(<ToastContainer toasts={[mockToasts[2]]} onClose={mockOnClose} />);

    const toastElement = screen.getByText('Warning').closest('div');
    expect(toastElement).toHaveClass('bg-orange-50', 'border-orange-200');
  });

  it('applies correct styling for info toast', () => {
    render(<ToastContainer toasts={[mockToasts[3]]} onClose={mockOnClose} />);

    const toastElement = screen.getByText('Info').closest('div');
    expect(toastElement).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('shows entrance animation', async () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onClose={mockOnClose} />);

    const toastElement = screen.getByText('Success').closest('div');

    // Initially should have translate-x-full (off-screen)
    expect(toastElement).toHaveClass('translate-x-full', 'opacity-0');

    // After a short delay, should animate in
    vi.advanceTimersByTime(20);

    await waitFor(() => {
      expect(toastElement).toHaveClass('translate-x-0', 'opacity-100');
    });
  });

  it('shows exit animation when closing', async () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: '' });
    const toastElement = screen.getByText('Success').closest('div');

    // Wait for entrance animation
    vi.advanceTimersByTime(20);
    await waitFor(() => {
      expect(toastElement).toHaveClass('translate-x-0', 'opacity-100');
    });

    // Click close button
    fireEvent.click(closeButton);

    // Should start exit animation
    await waitFor(() => {
      expect(toastElement).toHaveClass('translate-x-full', 'opacity-0');
    });

    // After animation completes, onClose should be called
    vi.advanceTimersByTime(300);
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });
});