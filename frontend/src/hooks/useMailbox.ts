import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMailboxContext } from '../contexts/MailboxContext';
import { mailboxApi, Mailbox } from '../lib/mailboxApi';
import { setToken, removeToken } from '../lib/api';

export const useMailbox = () => {
  const { state, dispatch } = useMailboxContext();
  const navigate = useNavigate();

  // Generate new mailbox
  const generateMailbox = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const mailbox = await mailboxApi.generateMailbox();

      // Save to localStorage
      localStorage.setItem('mailbox_id', mailbox.id);
      setToken(mailbox.token);

      dispatch({ type: 'SET_MAILBOX', payload: mailbox });
      dispatch({ type: 'CLEAR_MAILS' });

      // Navigate to mailbox page
      navigate(`/mailbox/${mailbox.id}`);

      return mailbox;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate mailbox';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, navigate]);

  // Load existing mailbox
  const loadMailbox = useCallback(
    async (mailboxId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const mailbox = await mailboxApi.getMailbox(mailboxId);
        dispatch({ type: 'SET_MAILBOX', payload: mailbox });
        return mailbox;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load mailbox';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        // If mailbox not found or unauthorized, redirect to home
        if (
          errorMessage.includes('not found') ||
          errorMessage.includes('unauthorized')
        ) {
          removeToken();
          navigate('/');
        }

        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch, navigate]
  );

  // Extend mailbox expiry
  const extendMailbox = useCallback(
    async (mailboxId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const result = await mailboxApi.extendMailbox(mailboxId);

        // Update current mailbox with new expiry time
        if (state.currentMailbox) {
          const updatedMailbox: Mailbox = {
            ...state.currentMailbox,
            expiresAt: result.expiresAt,
            extensionCount: state.currentMailbox.extensionCount + 1,
          };
          dispatch({ type: 'SET_MAILBOX', payload: updatedMailbox });
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to extend mailbox';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch, state.currentMailbox]
  );

  // Delete mailbox
  const deleteMailbox = useCallback(
    async (mailboxId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        await mailboxApi.deleteMailbox(mailboxId);

        // Clear local storage and state
        removeToken();
        dispatch({ type: 'RESET_STATE' });

        // Navigate to home
        navigate('/');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete mailbox';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch, navigate]
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
