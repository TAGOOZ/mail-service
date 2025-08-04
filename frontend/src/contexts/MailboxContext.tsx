import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Mailbox, Mail } from '../lib/mailboxApi';

// State interface
interface MailboxState {
  currentMailbox: Mailbox | null;
  mails: Mail[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  totalMails: number;
  hasMoreMails: boolean;
}

// Action types
type MailboxAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MAILBOX'; payload: Mailbox }
  | { type: 'SET_MAILS'; payload: { mails: Mail[]; total: number; hasMore: boolean } }
  | { type: 'ADD_MAIL'; payload: Mail }
  | { type: 'UPDATE_MAIL'; payload: Mail }
  | { type: 'REMOVE_MAIL'; payload: string }
  | { type: 'CLEAR_MAILS' }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: MailboxState = {
  currentMailbox: null,
  mails: [],
  loading: false,
  error: null,
  isConnected: false,
  totalMails: 0,
  hasMoreMails: false,
};

// Reducer
const mailboxReducer = (state: MailboxState, action: MailboxAction): MailboxState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_MAILBOX':
      return { ...state, currentMailbox: action.payload, error: null };

    case 'SET_MAILS':
      return {
        ...state,
        mails: action.payload.mails,
        totalMails: action.payload.total,
        hasMoreMails: action.payload.hasMore,
        loading: false,
        error: null,
      };

    case 'ADD_MAIL':
      return {
        ...state,
        mails: [action.payload, ...state.mails],
        totalMails: state.totalMails + 1,
      };

    case 'UPDATE_MAIL':
      return {
        ...state,
        mails: state.mails.map(mail =>
          mail.id === action.payload.id ? action.payload : mail
        ),
      };

    case 'REMOVE_MAIL':
      return {
        ...state,
        mails: state.mails.filter(mail => mail.id !== action.payload),
        totalMails: Math.max(0, state.totalMails - 1),
      };

    case 'CLEAR_MAILS':
      return {
        ...state,
        mails: [],
        totalMails: 0,
        hasMoreMails: false,
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
};

// Context
interface MailboxContextType {
  state: MailboxState;
  dispatch: React.Dispatch<MailboxAction>;
}

const MailboxContext = createContext<MailboxContextType | undefined>(undefined);

// Provider component
interface MailboxProviderProps {
  children: React.ReactNode;
}

export const MailboxProvider: React.FC<MailboxProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(mailboxReducer, initialState);

  // Session recovery is now handled by SessionRecovery component

  return (
    <MailboxContext.Provider value={{ state, dispatch }}>
      {children}
    </MailboxContext.Provider>
  );
};

// Hook to use mailbox context
export const useMailboxContext = (): MailboxContextType => {
  const context = useContext(MailboxContext);
  if (!context) {
    throw new Error('useMailboxContext must be used within a MailboxProvider');
  }
  return context;
};