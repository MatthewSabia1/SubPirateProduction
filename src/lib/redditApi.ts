import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

const CLIENT_ID = import.meta.env.VITE_REDDIT_APP_ID;
const CLIENT_SECRET = import.meta.env.VITE_REDDIT_APP_SECRET;
const REDIRECT_URI = `${window.location.origin}/auth/reddit/callback`;

if (!CLIENT_ID) {
  console.warn('Reddit Client ID not configured. Some features may be limited.');
}

if (!CLIENT_SECRET) {
  console.warn('Reddit Client Secret not configured. Some features may be limited.');
}

export interface RedditAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SubredditInfo {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  created_utc: number;
  over18: boolean;
  icon_img: string | null;
  community_icon: string | null;
  rules: Array<{
    title: string;
    description: string;
  }>;
}

export interface SubredditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  selftext: string;
  thumbnail: string | null;
  preview_url: string | null;
  post_karma?: number;
}

export interface SubredditFrequency {
  name: string;
  count: number;
  subscribers: number;
  active_users: number;
  icon_img: string | null;
  community_icon: string | null;
  lastPosts: SubredditPost[];
}

export interface RedditUserInfo {
  avatar_url: string | null;
  name: string;
  created_utc: number;
  total_karma: number;
}

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

export class RedditAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private accountId: string | null = null;
  private readonly USER_AGENT = 'web:SubPirate:1.0.0';
  private readonly CLIENT_ID = import.meta.env.VITE_REDDIT_APP_ID;
  private readonly CLIENT_SECRET = import.meta.env.VITE_REDDIT_APP_SECRET;
  private readonly TOKEN_ENDPOINT = 'https://www.reddit.com/api/v1/access_token';
  private readonly RATE_LIMIT = 60; // Reddit's rate limit per minute
  private readonly USAGE_WINDOW = 60 * 1000; // 1 minute in milliseconds
  private accountUsage: Map<string, { count: number, lastReset: number }> = new Map();
  
  // Add cache for subreddit info
  private subredditCache: Map<string, { 
    data: any;
    timestamp: number;
    expiresIn: number;
  }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  private getCachedData(key: string): any | null {
    const cached = this.subredditCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn) {
      this.subredditCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any, expiresIn: number = this.CACHE_TTL): void {
    this.subredditCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    });
  }

  private async selectBestAccount(): Promise<string | null> {
    try {
      // Get all active accounts
      const { data: accounts, error } = await supabase
        .from('reddit_accounts')
        .select('id, last_used_at, token_expiry')
        .eq('is_active', true)
        .order('last_used_at', { ascending: true });

      if (error || !accounts?.length) return null;

      // Get recent API usage for all accounts
      const now = new Date();
      const { data: usage } = await supabase
        .from('reddit_api_usage')
        .select('reddit_account_id, requests_count')
        .gte('window_start', new Date(now.getTime() - this.USAGE_WINDOW).toISOString());

      // Create a map of account usage
      const usageMap = new Map(usage?.map(u => [u.reddit_account_id, u.requests_count]) || []);

      // Find the account with the lowest recent usage
      let bestAccount = accounts[0];
      let lowestUsage = usageMap.get(accounts[0].id) || 0;

      for (const account of accounts) {
        const accountUsage = usageMap.get(account.id) || 0;
        if (accountUsage < lowestUsage) {
          bestAccount = account;
          lowestUsage = accountUsage;
        }
      }

      return bestAccount.id;
    } catch (error) {
      console.error('Error selecting best account:', error);
      return null;
    }
  }

  private async rotateAccount(): Promise<void> {
    const bestAccountId = await this.selectBestAccount();
    if (bestAccountId && bestAccountId !== this.accountId) {
      await this.setAccountAuth(bestAccountId);
    }
  }

  private async ensureAuth(): Promise<void> {
    // If no account is selected or token is expired, try to rotate
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      if (!this.accountId) {
        await this.rotateAccount();
      }
      
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        // Fall back to public API if no accounts available
        this.accessToken = 'public';
        this.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      }
    }

    // Check if current account is rate limited
    if (this.accountId) {
      const usage = this.accountUsage.get(this.accountId);
      const now = Date.now();
      
      if (usage) {
        // Reset count if window has passed
        if (now - usage.lastReset >= this.USAGE_WINDOW) {
          this.accountUsage.set(this.accountId, { count: 0, lastReset: now });
        }
        // Rotate account if near rate limit
        else if (usage.count >= this.RATE_LIMIT * 0.8) { // 80% of rate limit
          await this.rotateAccount();
        }
      } else {
        this.accountUsage.set(this.accountId, { count: 0, lastReset: now });
      }
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.accountId) {
      throw new Error('No refresh token available');
    }

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new Error('Reddit client credentials are not configured properly. Check VITE_REDDIT_APP_ID and VITE_REDDIT_APP_SECRET.');
    }

    try {
      const authString = btoa(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`);
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      });

      // Detailed logging before the request
      console.log('Preparing to refresh token with:', {
        clientId: this.CLIENT_ID,
        accountId: this.accountId,
        endpoint: this.TOKEN_ENDPOINT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`,
          'User-Agent': this.USER_AGENT
        },
        body: params.toString()
      });

      const response = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`,
          'User-Agent': this.USER_AGENT
        },
        body: params.toString()
      });

      const responseText = await response.text();
      console.log('Token refresh response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        requestUrl: response.url
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      if (!data.access_token) {
        throw new Error('Invalid token response from Reddit');
      }

      const expiresAt = Date.now() + (data.expires_in * 1000);

      // Update tokens in database
      const { error } = await supabase
        .from('reddit_accounts')
        .update({
          access_token: data.access_token,
          token_expiry: new Date(expiresAt).toISOString(),
          last_used_at: new Date().toISOString()
        })
        .eq('id', this.accountId);

      if (error) {
        throw error;
      }

      this.accessToken = data.access_token;
      this.expiresAt = expiresAt;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  async setAccountAuth(accountId: string): Promise<void> {
    const { data: account, error } = await supabase
      .from('reddit_accounts')
      .select('access_token, refresh_token, token_expiry')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      throw new RedditAPIError('Failed to get account credentials');
    }

    this.accountId = accountId;
    this.accessToken = account.access_token;
    this.refreshToken = account.refresh_token;
    this.expiresAt = account.token_expiry ? new Date(account.token_expiry).getTime() : 0;
  }

  private async trackApiUsage(endpoint: string): Promise<void> {
    if (!this.accountId) return;

    const now = new Date();

    try {
      // Use SHA-256 hashing to match the database trigger
      const encoder = new TextEncoder();
      const data = encoder.encode(endpoint);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const endpointHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);

      // Use upsert with on_conflict to handle both insert and update
      await supabase
        .from('reddit_api_usage')
        .upsert({
          reddit_account_id: this.accountId,
          endpoint: endpoint,
          endpoint_hash: endpointHash,
          requests_count: 1,
          window_start: now.toISOString(),
          reset_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour window
          updated_at: now.toISOString()
        }, {
          onConflict: 'reddit_account_id,endpoint_hash',
          ignoreDuplicates: false
        });
    } catch (err) {
      // Log error but don't throw - we want to continue even if tracking fails
      console.error('Error tracking API usage:', err);
    }
  }

  private async verifyCredentials(): Promise<void> {
    // Check if we have valid app credentials
    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new RedditAPIError('Reddit client credentials are not configured properly. Check VITE_REDDIT_APP_ID and VITE_REDDIT_APP_SECRET.');
    }

    // Check if we have valid account credentials
    if (this.accountId) {
      const { data: account, error } = await supabase
        .from('reddit_accounts')
        .select('client_id, client_secret')
        .eq('id', this.accountId)
        .single();

      if (error) {
        throw new RedditAPIError('Failed to verify account credentials');
      }

      // Verify the account is using the correct app credentials
      if (account.client_id !== this.CLIENT_ID || account.client_secret !== this.CLIENT_SECRET) {
        throw new RedditAPIError('Account credentials do not match current app credentials');
      }
    }
  }

  private async request(endpoint: string, options: RequestInit = {}, useOAuth: boolean = true): Promise<any> {
    try {
      // Verify credentials before making request
      await this.verifyCredentials();

      // Ensure we have valid auth if using OAuth
      if (useOAuth) {
        await this.ensureAuth();
      }

      const baseUrl = useOAuth ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

      const headers = new Headers(options.headers);
      
      // Add required headers
      headers.set('User-Agent', this.USER_AGENT);
      
      if (useOAuth && this.accessToken) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
      }

      const requestOptions: RequestInit = {
        ...options,
        headers,
        credentials: 'omit' // Prevent browser from sending cookies
      };

      // Get account details for logging
      let accountDetails = null;
      if (this.accountId) {
        const { data: account } = await supabase
          .from('reddit_accounts')
          .select('username, client_id')
          .eq('id', this.accountId)
          .single();
        accountDetails = account;
      }

      // Log request details for debugging (excluding sensitive info)
      console.log('Making Reddit API request:', {
        url,
        method: requestOptions.method || 'GET',
        useOAuth,
        accountId: this.accountId,
        accountUsername: accountDetails?.username || 'none',
        clientId: accountDetails?.client_id === this.CLIENT_ID ? 'matching' : 'mismatch',
        headers: {
          'User-Agent': this.USER_AGENT,
          'Authorization': this.accessToken ? 'Bearer [REDACTED]' : undefined
        }
      });

      const response = await fetch(url, requestOptions);

      // Log response details for debugging
      console.log('Reddit API response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        endpoint,
        accountId: this.accountId,
        accountUsername: accountDetails?.username || 'none'
      });

      // Update usage tracking
      if (this.accountId) {
        const usage = this.accountUsage.get(this.accountId);
        if (usage) {
          usage.count++;
          this.accountUsage.set(this.accountId, usage);
        }
      }

      // Track API usage in database
      await this.trackApiUsage(endpoint);

      if (!response.ok) {
        const responseText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText };
        }

        console.error('Reddit API error:', {
          status: response.status,
          endpoint,
          accountId: this.accountId,
          accountUsername: accountDetails?.username || 'none',
          error: errorData
        });

        if (response.status === 429) {
          // Rate limit hit, rotate account and retry
          await this.rotateAccount();
          return this.request(endpoint, options, useOAuth);
        }
        if (response.status === 401 && useOAuth) {
          // Token expired or invalid, try refreshing
          await this.refreshAccessToken();
          return this.request(endpoint, options, useOAuth);
        }
        if (response.status === 403) {
          // Check if it's a credentials issue
          if (responseText.includes('invalid_grant') || responseText.includes('invalid_token')) {
            throw new RedditAPIError('Invalid Reddit credentials. Please reconnect your account.', 403, endpoint);
          }
        }
        throw new RedditAPIError(`Reddit API error: ${response.status} ${response.statusText} - ${errorData.error || responseText}`, response.status, endpoint);
      }

      return response.json();
    } catch (error) {
      console.error('Reddit API request failed:', error);
      if (error instanceof RedditAPIError) {
        throw error;
      }
      throw new RedditAPIError('Failed to connect to Reddit. Please check your internet connection.');
    }
  }

  private async getRedditProfilePic(username: string): Promise<string | null> {
    try {
      const data = await this.request(`/user/${username}/about`, {}, true);

      if (!data?.data) {
        throw new Error('Invalid response');
      }

      // Handle both icon_img and snoovatar_img
      const avatarUrl = data.data.icon_img || data.data.snoovatar_img;
      return avatarUrl ? avatarUrl.split('?')[0] : null;
    } catch (error) {
      console.error("Error fetching Reddit profile picture:", error);
      return `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=111111`;
    }
  }

  parseUsername(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const cleaned = input.trim();
    if (!cleaned) {
      return '';
    }

    // Handle full Reddit profile URLs
    const urlMatch = cleaned.match(
      /(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:user|u)\/([^/?#]+)/i
    );
    if (urlMatch) {
      return urlMatch[1].toLowerCase();
    }

    // Handle u/username format
    const withoutPrefix = cleaned.replace(/^\/?(u\/)?/i, '').split(/[/?#]/)[0];
    return withoutPrefix.toLowerCase();
  }

  private async handleResponse(response: Response, endpoint: string) {
    // Handle specific HTTP status codes
    if (response.status === 404) {
      throw new RedditAPIError('Subreddit not found', 404, endpoint);
    }

    if (response.status === 403) {
      const responseText = await response.text();
      if (responseText.includes('quarantined')) {
        throw new RedditAPIError('This subreddit is quarantined', 403, endpoint);
      } else if (responseText.includes('private')) {
        throw new RedditAPIError('This subreddit is private', 403, endpoint);
      } else if (responseText.includes('banned')) {
        throw new RedditAPIError('This subreddit has been banned', 403, endpoint);
      } else {
        throw new RedditAPIError('Access denied', 403, endpoint);
      }
    }

    if (response.status === 429) {
      throw new RedditAPIError(
        'Too many requests. Please try again later.',
        429,
        endpoint
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new RedditAPIError(
        error.message || `Reddit API error (${response.status})`,
        response.status,
        endpoint
      );
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof RedditAPIError && error.status === 429) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    
    throw lastError;
  }

  private async safeRequest(endpoint: string): Promise<any> {
    return this.retryWithBackoff(() => this.request(endpoint));
  }

  private async batchFetchSubreddits(subreddits: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    try {
      // Build a comma-separated list of subreddit names
      const subredditNames = subreddits.join(',');
      
      // Make a single request for all subreddits
      const data = await this.safeRequest(`/api/info?sr_name=${subredditNames}`);
      
      if (data?.data?.children) {
        // Process batch response
        data.data.children.forEach((child: any) => {
          if (child.data) {
            const name = child.data.display_name;
            if (!results[name]) { // Only store if we don't already have this subreddit
              results[name] = child.data;
            }
          }
        });
      }

      // If we got no results or fewer than expected, fall back to individual requests
      const missingSubreddits = subreddits.filter(sub => !results[sub]);
      if (missingSubreddits.length > 0) {
        console.log(`Falling back to individual requests for ${missingSubreddits.length} subreddits`);
        
        // Make individual requests in parallel for missing subreddits
        const individualPromises = missingSubreddits.map(async (subreddit) => {
          try {
            const response = await this.safeRequest(`/r/${subreddit}/about.json`);
            if (response?.data) {
              results[subreddit] = response.data;
            }
          } catch (error) {
            console.warn(`Failed to fetch individual subreddit r/${subreddit}:`, error);
          }
        });

        await Promise.all(individualPromises);
      }
    } catch (error) {
      console.warn('Batch request failed, falling back to individual requests:', error);
      
      // Fall back to individual requests for all subreddits
      const individualPromises = subreddits.map(async (subreddit) => {
        try {
          const response = await this.safeRequest(`/r/${subreddit}/about.json`);
          if (response?.data) {
            results[subreddit] = response.data;
          }
        } catch (error) {
          console.warn(`Failed to fetch individual subreddit r/${subreddit}:`, error);
        }
      });

      await Promise.all(individualPromises);
    }

    return results;
  }

  async analyzePostFrequency(
    posts: SubredditPost[]
  ): Promise<SubredditFrequency[]> {
    // Group posts by subreddit and count posts per subreddit
    const frequencies = new Map<
      string,
      { count: number; posts: SubredditPost[] }
    >();

    // First pass: group posts and calculate frequencies
    posts.forEach((post) => {
      const current = frequencies.get(post.subreddit) || { count: 0, posts: [] };
      frequencies.set(post.subreddit, {
        count: current.count + 1,
        posts: [...current.posts, post]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      });
    });

    // Sort subreddits by post count and limit to top 20
    const sortedSubreddits = Array.from(frequencies.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    // Create a map of subreddit names to their frequency data
    const subredditMap = new Map(sortedSubreddits);
    const results: SubredditFrequency[] = [];
    const subredditsToFetch = new Set<string>();

    // Check cache first for all subreddits
    for (const [subreddit] of sortedSubreddits) {
      const cachedData = this.getCachedData(`subreddit:${subreddit}`);
      if (cachedData) {
        const freqData = subredditMap.get(subreddit);
        if (freqData) {
          results.push({
            name: cachedData.display_name,
            count: freqData.count,
            subscribers: cachedData.subscribers || 0,
            active_users: cachedData.active_user_count || 0,
            icon_img: this.cleanImageUrl(cachedData.icon_img),
            community_icon: this.cleanImageUrl(cachedData.community_icon),
            lastPosts: freqData.posts,
          });
        }
      } else {
        subredditsToFetch.add(subreddit);
      }
    }

    // If we have subreddits to fetch, do it in one batch
    if (subredditsToFetch.size > 0) {
      try {
        // Fetch all subreddits in a single batch
        const batchData = await this.batchFetchSubreddits(Array.from(subredditsToFetch));

        // Process all subreddits
        for (const subreddit of subredditsToFetch) {
          const data = batchData[subreddit];
          if (!data) {
            console.warn(`No data received for r/${subreddit}`);
            continue;
          }

          // Cache the response immediately
          this.setCachedData(`subreddit:${subreddit}`, data);

          const freqData = subredditMap.get(subreddit);
          if (!freqData) continue;

          results.push({
            name: data.display_name,
            count: freqData.count,
            subscribers: data.subscribers || 0,
            active_users: data.active_user_count || 0,
            icon_img: this.cleanImageUrl(data.icon_img),
            community_icon: this.cleanImageUrl(data.community_icon),
            lastPosts: freqData.posts,
          });
        }
      } catch (error) {
        console.warn(`Error fetching subreddits:`, error);
      }
    }

    // Sort results to match original frequency order
    return results.sort((a, b) => {
      const aCount = subredditMap.get(a.name)?.count || 0;
      const bCount = subredditMap.get(b.name)?.count || 0;
      return bCount - aCount;
    });
  }

  private decodeHtmlEntities(text: string): string {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  private cleanMarkdown(text: string): string {
    if (!text) return '';
    return text
      // Remove markdown links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bold
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Remove italic
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove blockquotes
      .replace(/^>(.+)$/gm, '$1')
      // Remove headers
      .replace(/#{1,6}\s/g, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove horizontal rules
      .replace(/^-{3,}|_{3,}|\*{3,}$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+][\s]+/gm, '')
      .replace(/^[\s]*\d+\.[\s]+/gm, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse multiple newlines
      .replace(/\n{2,}/g, ' ')
      // Collapse multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Trim whitespace
      .trim();
  }

  private cleanImageUrl(url: string | null): string | null {
    if (!url) return null;

    // Handle special URL cases and invalid URLs 
    if (url === 'self' || url === 'default' || url === 'none' || url === 'null') {
      return null;
    }
    
    // For nsfw thumbnails, we need to return null to avoid showing broken images,
    // but we'll handle this better elsewhere by using alternative sources
    if (url === 'nsfw' || url === 'spoiler') {
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

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    try {
      const data = await this.request(`/r/${subreddit}/about.json`);

      if (!data?.data) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'about');
      }

      const info = data.data;

      // Get subreddit rules
      let rules = [];
      try {
        const rulesData = await this.request(`/r/${subreddit}/about/rules.json`);
        rules = rulesData.rules?.map((rule: any) => ({
          title: this.decodeHtmlEntities(rule.short_name || rule.title || ''),
          description: this.decodeHtmlEntities(rule.description || '')
        })) || [];
      } catch (err) {
        console.warn('Failed to fetch subreddit rules:', err);
        rules = [];
      }

      // Clean and validate icons
      const icon_img = this.cleanImageUrl(info.icon_img);
      const community_icon = this.cleanImageUrl(info.community_icon);

      return {
        name: info.display_name,
        title: this.decodeHtmlEntities(info.title || info.display_name),
        subscribers: info.subscribers || 0,
        active_users: info.active_user_count || 0,
        description: this.cleanMarkdown(
          this.decodeHtmlEntities(info.public_description || info.description || '')
        ),
        created_utc: info.created_utc,
        over18: info.over_18 || false,
        icon_img,
        community_icon,
        rules,
      };
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to get subreddit information', 0, 'about');
    }
  }

  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    limit: number = 100,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<SubredditPost[]> {
    try {
      const endpoint = `/r/${subreddit}/${sort}.json?limit=${limit}&t=${timeframe}`;
      const data = await this.request(endpoint);

      if (!data?.data?.children) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'posts');
      }

      return data.data.children
        .filter((child: any) => child.data && !child.data.stickied)
        .map((child: any) => ({
          id: child.data.id,
          title: this.decodeHtmlEntities(child.data.title),
          author: child.data.author,
          subreddit: child.data.subreddit,
          created_utc: child.data.created_utc,
          score: child.data.score,
          num_comments: child.data.num_comments,
          url: child.data.url,
          selftext: this.cleanMarkdown(
            this.decodeHtmlEntities(child.data.selftext || '')
          ),
          thumbnail: this.cleanImageUrl(child.data.thumbnail),
          preview_url: child.data.preview?.images?.[0]?.source?.url || null,
          post_karma: child.data.author_karma || 0
        }));
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to get subreddit posts', 0, 'posts');
    }
  }

  async searchSubreddits(query: string): Promise<SubredditInfo[]> {
    try {
      const data = await this.request(
        `/subreddits/search.json?q=${encodeURIComponent(query)}&limit=20&include_over_18=true`
      );

      if (!data.data?.children) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'search');
      }

      return data.data.children
        .filter((child: any) => child.data)
        .map((child: any) => {
          const icon_img = this.cleanImageUrl(child.data.icon_img);
          const community_icon = this.cleanImageUrl(child.data.community_icon);

          return {
            name: child.data.display_name,
            title: this.decodeHtmlEntities(child.data.title || child.data.display_name),
            subscribers: child.data.subscribers || 0,
            active_users: child.data.active_user_count || 0,
            description: this.cleanMarkdown(
              this.decodeHtmlEntities(child.data.public_description || child.data.description || '')
            ),
            created_utc: child.data.created_utc,
            over18: child.data.over_18 || false,
            icon_img,
            community_icon,
            rules: [],
          };
        });
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to search subreddits', 0, 'search');
    }
  }

  public async getUserPosts(username: string, sort: 'new' | 'top' = 'new'): Promise<SubredditPost[]> {
    // Clean up username
    const cleanUsername = this.parseUsername(username);
    if (!cleanUsername) {
      throw new RedditAPIError('Invalid username format', 400, 'user/about');
    }

    // First verify the user exists and get their posts
    try {
      const userInfoResponse = await this.request(`/user/${cleanUsername}/about.json`, {}, true);
      if (!userInfoResponse?.data) {
        throw new RedditAPIError(`User ${cleanUsername} not found`, 404, 'user/about');
      }

      // Get user's posts
      const endpoint = `/user/${cleanUsername}/submitted?limit=25&sort=${sort}${sort === 'top' ? '&t=all' : ''}`;
      const response = await this.request(endpoint, {}, true);

      if (!response?.data?.children) {
        throw new RedditAPIError(`No posts found for user ${cleanUsername}`, 404, endpoint);
      }

      // Cache user info for future use
      this.setCachedData(`user:${cleanUsername}`, userInfoResponse.data);

      return this.normalizeRedditPosts(response.data.children);
    } catch (error) {
      // Handle specific Reddit API errors
      if (error instanceof RedditAPIError) {
        if (error.status === 403) {
          throw new RedditAPIError(`User ${cleanUsername} is private or suspended`, 403, 'user/about');
        }
        if (error.status === 404) {
          throw new RedditAPIError(`User ${cleanUsername} not found`, 404, 'user/about');
        }
        // Let other RedditAPIError instances propagate as-is
        throw error;
      }
      
      // For network or other unexpected errors, wrap with meaningful context
      throw new RedditAPIError(
        `Failed to fetch posts for user ${cleanUsername}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'user/posts'
      );
    }
  }

  private normalizeRedditPosts(children: any[]): SubredditPost[] {
    return children
      .filter((child: any) => child.data && !child.data.stickied)
      .map((child: any) => {
        // Get the best preview image
        let preview_url = null;
        if (child.data.preview?.images?.[0]) {
          const image = child.data.preview.images[0];
          // Try to get a medium-sized preview if available
          const mediumPreview = image.resolutions?.find((r: any) => r.width >= 320 && r.width <= 640);
          preview_url = this.cleanImageUrl(
            mediumPreview?.url || 
            image.source?.url || 
            null
          );
        }

        // Clean and validate thumbnail
        let thumbnail = this.cleanImageUrl(child.data.thumbnail);
        // Filter out special thumbnail values that aren't URLs
        if (thumbnail && ['self', 'default'].includes(thumbnail)) {
          thumbnail = null;
        }

        return {
          id: child.data.id,
          title: this.decodeHtmlEntities(child.data.title),
          author: child.data.author,
          subreddit: child.data.subreddit,
          created_utc: child.data.created_utc,
          score: child.data.score,
          num_comments: child.data.num_comments,
          url: child.data.url,
          selftext: this.decodeHtmlEntities(child.data.selftext || ''),
          thumbnail,
          preview_url,
          post_karma: child.data.author_karma || 0
        };
      });
  }

  async getUserInfo(username: string): Promise<RedditUserInfo | null> {
    try {
      const cleanUsername = this.parseUsername(username);
      if (!cleanUsername) return null;

      const response = await fetch(`https://www.reddit.com/user/${cleanUsername}/about.json`);
      if (!response.ok) return null;

      const data = await response.json();
      if (!data?.data) return null;

      return {
        avatar_url: data.data.icon_img || data.data.snoovatar_img || null,
        name: data.data.name,
        created_utc: data.data.created_utc,
        total_karma: (data.data.link_karma || 0) + (data.data.comment_karma || 0)
      };
    } catch (err) {
      console.error('Error fetching user info:', err);
      return null;
    }
  }
}

export const redditApi = new RedditAPI();