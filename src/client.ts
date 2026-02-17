import {
  QCKError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from './errors.js';
import type { ApiResponse, RequestOptions } from './types.js';

const DEFAULT_BASE_URL = 'https://api.qck.sh/api/v1/developer';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 120_000;

/**
 * Low-level HTTP client that handles authentication, retries,
 * error mapping, and response unwrapping for the QCK API.
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  }) {
    if (!config.apiKey) {
      throw new AuthenticationError('API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retries = config.retries ?? DEFAULT_RETRIES;
  }

  // ── Public Methods ──

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  async delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  // ── Internal ──

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting with retry
        if (response.status === 429) {
          const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
          if (attempt < this.retries) {
            await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS));
            continue;
          }
          throw new RateLimitError(
            'Rate limit exceeded',
            retryAfter,
          );
        }

        // Handle other error status codes
        if (!response.ok) {
          throw await this.mapError(response);
        }

        // Successful DELETE with no body
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return undefined as unknown as T;
        }

        // Parse and unwrap
        const json = (await response.json()) as ApiResponse<T>;

        if (!json.success && json.error) {
          throw new QCKError(
            json.error.message,
            response.status,
            json.error.code,
          );
        }

        return json.data as T;
      } catch (err: unknown) {
        if (err instanceof RateLimitError && attempt >= this.retries) {
          throw err;
        }

        // Don't retry client errors (except 429, handled above)
        if (err instanceof QCKError) {
          throw err;
        }

        // Abort errors (timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new QCKError('Request timed out', 0, 'TIMEOUT');
          if (attempt >= this.retries) {
            throw lastError;
          }
          continue;
        }

        // Network errors — retry
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt >= this.retries) {
          throw new QCKError(
            `Network error: ${lastError.message}`,
            0,
            'NETWORK_ERROR',
          );
        }

        // Exponential backoff for network errors
        await sleep(Math.min(1000 * 2 ** attempt, 10_000));
      }
    }

    throw lastError ?? new QCKError('Request failed', 0, 'UNKNOWN');
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private async mapError(response: Response): Promise<QCKError> {
    let message = `HTTP ${response.status}`;
    let code = 'API_ERROR';

    try {
      const json = (await response.json()) as ApiResponse<unknown>;
      if (json.error) {
        message = json.error.message;
        code = json.error.code;
      }
    } catch {
      // Use default message if body can't be parsed
    }

    switch (response.status) {
      case 400:
        return new ValidationError(message);
      case 401:
        return new AuthenticationError(message);
      case 404:
        return new NotFoundError(message);
      case 429: {
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
        return new RateLimitError(message, retryAfter);
      }
      default:
        return new QCKError(message, response.status, code);
    }
  }
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 60;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? 60 : seconds;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
