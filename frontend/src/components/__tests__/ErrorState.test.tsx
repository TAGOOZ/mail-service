import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ErrorState from '../ErrorState';

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ErrorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders network error correctly', () => {
    const error = new Error('网络连接失败');
    const onRetry = vi.fn();
    render(<ErrorState error={error} onRetry={onRetry} />);

    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    expect(screen.getByText('请检查您的网络连接，然后重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /返回首页/ })).not.toBeInTheDocument();
  });

  it('renders authentication error correctly', () => {
    const error = new Error('会话已过期');
    render(<ErrorState error={error} />);

    expect(screen.getByText('会话已过期')).toBeInTheDocument();
    expect(screen.getByText('您的邮箱访问权限已过期，请重新生成邮箱')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /重试/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /返回首页/ })).toBeInTheDocument();
  });

  it('renders default error correctly', () => {
    const error = new Error('Unknown error');
    const onRetry = vi.fn();
    render(<ErrorState error={error} onRetry={onRetry} />);

    expect(screen.getByText('操作失败')).toBeInTheDocument();
    expect(screen.getByText('Unknown error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /返回首页/ })).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    const error = new Error('网络连接失败');

    render(<ErrorState error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /重试/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onGoHome when go home button is clicked', () => {
    const onGoHome = vi.fn();
    const error = new Error('会话已过期');

    render(<ErrorState error={error} onGoHome={onGoHome} />);

    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));
    expect(onGoHome).toHaveBeenCalled();
  });

  it('uses default go home behavior when no onGoHome provided', () => {
    const error = new Error('会话已过期');

    render(<ErrorState error={error} />);

    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));

    expect(mockLocalStorage.clear).toHaveBeenCalled();
    expect(mockLocation.href).toBe('/');
  });

  it('applies different sizes correctly', () => {
    const error = new Error('Test error');

    const { rerender } = render(<ErrorState error={error} size="small" />);
    expect(screen.getByText('操作失败')).toHaveClass('text-lg');

    rerender(<ErrorState error={error} size="medium" />);
    expect(screen.getByText('操作失败')).toHaveClass('text-xl');

    rerender(<ErrorState error={error} size="large" />);
    expect(screen.getByText('操作失败')).toHaveClass('text-2xl');
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    render(<ErrorState error={error} showDetails={true} />);

    expect(screen.getByText('错误详情 (开发模式)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    render(<ErrorState error={error} showDetails={true} />);

    expect(screen.queryByText('错误详情 (开发模式)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});