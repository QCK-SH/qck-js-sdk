import {
  QCKError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from './errors.js';
import type { ApiResponse, RequestOptions, ResponseMeta } from './types.js';

/** Default base URL for the QCK public API. */
const DEFAULT_BASE_URL = 'https://qck.sh/public-api/v1';
/** Default request timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT = 30_000;
/** Default number of automatic retries on transient failures. */
const DEFAULT_RETRIES = 3;
/** Maximum delay between retries in milliseconds (2 minutes). */
const MAX_RETRY_DELAY_MS = 120_000;

/** A successful response payload together with the envelope's metadata. */
export interface ResponseWithMeta<T> {
  /** The unwrapped `data` payload. */
  data: T;
  /** The envelope `meta` block (request id, timestamp, pagination). */
  meta?: ResponseMeta;
}

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
 * import { HttpClient } from '@qcksh/sdk';
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
   * @param config.baseUrl - Base URL for the API. Defaults to `'https://qck.sh/public-api/v1'`.
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
    const { data } = await this.request<T>('GET', path, undefined, options);
    return data;
  }

  /**
   * Send a GET request and return both the data payload and the envelope
   * metadata (used by paginated list endpoints, where pagination lives
   * in `meta`).
   *
   * @typeParam T - Expected response data type.
   * @param path - API endpoint path.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data together with the envelope metadata.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  async getWithMeta<T>(path: string, options?: RequestOptions): Promise<ResponseWithMeta<T>> {
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
    const { data } = await this.request<T>('POST', path, body, options);
    return data;
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
    const { data } = await this.request<T>('PATCH', path, body, options);
    return data;
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
    const { data } = await this.request<T>('PUT', path, body, options);
    return data;
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
    const { data } = await this.requestRaw<T>('PUT', path, body, contentType, options);
    return data;
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
    const { data } = await this.request<T>('DELETE', path, undefined, options);
    return data;
  }

  // ── Internal ──

  /**
   * Core request method that handles JSON serialization, retries,
   * rate-limit backoff, timeout via AbortController, and error mapping.
   *
   * Retry policy:
   * - 429 responses are retried for every method (the server confirmed the
   *   request was not processed), honoring the `Retry-After` header.
   * - Network errors and timeouts are only retried for GET requests and
   *   requests carrying an `X-Idempotency-Key` header — non-idempotent
   *   POST/PATCH/DELETE requests may have been processed by the server.
   *
   * @typeParam T - Expected response data type.
   * @param method - HTTP method.
   * @param path - API endpoint path.
   * @param body - Optional JSON-serializable request body.
   * @param options - Optional query parameters.
   * @returns The unwrapped response data and envelope metadata.
   * @throws {RateLimitError} When rate limited and all retries are exhausted.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ResponseWithMeta<T>> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    return this.send<T>(
      method,
      path,
      headers,
      body !== undefined ? JSON.stringify(body) : undefined,
      options,
    );
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
   * @returns The unwrapped response data and envelope metadata.
   * @throws {RateLimitError} When rate limited and all retries are exhausted.
   * @throws {QCKError} On API errors, network failures, or timeouts.
   */
  private async requestRaw<T>(
    method: string,
    path: string,
    body: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
    options?: RequestOptions,
  ): Promise<ResponseWithMeta<T>> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': contentType,
    };

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    return this.send<T>(method, path, headers, body as BodyInit, options);
  }

  /**
   * Shared transport: fetch with timeout, retry loop, envelope parsing,
   * and error mapping.
   *
   * @typeParam T - Expected response data type.
   * @param method - HTTP method.
   * @param path - API endpoint path.
   * @param headers - Fully assembled request headers.
   * @param body - Serialized request body, if any.
   * @param options - Optional query parameters and error acceptance list.
   * @returns The unwrapped response data and envelope metadata.
   */
  private async send<T>(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    options?: RequestOptions,
  ): Promise<ResponseWithMeta<T>> {
    const url = this.buildUrl(path, options?.params);

    // Network errors / timeouts are only safe to retry when the request is
    // idempotent: GETs, or requests carrying an idempotency key.
    const retryOnNetworkError =
      method === 'GET' || headers['X-Idempotency-Key'] !== undefined;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        // Handle rate limiting with retry (safe for all methods: the server
        // confirmed the request was not processed).
        if (response.status === 429 && attempt < this.retries) {
          const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
          clearTimeout(timeoutId);
          await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS));
          continue;
        }

        // Successful DELETE / empty body
        if (
          response.ok &&
          (response.status === 204 || response.headers.get('content-length') === '0')
        ) {
          return { data: undefined as unknown as T };
        }

        const json = await parseJsonSafe<T>(response);

        if (!response.ok) {
          // Some endpoints (e.g. bulk create with 422) return a usable
          // result payload alongside an error status.
          if (
            options?.acceptErrorStatuses?.includes(response.status) &&
            json?.data != null
          ) {
            return { data: json.data, meta: json.meta };
          }
          throw this.mapError(response, json);
        }

        if (json === undefined) {
          // 2xx with an unparsable/empty body
          return { data: undefined as unknown as T };
        }

        if (!json.success) {
          // 207 Multi-Status (e.g. bulk partial success) sets success=false
          // but still carries the result payload.
          if (json.data != null) {
            return { data: json.data, meta: json.meta };
          }
          throw this.mapError(response, json);
        }

        return { data: json.data as T, meta: json.meta };
      } catch (err: unknown) {
        if (err instanceof QCKError) {
          // API errors (including RateLimitError after exhausted retries)
          // are never retried here.
          throw err;
        }

        // Abort errors (timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new QCKError('Request timed out', 0, 'TIMEOUT');
          if (!retryOnNetworkError || attempt >= this.retries) {
            throw lastError;
          }
          continue;
        }

        // Network errors
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!retryOnNetworkError || attempt >= this.retries) {
          throw new QCKError(
            `Network error: ${lastError.message}`,
            0,
            'NETWORK_ERROR',
          );
        }

        // Exponential backoff for network errors
        await sleep(Math.min(1000 * 2 ** attempt, 10_000));
      } finally {
        clearTimeout(timeoutId);
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
   * Map an HTTP error response (with its already-parsed body) to the
   * appropriate {@link QCKError} subclass.
   *
   * Handles both error body shapes used by the API:
   * - Standard envelope: `{ success, error: { code, message, details? }, meta }`
   * - Flat middleware shape: `{ success: false, error: "CODE", message: "..." }`
   *
   * @param response - The failed HTTP response.
   * @param json - The parsed response body, if it was valid JSON.
   * @returns A typed error instance based on the HTTP status code.
   */
  private mapError(response: Response, json?: ApiResponse<unknown>): QCKError {
    let message = `HTTP ${response.status}`;
    let code = 'API_ERROR';

    if (json?.error) {
      if (typeof json.error === 'string') {
        // Flat middleware shape: { success, error: "CODE", message: "..." }
        code = json.error;
        message = json.message ?? message;
      } else {
        code = json.error.code;
        message = json.error.message;
      }
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
 * Parse a response body as the standard API envelope, returning `undefined`
 * if the body is empty or not valid JSON.
 *
 * @typeParam T - Expected data payload type.
 * @param response - The HTTP response to read.
 * @returns The parsed envelope, or `undefined` if unparsable.
 */
async function parseJsonSafe<T>(response: Response): Promise<ApiResponse<T> | undefined> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch (err) {
    // A timeout can fire while the body is being read — propagate it so the
    // caller maps it to a TIMEOUT error instead of treating it as empty.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return undefined;
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
