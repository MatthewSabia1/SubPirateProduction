/* src/features/subreddit-analysis/services/reddit.ts */

import fetch from 'node-fetch';
import { RedditAPIError } from './errors.js';

export class RedditAPI {
  async getSubredditStats(subreddit: string): Promise<any> {
    try {
      // Fetch basic subreddit info
      const aboutUrl = `https://www.reddit.com/r/${subreddit}/about.json`;
      const aboutResponse = await fetch(aboutUrl);
      if (!aboutResponse.ok) {
        throw new RedditAPIError(`Error fetching subreddit stats for ${subreddit}`);
      }
      const aboutData = await aboutResponse.json();

      // Fetch subreddit settings and rules
      const settingsUrl = `https://www.reddit.com/r/${subreddit}/about/rules.json`;
      const settingsResponse = await fetch(settingsUrl);
      const settingsData = settingsResponse.ok ? await settingsResponse.json() : { rules: [] };

      // Analyze rules for restrictions
      const rules = settingsData.rules || [];
      const hasKarmaRule = rules.some((rule: any) => 
        rule.description?.toLowerCase().includes('karma') || 
        rule.title?.toLowerCase().includes('karma')
      );
      const hasAgeRule = rules.some((rule: any) => 
        rule.description?.toLowerCase().includes('account age') || 
        rule.title?.toLowerCase().includes('account age')
      );
      const hasApprovalRule = rules.some((rule: any) => 
        rule.description?.toLowerCase().includes('approval') || 
        rule.title?.toLowerCase().includes('approval')
      );

      // Determine allowed content types
      const contentCategories = new Set<string>();
      if (aboutData.data.submission_type === 'any' || aboutData.data.submission_type === 'link') {
        contentCategories.add('link');
      }
      if (aboutData.data.submission_type === 'any' || aboutData.data.submission_type === 'self') {
        contentCategories.add('text');
      }
      if (!aboutData.data.restrict_posting) {
        contentCategories.add('image');
        contentCategories.add('video');
      }

      // Return standardized data structure
      return {
        name: subreddit,
        title: aboutData.data.title || subreddit,
        description: aboutData.data.description || '',
        rules: rules,
        requires_approval: hasApprovalRule || aboutData.data.restrict_posting || false,
        content_categories: Array.from(contentCategories),
        karma_required: hasKarmaRule,
        account_age_required: hasAgeRule,
        posting_requirements: {
          karma_required: hasKarmaRule,
          account_age_required: hasAgeRule,
          manual_approval: hasApprovalRule || aboutData.data.restrict_posting || false
        }
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new RedditAPIError(error.message);
      } else {
        throw new RedditAPIError('Unknown error');
      }
    }
  }
} 