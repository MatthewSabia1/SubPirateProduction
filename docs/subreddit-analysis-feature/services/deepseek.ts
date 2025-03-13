/**
 * DeepSeek API Integration Service for Subreddit Analysis
 * 
 * This service provides AI-powered analysis of subreddit data using the DeepSeek API.
 * It processes subreddit statistics, post patterns, and engagement metrics to generate
 * actionable marketing insights.
 */

import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from '../lib/prompts';

interface SubredditData {
  rules: any[];
  subscribers: number;
  active_users: number;
  posts_per_day?: number;
  karma_required?: number;
  requires_approval: boolean;
  historical_posts?: any[];
  engagement_metrics?: {
    avgScore: number;
    avgComments: number;
    avgUpvoteRatio: number;
  };
}

interface AnalysisResult {
  subreddit: string;
  subscribers: number;
  activeUsers: number;
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };
  postingGuidelines: {
    allowedTypes: string[];
    restrictions: string[];
    recommendations: string[];
  };
  contentStrategy: {
    postTypes: string[];
    timing: Array<{ hour: number; timezone: string }>;
    topics: string[];
  };
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
}

export class DeepSeek {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }
    this.apiKey = apiKey;
  }

  /**
   * Analyzes a subreddit using the DeepSeek AI model
   * @param data SubredditData object containing stats and metrics
   * @returns Analyzed insights and recommendations
   */
  async analyzeSubreddit(data: SubredditData): Promise<AnalysisResult> {
    try {
      const prompt = this.buildPrompt(data);
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformResponse(result.choices[0].message.content);
    } catch (error) {
      console.error('DeepSeek analysis failed:', error);
      throw error;
    }
  }

  /**
   * Builds the analysis prompt with the provided subreddit data
   */
  private buildPrompt(data: SubredditData): string {
    return ANALYSIS_PROMPT
      .replace('{rules}', JSON.stringify(data.rules, null, 2))
      .replace('{subscribers}', data.subscribers.toString())
      .replace('{activeUsers}', data.active_users.toString())
      .replace('{postsPerDay}', (data.posts_per_day || 0).toString())
      .replace('{historicalPosts}', JSON.stringify(data.historical_posts || [], null, 2))
      .replace('{engagementMetrics}', JSON.stringify(data.engagement_metrics || {}, null, 2));
  }

  /**
   * Transforms the raw AI response into the structured AnalysisResult format
   */
  private transformResponse(rawResponse: string): AnalysisResult {
    try {
      const parsed = JSON.parse(rawResponse);

      // Validate and transform the response structure
      return {
        subreddit: parsed.subreddit,
        subscribers: parsed.subscribers,
        activeUsers: parsed.activeUsers,
        marketingFriendliness: {
          score: parsed.marketingFriendliness.score,
          reasons: parsed.marketingFriendliness.reasons || [],
          recommendations: parsed.marketingFriendliness.recommendations || [],
        },
        postingGuidelines: {
          allowedTypes: parsed.postingGuidelines.allowedTypes || [],
          restrictions: parsed.postingGuidelines.restrictions || [],
          recommendations: parsed.postingGuidelines.recommendations || [],
        },
        contentStrategy: {
          postTypes: parsed.contentStrategy.postTypes || [],
          timing: parsed.contentStrategy.timing || [],
          topics: parsed.contentStrategy.topics || [],
        },
        strategicAnalysis: {
          strengths: parsed.strategicAnalysis.strengths || [],
          weaknesses: parsed.strategicAnalysis.weaknesses || [],
          opportunities: parsed.strategicAnalysis.opportunities || [],
        },
      };
    } catch (error) {
      console.error('Failed to transform DeepSeek response:', error);
      throw new Error('Invalid analysis response format');
    }
  }
}

export const deepseek = new DeepSeek();

const subredditData: SubredditData = {
  rules: [],
  subscribers: 1000,
  active_users: 500,
  requires_approval: false,
  posts_per_day: 10,
  karma_required: 0,
  historical_posts: [],
  engagement_metrics: {
    avgScore: 0,
    avgComments: 0,
    avgUpvoteRatio: 0
  }
};

async function analyze() {
    const analysis = await deepseek.analyzeSubreddit(subredditData);
    console.log(analysis);
}

analyze();