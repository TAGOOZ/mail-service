import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMailboxContext } from '../contexts/MailboxContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from './useAuth';
import { mailboxApi, Mailbox } from '../lib/mailboxApi';
import {
  handleErrorWithToast,
  getOperationErrorMessage,
} from '../utils/errorHandler';
import { withRetry, retryConditions } from '../utils/retryMechanism';

export const useMailbox = () => {
  const { state, dispatch } = useMailboxContext();
  const navigate = useNavigate();
  const { showSuccess, showError, showToast } = useToast();
  const { login, logout } = useAuth();

  // Generate new mailbox
  const generateMailbox = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const mailbox = await withRetry(() => mailboxApi.generateMailbox(), {
        maxRetries: 2,
        retryCondition: retryConditions.networkErrors,
        onRetry: attempt => {
          showToast(
            'info',
            '重试中...',
            `正在尝试第 ${attempt} 次重新生成邮箱`
          );
        },
      });

      // Save authentication data using auth service
      login(mailbox.token, mailbox.id);

      dispatch({ type: 'SET_MAILBOX', payload: mailbox });
      dispatch({ type: 'CLEAR_MAILS' });

      // Show success message
      showSuccess('邮箱生成成功', `新邮箱地址: ${mailbox.address}`);

      // Navigate to mailbox page
      navigate(`/mailbox/${mailbox.id}`);

      return mailbox;
    } catch (error) {
      const errorMessage = getOperationErrorMessage('generate_mailbox', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      handleErrorWithToast(error, showToast, () => generateMailbox());
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, navigate, showSuccess, showToast]);

  // Load existing mailbox
  const loadMailbox = useCallback(
    async (mailboxId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const mailbox = await withRetry(
          () => mailboxApi.getMailbox(mailboxId),
          {
            maxRetries: 2,
            retryCondition: retryConditions.networkErrors,
            onRetry: attempt => {
              showToast(
                'info',
                '重试中...',
                `正在尝试第 ${attempt} 次加载邮箱`
              );
            },
          }
        );

        dispatch({ type: 'SET_MAILBOX', payload: mailbox });
        return mailbox;
      } catch (error) {
        const errorMessage = getOperationErrorMessage('load_mailbox', error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        handleErrorWithToast(error, showToast, () => loadMailbox(mailboxId));

        // If mailbox not found or unauthorized, redirect to home
        if (
          errorMessage.includes('不存在') ||
          errorMessage.includes('过期') ||
          errorMessage.includes('权限')
        ) {
          logout();
          setTimeout(() => navigate('/'), 2000); // Delay to show error message
        }

        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch, navigate, showToast]
  );

  // Extend mailbox expiry
  const extendMailbox = useCallback(
    async (mailboxId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const result = await withRetry(
          () => mailboxApi.extendMailbox(mailboxId),
          {
            maxRetries: 2,
            retryCondition: retryConditions.networkErrors,
            onRetry: attempt => {
              showToast(
                'info',
                '重试中...',
                `正在尝试第 ${attempt} 次延长邮箱`
              );
            },
          }
        );

        // Update current mailbox with new expiry time
        if (state.currentMailbox) {
          const updatedMailbox: Mailbox = {
            ...state.currentMailbox,
            expiresAt: result.expiresAt,
            extensionCount: state.currentMailbox.extensionCount + 1,
          };
          dispatch({ type: 'SET_MAILBOX', payload: updatedMailbox });
        }

        showSuccess('邮箱延期成功', '邮箱有效期已延长 12 小时');
        return result;
      } catch (error) {
        const errorMessage = getOperationErrorMessage('extend_mailbox', error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        handleErrorWithToast(error, showToast, () => extendMailbox(mailboxId));
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch, state.currentMailbox, showSuccess, showToast]
  );

  // Delete mailbox
  const deleteMailbox = useCallback(
    async (mailboxId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        await withRetry(() => mailboxApi.deleteMailbox(mailboxId), {
          maxRetries: 2,
          retryCondition: retryConditions.networkErrors,
          onRetry: attempt => {
            showToast('info', '重试中...', `正在尝试第 ${attempt} 次删除邮箱`);
          },
        });

        // Clear authentication data and state
        logout();
        dispatch({ type: 'RESET_STATE' });

        showSuccess('邮箱删除成功', '邮箱及所有邮件已被删除');

        // Navigate to home
        navigate('/');
      } catch (error) {
        const errorMessage = getOperationErrorMessage('delete_mailbox', error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        handleErrorWithToast(error, showToast, () => deleteMailbox(mailboxId));
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch, navigate, showSuccess, showToast]
  );

  // Check if mailbox is expired
  const isMailboxExpired = useCallback(() => {
    if (!state.currentMailbox) return false;
    return new Date(state.currentMailbox.expiresAt) <= new Date();
  }, [state.currentMailbox]);

  // Get time remaining
  const getTimeRemaining = useCallback(() => {
    if (!state.currentMailbox) return null;

    const now = new Date();
    const expiresAt = new Date(state.currentMailbox.expiresAt);
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, total: diff };
  }, [state.currentMailbox]);

  return {
    mailbox: state.currentMailbox,
    loading: state.loading,
    error: state.error,
    generateMailbox,
    loadMailbox,
    extendMailbox,
    deleteMailbox,
    isMailboxExpired,
    getTimeRemaining,
  };
};
