import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

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

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('mailbox_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('mailbox_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('mailbox_token');
  localStorage.removeItem('mailbox_id');
};

// Request interceptor for authentication
apiClient.interceptors.request.use(
  config => {
    const token = getToken();
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
      removeToken();
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY;

      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }

    // Retry logic for network errors and 5xx errors
    if (
      (!error.response || error.response.status >= 500) &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest._retryCount < MAX_RETRIES
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      const delay = RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      return apiClient(originalRequest);
    }

    return Promise.reject(error);
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
