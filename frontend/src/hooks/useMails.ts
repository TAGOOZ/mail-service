import { useCallback } from 'react';
import { useMailboxContext } from '../contexts/MailboxContext';
import { useToast } from '../contexts/ToastContext';
import { mailApi, Mail } from '../lib/mailboxApi';
import {
  handleErrorWithToast,
  getOperationErrorMessage,
} from '../utils/errorHandler';
import { withRetry, retryConditions } from '../utils/retryMechanism';

export const useMails = () => {
  const { state, dispatch } = useMailboxContext();
  const { showSuccess, showToast } = useToast();

  // Load mails for current mailbox
  const loadMails = useCallback(
    async (mailboxId: string, options?: { page?: number; limit?: number }) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const result = await mailApi.getMailList(mailboxId, options);
        dispatch({
          type: 'SET_MAILS',
          payload: {
            mails: result.mails,
            total: result.total,
            hasMore: result.hasMore,
          },
        });
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load mails';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch]
  );

  // Load more mails (for pagination)
  const loadMoreMails = useCallback(
    async (mailboxId: string) => {
      if (!state.hasMoreMails || state.loading) return;

      const currentPage = Math.floor(state.mails.length / 20) + 1; // Assuming 20 per page

      try {
        const result = await mailApi.getMailList(mailboxId, {
          page: currentPage,
          limit: 20,
        });

        dispatch({
          type: 'SET_MAILS',
          payload: {
            mails: [...state.mails, ...result.mails],
            total: result.total,
            hasMore: result.hasMore,
          },
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load more mails';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [dispatch, state.mails.length, state.hasMoreMails, state.loading]
  );

  // Get single mail details
  const getMail = useCallback(
    async (mailboxId: string, mailId: string) => {
      try {
        const mail = await mailApi.getMail(mailboxId, mailId);

        // Update the mail in the list if it exists
        const existingMail = state.mails.find(m => m.id === mailId);
        if (existingMail) {
          dispatch({ type: 'UPDATE_MAIL', payload: mail });
        }

        return mail;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to get mail';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [dispatch, state.mails]
  );

  // Delete a mail
  const deleteMail = useCallback(
    async (mailboxId: string, mailId: string) => {
      try {
        await withRetry(() => mailApi.deleteMail(mailboxId, mailId), {
          maxRetries: 2,
          retryCondition: retryConditions.networkErrors,
          onRetry: attempt => {
            showToast('info', '重试中...', `正在尝试第 ${attempt} 次删除邮件`);
          },
        });

        dispatch({ type: 'REMOVE_MAIL', payload: mailId });
        showSuccess('邮件删除成功');
      } catch (error) {
        const errorMessage = getOperationErrorMessage('delete_mail', error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        handleErrorWithToast(error, showToast, () =>
          deleteMail(mailboxId, mailId)
        );
        throw error;
      }
    },
    [dispatch, showSuccess, showToast]
  );

  // Delete multiple mails
  const deleteMultipleMails = useCallback(
    async (mailboxId: string, mailIds: string[]) => {
      try {
        // Delete mails one by one (API doesn't support batch delete)
        await Promise.all(
          mailIds.map(mailId => mailApi.deleteMail(mailboxId, mailId))
        );

        // Remove all mails from state
        mailIds.forEach(mailId => {
          dispatch({ type: 'REMOVE_MAIL', payload: mailId });
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete mails';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [dispatch]
  );

  // Clear all mails
  const clearAllMails = useCallback(
    async (mailboxId: string) => {
      try {
        await withRetry(() => mailApi.clearAllMails(mailboxId), {
          maxRetries: 2,
          retryCondition: retryConditions.networkErrors,
          onRetry: attempt => {
            showToast('info', '重试中...', `正在尝试第 ${attempt} 次清空邮箱`);
          },
        });

        dispatch({ type: 'CLEAR_MAILS' });
        showSuccess('邮箱清空成功', '所有邮件已被删除');
      } catch (error) {
        const errorMessage = getOperationErrorMessage('clear_mails', error);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        handleErrorWithToast(error, showToast, () => clearAllMails(mailboxId));
        throw error;
      }
    },
    [dispatch, showSuccess, showToast]
  );

  // Mark mail as read
  const markAsRead = useCallback(
    async (mailboxId: string, mailId: string) => {
      try {
        await mailApi.markAsRead(mailboxId, mailId);

        // Update the mail in the list
        const mail = state.mails.find(m => m.id === mailId);
        if (mail && !mail.isRead) {
          const updatedMail: Mail = { ...mail, isRead: true };
          dispatch({ type: 'UPDATE_MAIL', payload: updatedMail });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to mark mail as read';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [dispatch, state.mails]
  );

  // Mark mail as unread
  const markAsUnread = useCallback(
    async (mailboxId: string, mailId: string) => {
      try {
        await mailApi.markAsUnread(mailboxId, mailId);

        // Update the mail in the list
        const mail = state.mails.find(m => m.id === mailId);
        if (mail && mail.isRead) {
          const updatedMail: Mail = { ...mail, isRead: false };
          dispatch({ type: 'UPDATE_MAIL', payload: updatedMail });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to mark mail as unread';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [dispatch, state.mails]
  );

  // Add new mail (for real-time updates)
  const addNewMail = useCallback(
    (mail: Mail) => {
      dispatch({ type: 'ADD_MAIL', payload: mail });
    },
    [dispatch]
  );

  // Update mail (for real-time updates)
  const updateMail = useCallback(
    (mail: Mail) => {
      dispatch({ type: 'UPDATE_MAIL', payload: mail });
    },
    [dispatch]
  );

  return {
    mails: state.mails,
    totalMails: state.totalMails,
    hasMoreMails: state.hasMoreMails,
    loading: state.loading,
    error: state.error,
    loadMails,
    loadMoreMails,
    getMail,
    deleteMail,
    deleteMultipleMails,
    clearAllMails,
    markAsRead,
    markAsUnread,
    addNewMail,
    updateMail,
  };
};
