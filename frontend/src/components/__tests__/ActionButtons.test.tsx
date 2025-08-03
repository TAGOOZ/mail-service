import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ActionButtons from '../ActionButtons';

// Mock handlers
const mockHandlers = {
  onGenerateNew: vi.fn(),
  onExtendExpiry: vi.fn(),
  onRefreshMails: vi.fn(),
  onClearAllMails: vi.fn().mockResolvedValue(undefined),
};

const defaultProps = {
  mailboxId: 'test-mailbox-id',
  canExtend: true,
  isExtending: false,
  isRefreshing: false,
  mailCount: 5,
  ...mockHandlers,
};

describe('ActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all action buttons', () => {
    render(<ActionButtons {...defaultProps} />);

    expect(screen.getByText('生成新邮箱')).toBeInTheDocument();
    expect(screen.getByText('延长有效期')).toBeInTheDocument();
    expect(screen.getByText('刷新邮件')).toBeInTheDocument();
    expect(screen.getByText('清空邮箱')).toBeInTheDocument();
  });

  describe('Generate New Mailbox', () => {
    it('shows confirmation dialog when generate new button is clicked', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('生成新的临时邮箱'));

      expect(screen.getByRole('heading', { name: '生成新邮箱' })).toBeInTheDocument();
      expect(screen.getByText('生成新邮箱将会丢失当前邮箱及其所有邮件。您确定要继续吗？')).toBeInTheDocument();
      expect(screen.getByText('确认生成')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('calls onGenerateNew when confirmed', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('生成新的临时邮箱'));
      fireEvent.click(screen.getByText('确认生成'));

      expect(mockHandlers.onGenerateNew).toHaveBeenCalledTimes(1);
    });

    it('closes dialog when cancelled', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('生成新的临时邮箱'));
      fireEvent.click(screen.getByText('取消'));

      expect(screen.queryByText('确认生成')).not.toBeInTheDocument();
      expect(mockHandlers.onGenerateNew).not.toHaveBeenCalled();
    });
  });

  describe('Extend Expiry', () => {
    it('calls onExtendExpiry when extend button is clicked', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('延长邮箱有效期12小时'));

      expect(mockHandlers.onExtendExpiry).toHaveBeenCalledTimes(1);
    });

    it('disables extend button when canExtend is false', () => {
      render(<ActionButtons {...defaultProps} canExtend={false} />);

      const extendButton = screen.getByTitle('已达到最大延期次数');
      expect(extendButton).toBeDisabled();
    });

    it('shows extending state when isExtending is true', () => {
      render(<ActionButtons {...defaultProps} isExtending={true} />);

      expect(screen.getByText('延期中...')).toBeInTheDocument();
      expect(screen.getByText('正在延长邮箱有效期...')).toBeInTheDocument();
    });
  });

  describe('Refresh Mails', () => {
    it('calls onRefreshMails when refresh button is clicked', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('手动刷新邮件列表'));

      expect(mockHandlers.onRefreshMails).toHaveBeenCalledTimes(1);
    });

    it('shows refreshing state when isRefreshing is true', () => {
      render(<ActionButtons {...defaultProps} isRefreshing={true} />);

      expect(screen.getByText('刷新中...')).toBeInTheDocument();
      expect(screen.getByText('正在刷新邮件列表...')).toBeInTheDocument();
    });

    it('disables refresh button when isRefreshing is true', () => {
      render(<ActionButtons {...defaultProps} isRefreshing={true} />);

      const refreshButton = screen.getByTitle('手动刷新邮件列表');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Clear All Mails', () => {
    it('shows confirmation dialog when clear button is clicked', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('清空所有邮件'));

      expect(screen.getByRole('heading', { name: '清空邮箱' })).toBeInTheDocument();
      expect(screen.getByText('您确定要删除所有 5 封邮件吗？此操作无法撤销。')).toBeInTheDocument();
      expect(screen.getByText('确认清空')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });

    it('calls onClearAllMails when confirmed', async () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('清空所有邮件'));
      fireEvent.click(screen.getByText('确认清空'));

      await waitFor(() => {
        expect(mockHandlers.onClearAllMails).toHaveBeenCalledTimes(1);
      });
    });

    it('disables clear button when mailCount is 0', () => {
      render(<ActionButtons {...defaultProps} mailCount={0} />);

      const clearButton = screen.getByTitle('没有邮件可清空');
      expect(clearButton).toBeDisabled();
    });

    it('shows clearing state during operation', async () => {
      const slowClearHandler = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <ActionButtons 
          {...defaultProps} 
          onClearAllMails={slowClearHandler}
        />
      );

      fireEvent.click(screen.getByTitle('清空所有邮件'));
      fireEvent.click(screen.getByText('确认清空'));

      await waitFor(() => {
        expect(screen.getByText('清空中...')).toBeInTheDocument();
        expect(screen.getByText('正在清空邮箱...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText('清空中...')).not.toBeInTheDocument();
      });
    });

    it('closes dialog when cancelled', () => {
      render(<ActionButtons {...defaultProps} />);

      fireEvent.click(screen.getByTitle('清空所有邮件'));
      fireEvent.click(screen.getByText('取消'));

      expect(screen.queryByText('确认清空')).not.toBeInTheDocument();
      expect(mockHandlers.onClearAllMails).not.toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('applies correct styling for enabled buttons', () => {
      render(<ActionButtons {...defaultProps} />);

      const generateButton = screen.getByTitle('生成新的临时邮箱');
      const extendButton = screen.getByTitle('延长邮箱有效期12小时');
      const refreshButton = screen.getByTitle('手动刷新邮件列表');
      const clearButton = screen.getByTitle('清空所有邮件');

      expect(generateButton).not.toBeDisabled();
      expect(extendButton).not.toBeDisabled();
      expect(refreshButton).not.toBeDisabled();
      expect(clearButton).not.toBeDisabled();
    });

    it('applies correct styling for disabled buttons', () => {
      render(
        <ActionButtons 
          {...defaultProps} 
          canExtend={false}
          isRefreshing={true}
          mailCount={0}
        />
      );

      const extendButton = screen.getByTitle('已达到最大延期次数');
      const refreshButton = screen.getByTitle('手动刷新邮件列表');
      const clearButton = screen.getByTitle('没有邮件可清空');

      expect(extendButton).toBeDisabled();
      expect(refreshButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper button titles', () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByTitle('生成新的临时邮箱')).toBeInTheDocument();
      expect(screen.getByTitle('延长邮箱有效期12小时')).toBeInTheDocument();
      expect(screen.getByTitle('手动刷新邮件列表')).toBeInTheDocument();
      expect(screen.getByTitle('清空所有邮件')).toBeInTheDocument();
    });

    it('provides proper disabled button titles', () => {
      render(
        <ActionButtons 
          {...defaultProps} 
          canExtend={false}
          mailCount={0}
        />
      );

      expect(screen.getByTitle('已达到最大延期次数')).toBeInTheDocument();
      expect(screen.getByTitle('没有邮件可清空')).toBeInTheDocument();
    });
  });
});