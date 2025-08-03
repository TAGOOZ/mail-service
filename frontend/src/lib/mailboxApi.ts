import { apiClient, apiRequest } from './api';

// Types from shared package
export interface Mailbox {
  id: string;
  address: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  extensionCount: number;
  isActive: boolean;
  lastAccessAt: string;
}

export interface Mail {
  id: string;
  mailboxId: string;
  from: string;
  to: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachments: Attachment[];
  receivedAt: string;
  isRead: boolean;
  size: number;
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface MailListResponse {
  mails: Mail[];
  total: number;
  hasMore: boolean;
}

// Mailbox API functions
export const mailboxApi = {
  // Generate new mailbox
  generateMailbox: async (): Promise<Mailbox> => {
    return apiRequest(() => apiClient.post<any>('/mailbox/generate'));
  },

  // Get mailbox info
  getMailbox: async (mailboxId: string): Promise<Mailbox> => {
    return apiRequest(() => apiClient.get<any>(`/mailbox/${mailboxId}`));
  },

  // Extend mailbox expiry
  extendMailbox: async (
    mailboxId: string
  ): Promise<{ expiresAt: string; extensionsLeft: number }> => {
    return apiRequest(() =>
      apiClient.post<any>(`/mailbox/${mailboxId}/extend`)
    );
  },

  // Delete mailbox
  deleteMailbox: async (mailboxId: string): Promise<void> => {
    return apiRequest(() => apiClient.delete<any>(`/mailbox/${mailboxId}`));
  },
};

// Mail API functions
export const mailApi = {
  // Get mail list
  getMailList: async (
    mailboxId: string,
    options?: { page?: number; limit?: number }
  ): Promise<MailListResponse> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    return apiRequest(() =>
      apiClient.get<any>(`/mailbox/${mailboxId}/mails?${params.toString()}`)
    );
  },

  // Get mail details
  getMail: async (mailboxId: string, mailId: string): Promise<Mail> => {
    return apiRequest(() =>
      apiClient.get<any>(`/mailbox/${mailboxId}/mails/${mailId}`)
    );
  },

  // Delete mail
  deleteMail: async (mailboxId: string, mailId: string): Promise<void> => {
    return apiRequest(() =>
      apiClient.delete<any>(`/mailbox/${mailboxId}/mails/${mailId}`)
    );
  },

  // Clear all mails
  clearAllMails: async (mailboxId: string): Promise<void> => {
    return apiRequest(() =>
      apiClient.delete<any>(`/mailbox/${mailboxId}/mails`)
    );
  },

  // Mark mail as read
  markAsRead: async (mailboxId: string, mailId: string): Promise<void> => {
    return apiRequest(() =>
      apiClient.patch<any>(`/mailbox/${mailboxId}/mails/${mailId}/read`)
    );
  },

  // Mark mail as unread
  markAsUnread: async (mailboxId: string, mailId: string): Promise<void> => {
    return apiRequest(() =>
      apiClient.patch<any>(`/mailbox/${mailboxId}/mails/${mailId}/unread`)
    );
  },
};
