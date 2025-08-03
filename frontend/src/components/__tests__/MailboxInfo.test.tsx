import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MailboxInfo from '../MailboxInfo';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('MailboxInfo', () => {
  const defaultProps = {
    address: 'test123@nnu.edu.kg',
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    mailCount: 5,
    extensionCount: 0,
    maxExtensions: 2,
    onCopyAddress: vi.fn(),
    onExtendExpiry: vi.fn(),
    isExtending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mailbox information correctly', () => {
    render(<MailboxInfo {...defaultProps} />);
    
    expect(screen.getByText('您的临时邮箱')).toBeInTheDocument();
    expect(screen.getByText('test123@nnu.edu.kg')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // mail count
    expect(screen.getByText('0/2')).toBeInTheDocument(); // extension count
  });

  it('calls onCopyAddress when copy button is clicked', () => {
    render(<MailboxInfo {...defaultProps} />);
    
    const copyButton = screen.getByTitle('复制邮箱地址');
    fireEvent.click(copyButton);
    
    expect(defaultProps.onCopyAddress).toHaveBeenCalledTimes(1);
  });

  it('shows success message after copying', async () => {
    render(<MailboxInfo {...defaultProps} />);
    
    const copyButton = screen.getByTitle('复制邮箱地址');
    fireEvent.click(copyButton);
    
    expect(screen.getByText('邮箱地址已复制到剪贴板')).toBeInTheDocument();
    
    // Message should disappear after 2 seconds
    await waitFor(
      () => {
        expect(screen.queryByText('邮箱地址已复制到剪贴板')).not.toBeInTheDocument();
      },
      { timeout: 2500 }
    );
  });

  it('calls onExtendExpiry when extend button is clicked', () => {
    render(<MailboxInfo {...defaultProps} />);
    
    const extendButton = screen.getByRole('button', { name: /延长有效期/ });
    fireEvent.click(extendButton);
    
    expect(defaultProps.onExtendExpiry).toHaveBeenCalledTimes(1);
  });

  it('disables extend button when maximum extensions reached', () => {
    const props = {
      ...defaultProps,
      extensionCount: 2, // max reached
    };
    
    render(<MailboxInfo {...props} />);
    
    const extendButton = screen.getByRole('button', { name: /延长有效期/ });
    expect(extendButton).toBeDisabled();
    expect(extendButton).toHaveAttribute('title', '已达到最大延期次数 (2)');
  });

  it('shows extending state when isExtending is true', () => {
    const props = {
      ...defaultProps,
      isExtending: true,
    };
    
    render(<MailboxInfo {...props} />);
    
    expect(screen.getByText('延期中...')).toBeInTheDocument();
    const extendButton = screen.getByRole('button', { name: /延期中/ });
    expect(extendButton).toBeDisabled();
  });

  it('displays remaining time correctly', () => {
    render(<MailboxInfo {...defaultProps} />);
    
    // Should show time in HH:MM:SS format
    const timeElement = screen.getByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('shows warning when time is less than 1 hour', () => {
    const props = {
      ...defaultProps,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    };
    
    render(<MailboxInfo {...props} />);
    
    // Look for the warning icon or orange text
    const warningElement = screen.getByText(/\d{2}:\d{2}:\d{2}/).parentElement;
    expect(warningElement).toHaveClass('text-orange-600');
  });

  it('shows expired state when time has passed', () => {
    const props = {
      ...defaultProps,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    };
    
    render(<MailboxInfo {...props} />);
    
    expect(screen.getByText('已过期')).toBeInTheDocument();
  });

  it('updates timer every second', async () => {
    const futureTime = new Date(Date.now() + 65 * 1000).toISOString(); // 1 minute 5 seconds
    const props = {
      ...defaultProps,
      expiresAt: futureTime,
    };
    
    render(<MailboxInfo {...props} />);
    
    // Initial time should show 01:05 or 01:04
    expect(screen.getByText(/00:01:0[45]/)).toBeInTheDocument();
    
    // Wait for timer to update
    await waitFor(
      () => {
        expect(screen.getByText(/00:01:0[34]/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('handles responsive layout classes', () => {
    const { container } = render(<MailboxInfo {...defaultProps} />);
    
    // Check for responsive classes
    expect(container.querySelector('.md\\:flex-row')).toBeInTheDocument();
    expect(container.querySelector('.md\\:items-center')).toBeInTheDocument();
    expect(container.querySelector('.md\\:grid-cols-3')).toBeInTheDocument();
  });

  it('shows correct extension count display', () => {
    const props = {
      ...defaultProps,
      extensionCount: 1,
      maxExtensions: 2,
    };
    
    render(<MailboxInfo {...props} />);
    
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });
});