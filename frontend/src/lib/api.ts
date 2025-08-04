import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { authService } from '../services/authService';

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management (legacy support)
const getToken = (): string | null => {
  return authService.getToken();
};

const setToken = (token: string): void => {
  const mailboxId = authService.getMailboxId();
  if (mailboxId) {
    authService.setAuthData(token, mailboxId);
  } else {
    // Fallback to localStorage for backward compatibility
    localStorage.setItem('mailbox_token', token);
  }
};

const removeToken = (): void => {
  authService.clearAuthData();
};

// Request interceptor for authentication
apiClient.interceptors.request.use(
  config => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retries
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Check if this is a token refresh request
      const isRefreshRequest = originalRequest.url?.includes('/mailbox/');

      if (!isRefreshRequest && !originalRequest._isRetry) {
        // Try to refresh token automatically
        try {
          await authService.refreshToken();
          originalRequest._isRetry = true;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear auth data and let component handle
          authService.clearAuthData();
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
        }
      } else {
        // This is a refresh request or retry failed, clear auth data
        authService.clearAuthData();
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
      }

      return Promise.reject(error);
    }

    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY;

      // Only retry if not already retried too many times
      if (
        !originalRequest._retryCount ||
        originalRequest._retryCount < MAX_RETRIES
      ) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiClient(originalRequest);
      }
    }

    // Enhanced error information
    const enhancedError = {
      ...error,
      isNetworkError: !error.response,
      isServerError: error.response?.status
        ? error.response.status >= 500
        : false,
      isClientError: error.response?.status
        ? error.response.status >= 400 && error.response.status < 500
        : false,
      statusCode: error.response?.status,
      errorData: error.response?.data,
    };

    return Promise.reject(enhancedError);
  }
);

// API error types
export interface ApiError {
  type: string;
  message: string;
  code: string;
  details?: any;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: ApiError;
}

// Generic API request wrapper
const apiRequest = async <T>(
  request: () => Promise<AxiosResponse<ApiResponse<T>>>
): Promise<T> => {
  try {
    const response = await request();

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'API request failed');
    }

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data?.error;
      if (apiError) {
        throw new Error(apiError.message);
      }
      throw new Error(error.message || 'Network error occurred');
    }
    throw error;
  }
};

export { apiClient, apiRequest, getToken, setToken, removeToken };
