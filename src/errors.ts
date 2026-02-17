/**
 * Base error class for all QCK SDK errors.
 */
export class QCKError extends Error {
  public readonly status: number;
  public readonly code: string;

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
 */
export class AuthenticationError extends QCKError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the request is rate limited (HTTP 429).
 * Contains the number of seconds to wait before retrying.
 */
export class RateLimitError extends QCKError {
  public readonly retryAfter: number;

  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the requested resource is not found (HTTP 404).
 */
export class NotFoundError extends QCKError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when the request body fails validation (HTTP 400).
 */
export class ValidationError extends QCKError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
