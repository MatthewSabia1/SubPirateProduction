/**
 * Reddit API Integration Service
 * 
 * This service provides a comprehensive interface to interact with Reddit's API,
 * specifically focused on subreddit analysis and data gathering.
 * 
 * Features:
 * - OAuth2 authentication with Reddit API
 * - Subreddit statistics and analysis
 * - User profile and post history retrieval
 * - Automated retry mechanism for failed requests
 * - Comprehensive error handling
 * 
 * Required Environment Variables:
 * - REDDIT_CLIENT_ID: Your Reddit application client ID
 * - REDDIT_CLIENT_SECRET: Your Reddit application client secret
 * 
 * Usage:
 * ```typescript
 * const redditAPI = new RedditAPI();
 * const stats = await redditAPI.getSubredditStats('programming');
 * ```
 */

import { URLSearchParams } from "url";
import { redditLogger as logger } from './logger';
import { 
  RedditAPIError, 
  RedditAuthError, 
  RedditRateLimitError,
  RedditNotFoundError,
  RedditAccessError 
} from './errors';

// Rest of the file content remains the same
/* content omitted */
