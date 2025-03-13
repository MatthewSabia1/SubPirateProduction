/* src/features/subreddit-analysis/services/errors.ts */

export class RedditAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedditAPIError';
  }
}

export class RedditAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedditAuthError';
  }
}

export class RedditRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedditRateLimitError';
  }
}

export class RedditNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedditNotFoundError';
  }
}

export class RedditAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedditAccessError';
  }
} 