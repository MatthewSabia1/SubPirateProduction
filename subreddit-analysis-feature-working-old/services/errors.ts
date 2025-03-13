/**
 * Reddit API Error Classes
 * 
 * This module defines custom error classes for handling various
 * Reddit API error scenarios. Each error type provides specific
 * context and handling mechanisms for different API failures.
 */

/**
 * Base class for Reddit API errors
 */
export class RedditAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'RedditAPIError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class RedditAuthError extends RedditAPIError {
  constructor(message: string, statusCode?: number, endpoint?: string) {
    super(message, statusCode, endpoint);
    this.name = 'RedditAuthError';
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RedditRateLimitError extends RedditAPIError {
  constructor(
    message: string,
    public resetTime?: Date,
    statusCode?: number,
    endpoint?: string
  ) {
    super(message, statusCode, endpoint);
    this.name = 'RedditRateLimitError';
  }
}

/**
 * Error thrown when a resource is not found
 */
export class RedditNotFoundError extends RedditAPIError {
  constructor(message: string, statusCode?: number, endpoint?: string) {
    super(message, statusCode, endpoint);
    this.name = 'RedditNotFoundError';
  }
}

/**
 * Error thrown when access is denied
 */
export class RedditAccessError extends RedditAPIError {
  constructor(message: string, statusCode?: number, endpoint?: string) {
    super(message, statusCode, endpoint);
    this.name = 'RedditAccessError';
  }
}
