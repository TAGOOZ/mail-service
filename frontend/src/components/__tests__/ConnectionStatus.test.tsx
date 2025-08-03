import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionStatus from '../ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows connected status when connected', () => {
    render(<ConnectionStatus isConnected={true} />);
    
    expect(screen.getByText('实时连接')).toBeInTheDocument();
    expect(screen.getByText('实时连接')).toHaveClass('text-green-600');
  });

  it('shows disconnected status when not connected', () => {
    render(<ConnectionStatus isConnected={false} />);
    
    expect(screen.getByText('连接断开')).toBeInTheDocument();
    expect(screen.getByText('连接断开')).toHaveClass('text-red-600');
  });

  it('shows reconnecting status when reconnecting', () => {
    render(<ConnectionStatus isConnected={false} isReconnecting={true} />);
    
    expect(screen.getByText('重新连接中')).toBeInTheDocument();
    expect(screen.getByText('重新连接中')).toHaveClass('text-orange-600');
  });

  it('shows error status when there is an error', () => {
    render(<ConnectionStatus isConnected={false} hasError={true} />);
    
    expect(screen.getByText('连接错误')).toBeInTheDocument();
    expect(screen.getByText('连接错误')).toHaveClass('text-red-600');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ConnectionStatus isConnected={true} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});