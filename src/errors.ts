/**
 * Base error class for all QCK SDK errors.
 *
 * @description Every error thrown by the SDK extends this class, making it easy
 * to catch all QCK-specific errors with a single `catch` block.
 *
 * @example
 * ```ts
 * try {
 *   await qck.links.get('non-existent-id');
 * } catch (err) {
 *   if (err instanceof QCKError) {
 *     console.error(`[${err.code}] ${err.message} (HTTP ${err.status})`);
 *   }
 * }
 * ```
 */
export class QCKError extends Error {
  /** HTTP status code returned by the API (0 for network/timeout errors). */
  public readonly status: number;
  /** Machine-readable error code (e.g. `'VALIDATION_ERROR'`, `'TIMEOUT'`). */
  public readonly code: string;

  /**
   * @param message - Human-readable error description.
   * @param status - HTTP status code from the API response.
   * @param code - Machine-readable error code.
   */
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'QCKError';
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the API key is invalid or missing (HTTP 401).
 *
 * @description This error indicates that the provided API key was rejected
 * by the server. Verify that the key is correct and has not been revoked.
 */
export class AuthenticationError extends QCKError {
  /**
   * @param message - Error message describing the authentication failure.
   */
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the request is rate limited (HTTP 429).
 *
 * @description The SDK automatically retries rate-limited requests up to the
 * configured retry count. This error is only thrown after all retries are exhausted.
 * Check `retryAfter` for the number of seconds to wait before making another request.
 */
export class RateLimitError extends QCKError {
  /** Number of seconds the client should wait before retrying. */
  public readonly retryAfter: number;

  /**
   * @param message - Error message describing the rate limit.
   * @param retryAfter - Seconds to wait before retrying, from the `Retry-After` header.
   */
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the requested resource is not found (HTTP 404).
 *
 * @description The link, webhook, domain, or other resource identified by the
 * given ID does not exist or is not accessible to the authenticated account.
 */
export class NotFoundError extends QCKError {
  /**
   * @param message - Error message describing what was not found.
   */
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when the request body fails validation (HTTP 400).
 *
 * @description The request payload contained invalid or missing fields.
 * Review the error message for details on which fields failed validation.
 */
export class ValidationError extends QCKError {
  /**
   * @param message - Error message describing the validation failure.
   */
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
