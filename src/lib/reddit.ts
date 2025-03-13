import { redditApi } from './redditApi';
import { supabase } from './supabase';
import type { SubredditInfo, SubredditPost } from './redditApi';

export type { SubredditInfo, SubredditPost };

export class RedditAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'RedditAPIError';
  }
}

export function parseSubredditName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const cleaned = input.trim();
  if (!cleaned) {
    return '';
  }

  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/([^/?#]+)/i);
  if (urlMatch) {
    return urlMatch[1].replace(/^r\//, '').toLowerCase();
  }

  const withoutPrefix = cleaned.replace(/^\/?(r\/)?/i, '').split(/[/?#]/)[0];
  return withoutPrefix.toLowerCase();
}

export function getSubredditIcon(subreddit: { icon_img: string | null; community_icon: string | null; name: string }): string {
  try {
    // Try community icon first
    if (subreddit.community_icon) {
      const cleanIcon = cleanRedditImageUrl(subreddit.community_icon);
      if (cleanIcon) return cleanIcon;
    }
    
    // Try icon_img next
    if (subreddit.icon_img) {
      const cleanIcon = cleanRedditImageUrl(subreddit.icon_img);
      if (cleanIcon) return cleanIcon;
    }
  } catch (err) {
    console.error('Error processing subreddit icon:', err);
  }
  
  // Fallback to generated avatar
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(subreddit.name)}&backgroundColor=0f0f0f&radius=12`;
}

export function cleanRedditImageUrl(url: string | null): string | null {
  if (!url) return null;
  
  // Handle special URL cases and invalid URLs 
  if (url === 'self' || url === 'default' || url === 'none' || url === 'null') {
    return null;
  }
  
  // Handle URLs with query parameters
  if (url.includes('?')) {
    try {
      const urlObj = new URL(url);
      // For Reddit CDN URLs, keep all original parameters
      if (urlObj.hostname.includes('redd.it') || 
          urlObj.hostname.includes('reddit.com') || 
          urlObj.hostname.includes('redditstatic.com')) {
        return url; // Return the original URL to preserve all Reddit's parameters
      }
      
      // For non-Reddit URLs, strip query params
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch (err) {
      console.error('Failed to parse image URL:', err);
      return url; // Return original URL if parsing fails
    }
  }
  
  return url;
}

export async function getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
  try {
    const cleanSubreddit = parseSubredditName(subreddit);
    
    if (!cleanSubreddit) {
      throw new RedditAPIError('Please enter a valid subreddit name');
    }

    // Directly fetch subreddit info from Reddit API without checking/updating the database
    const info = await redditApi.getSubredditInfo(cleanSubreddit);

    return {
      ...info,
      rules: info.rules || [] // Ensure rules array exists
    };
  } catch (error) {
    if (error instanceof RedditAPIError) {
      throw error;
    } else if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit info');
  }
}

export async function getSubredditPosts(
  subreddit: string, 
  sort: 'hot' | 'new' | 'top' = 'hot',
  limit = 100,
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
): Promise<SubredditPost[]> {
  const cleanSubreddit = parseSubredditName(subreddit);
  
  if (!cleanSubreddit) {
    throw new RedditAPIError('Please enter a valid subreddit name');
  }

  try {
    return await redditApi.getSubredditPosts(cleanSubreddit, sort, limit, timeframe);
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit posts');
  }
}

export async function searchSubreddits(query: string): Promise<SubredditInfo[]> {
  if (!query.trim()) {
    throw new RedditAPIError('Please enter a search query');
  }

  try {
    return await redditApi.searchSubreddits(query.trim());
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to search subreddits');
  }
}

export function calculateMarketingFriendliness(subreddit: SubredditInfo, posts: SubredditPost[]): number {
  let score = 0;
  const maxScore = 100;

  // Factor 1: Subscriber count (30%)
  const subscriberScore = Math.min(subreddit.subscribers / 1000000, 1) * 30;
  score += subscriberScore;

  // Factor 2: Active users ratio (20%)
  const avgEngagementRatio = posts.reduce((sum, post) => sum + (post.score + post.num_comments) / subreddit.subscribers, 0) / posts.length;
  const activeScore = Math.min(avgEngagementRatio * 10000, 1) * 20;
  score += activeScore;

  // Factor 3: Post engagement (30%)
  const avgEngagement = posts.reduce((sum, post) => sum + post.score + post.num_comments, 0) / posts.length;
  const engagementScore = Math.min(avgEngagement / 1000, 1) * 30;
  score += engagementScore;

  // Factor 4: Content restrictions (20%)
  if (subreddit.over18) {
    score -= 10;
  }

  return Math.max(0, Math.min(score, maxScore));
}

export function cleanImageUrl(url: string | null): string | null {
  if (!url) return null;

  // Handle special URL cases and invalid URLs 
  if (url === 'self' || url === 'default' || url === 'none' || url === 'null') {
    return null;
  }

  // Handle Reddit's image URLs
  if (url.includes('?')) {
    try {
      const urlObj = new URL(url);
      
      // For Reddit CDN URLs, keep all original parameters
      if (urlObj.hostname.includes('redd.it') || 
          urlObj.hostname.includes('reddit.com') || 
          urlObj.hostname.includes('redditstatic.com')) {
        return url; // Return the original URL to preserve all Reddit's parameters
      }
      
      // For non-Reddit URLs, strip query params
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch (err) {
      console.error('Failed to parse image URL:', err);
      return url; // Return original URL if parsing fails
    }
  }

  return url;
}