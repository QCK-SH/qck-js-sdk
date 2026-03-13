import {
  QCKError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from './errors.js';
import type { ApiResponse, RequestOptions } from './types.js';

/** Default base URL for the QCK public API. */
const DEFAULT_BASE_URL = 'https://api.qck.sh/public-api/v1';
/** Default request timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT = 30_000;
/** Default number of automatic retries on transient failures. */
const DEFAULT_RETRIES = 3;
/** Maximum delay between retries in milliseconds (2 minutes). */
const MAX_RETRY_DELAY_MS = 120_000;

/**
 * Low-level HTTP client that handles authentication, retries,
 * error mapping, and response unwrapping for the QCK API.
 *
 * @description This client is used internally by all resource classes. You
 * typically do not need to instantiate it directly -- the {@link QCK} class
 * creates one for you. However, it is exported for advanced use cases where
 * direct API access is needed.
 *
 * @example
 * ```ts
 * import { HttpClient } from '@qck/sdk';
 *
 * const client = new HttpClient({ apiKey: 'qck_...' });
 * const data = await client.get<MyType>('/some-endpoint');
 * ```
 */
export class HttpClient {
  /** API key used for authenticating requests via the `X-API-Key` header. */
  private readonly apiKey: string;
  /** Base URL for all API requests (trailing slashes are stripped). */
  private readonly baseUrl: string;
  /** Request timeout in milliseconds. */
  private readonly timeout: number;
  /** Maximum number of automatic retries on transient failures. */
  private readonly retries: number;

  /**
   * Create a new HTTP client instance.
   *
   * @param config - Client configuration options.
   * @param config.apiKey - API key for authentication. Required.
   * @param config.baseUrl - Base URL for the API. Defaults to `'https://api.qck.sh/public-api/v1'`.
   * @param config.timeout - Request timeout in milliseconds. Defaults to `30000`.
   * @param config.retries - Number of automatic retries. Defaults to `3`.
   * @throws {AuthenticationError} If `apiKey` is empty or not provided.
   */
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

  /**
   * Send a GET request.
   *
   * @typeParam T - Expected response data type.
   * @param path - API endpoint path (e.g. `'/links'`).
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Send a POST request.
   *
   * @typeParam T - Expected response data type.
   * @param path - API endpoint path.
   * @param body - JSON-serializable request body.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * Send a PATCH request.
   *
   * @typeParam T - Expected response data type.
   * @param path - API endpoint path.
   * @param body - JSON-serializable request body with partial update fields.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  /**
   * Send a PUT request.
   *
   * @typeParam T - Expected response data type.
   * @param path - API endpoint path.
   * @param body - JSON-serializable request body.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  /**
   * Send a PUT request with a raw (non-JSON) body.
   * Used for binary uploads (e.g., OG image).
   *
   * @typeParam T - Expected response data type.
   * @param path - API endpoint path.
   * @param body - Binary data to upload.
   * @param contentType - MIME type of the body (e.g. `'image/png'`).
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async putRaw<T>(
    path: string,
    body: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
    options?: RequestOptions,
  ): Promise<T> {
    return this.requestRaw<T>('PUT', path, body, contentType, options);
  }

  /**
   * Send a DELETE request.
   *
   * @typeParam T - Expected response data type (defaults to `void`).
   * @param path - API endpoint path.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data, or `undefined` for 204 responses.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  // ── Internal ──

  /**
   * Core request method that handles JSON serialization, retries,
   * rate-limit backoff, timeout via AbortController, and error mapping.
   *
   * @typeParam T - Expected response data type.
   * @param method - HTTP method.
   * @param path - API endpoint path.
   * @param body - Optional JSON-serializable request body.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {RateLimitError} When rate limited and all retries are exhausted.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
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

  /**
   * Like {@link request} but sends a raw (non-JSON) body with a given Content-Type.
   * Used for binary file uploads such as OG images.
   *
   * @typeParam T - Expected response data type.
   * @param method - HTTP method.
   * @param path - API endpoint path.
   * @param body - Binary data to send.
   * @param contentType - MIME type of the body.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data.
   * @throws {RateLimitError} When rate limited and all retries are exhausted.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  private async requestRaw<T>(
    method: string,
    path: string,
    body: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': contentType,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: body as BodyInit,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
          if (attempt < this.retries) {
            await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS));
            continue;
          }
          throw new RateLimitError('Rate limit exceeded', retryAfter);
        }

        if (!response.ok) {
          throw await this.mapError(response);
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return undefined as unknown as T;
        }

        const json = (await response.json()) as ApiResponse<T>;

        if (!json.success && json.error) {
          throw new QCKError(json.error.message, response.status, json.error.code);
        }

        return json.data as T;
      } catch (err: unknown) {
        if (err instanceof RateLimitError && attempt >= this.retries) {
          throw err;
        }

        if (err instanceof QCKError) {
          throw err;
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new QCKError('Request timed out', 0, 'TIMEOUT');
          if (attempt >= this.retries) {
            throw lastError;
          }
          continue;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt >= this.retries) {
          throw new QCKError(
            `Network error: ${lastError.message}`,
            0,
            'NETWORK_ERROR',
          );
        }

        await sleep(Math.min(1000 * 2 ** attempt, 10_000));
      }
    }

    throw lastError ?? new QCKError('Request failed', 0, 'UNKNOWN');
  }

  /**
   * Build a full URL from the base URL, path, and optional query parameters.
   * Array values are appended as multiple entries for the same key.
   *
   * @param path - API endpoint path.
   * @param params - Query string parameters. `undefined` values are skipped.
   * @returns The fully qualified URL string.
   */
  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | string[] | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, item);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Map an HTTP error response to the appropriate {@link QCKError} subclass.
   *
   * @param response - The failed HTTP response.
   * @returns A typed error instance based on the HTTP status code.
   */
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

/**
 * Parse the `Retry-After` HTTP header value into seconds.
 *
 * @param header - Raw header value, or `null` if not present.
 * @returns Number of seconds to wait. Defaults to 60 if the header is missing or unparsable.
 */
function parseRetryAfter(header: string | null): number {
  if (!header) return 60;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? 60 : seconds;
}

/**
 * Sleep for the specified number of milliseconds.
 *
 * @param ms - Duration to sleep in milliseconds.
 * @returns A promise that resolves after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
