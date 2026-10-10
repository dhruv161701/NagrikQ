import { supabase } from '../config/supabase';
import { getAuthToken } from './auth/authToken';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  verificationStatus?: string;
  extractedInfo?: any;
  fileHash?: string;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Read current Supabase session token
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `${API_BASE_URL}${cleanEndpoint}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // If 401, attempt seamless session refresh to support full 24-hour persistent sessions
      if (response.status === 401) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            headers['Authorization'] = `Bearer ${refreshData.session.access_token}`;
            const retryRes = await fetch(url, { ...options, headers });
            if (retryRes.ok) {
              return await retryRes.json();
            }
          }
        } catch {
          // Fall through to error response
        }
      }

      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        verificationStatus: errJson.verificationStatus,
        extractedInfo: errJson.extractedInfo,
        fileHash: errJson.fileHash,
        data: errJson.data,
        error: errJson.error || {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'API Request failed.',
        },
      };
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Backend server returned non-JSON response.',
      },
    };
  } catch (err: any) {
    // Return clear error without breaking UI execution
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to connect to NagrikQ Backend API server.',
      },
    };
  }
}

export const apiClient = {
  request,
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET' });
  },

  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
