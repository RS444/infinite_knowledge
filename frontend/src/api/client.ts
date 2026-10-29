/**
 * Centralized HTTP Client for Infinite Knowledge API
 * Handles base URL configuration, headers, error parsing, and CORS/proxy resilience.
 */

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiClientError extends Error {
  status?: number;
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Fetch with timeout and automatic error parsing
 */
export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, ...customConfig } = options;

  // Clean endpoint ensuring leading slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Try configured RAW_BASE_URL first
  const primaryUrl = RAW_BASE_URL ? `${RAW_BASE_URL}${cleanEndpoint}` : cleanEndpoint;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions: RequestInit = {
    ...customConfig,
    signal: customConfig.signal || controller.signal,
  };

  try {
    let response: Response;

    try {
      response = await fetch(primaryUrl, fetchOptions);
    } catch (networkErr: unknown) {
      // If direct request failed (e.g. browser CORS block or unreachable address)
      // and we had a non-empty RAW_BASE_URL, attempt same-origin fallback via Vite dev proxy
      if (RAW_BASE_URL && (networkErr as Error)?.name !== 'AbortError') {
        try {
          response = await fetch(cleanEndpoint, fetchOptions);
        } catch {
          // If fallback also fails, rethrow original error
          throw networkErr;
        }
      } else {
        throw networkErr;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorDetail = '';

      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
          errorMessage = errorJson.detail;
        } else if (errorJson && typeof errorJson.message === 'string') {
          errorDetail = errorJson.message;
          errorMessage = errorJson.message;
        }
      } catch {
        // Response was not JSON
      }

      throw new ApiClientError(errorMessage, response.status, errorDetail);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }

    if ((err as Error)?.name === 'AbortError') {
      throw new ApiClientError('Request timed out. Please check your backend connection.', 408);
    }

    const message = (err as Error)?.message || 'An unexpected network error occurred';
    throw new ApiClientError(message);
  }
}

export function getBaseApiUrl(): string {
  return RAW_BASE_URL || window.location.origin;
}
