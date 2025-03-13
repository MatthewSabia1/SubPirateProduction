// Web Worker for handling subreddit analysis
import { analyzeSubreddit } from '../lib/openRouter';
import { SubredditInfo, SubredditPost } from '../lib/reddit';
import { AnalysisResult, AnalysisProgress } from '../lib/analysis';

// Add a marker to show we're using the updated worker
console.log("*** USING UPDATED ANALYSIS WORKER WITH GENEROUS SCORING ***");

interface WorkerMessage {
  info: SubredditInfo;
  posts: SubredditPost[];
  analysisId: string;
}

interface SubredditAnalysisInput {
  name: string;
  title: string;
  description: string;
  rules: {
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }[];
  content_categories: string[];
  posting_requirements: {
    karma_required: boolean;
    account_age_required: boolean;
    manual_approval: boolean;
  };
  allowed_content_types: string[];
}

interface EngagementMetrics {
  avg_comments: number;
  avg_score: number;
  peak_hours: number[];
  interaction_rate: number;
  posts_per_hour: number[];
}

interface ScoredPost extends SubredditPost {
  engagement_score: number;
}

interface AnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: Array<ScoredPost & { engagement_rate: number }>;
  engagement_metrics: EngagementMetrics;
  rules: Array<{
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }>;
}

// Helper functions from analysis.ts
function calculateEngagementMetrics(posts: SubredditPost[]): EngagementMetrics | null {
  const totalPosts = posts.length;
  if (totalPosts === 0) return null;

  const avgComments = posts.reduce((sum, post) => sum + post.num_comments, 0) / totalPosts;
  const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / totalPosts;
  
  const postTimes = posts.map(post => new Date(post.created_utc * 1000).getHours());
  const hourCounts = new Array(24).fill(0);
  postTimes.forEach(hour => hourCounts[hour]++);
  
  const maxPosts = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count >= maxPosts * 0.8)
    .map(({ hour }) => hour);

  const interactionRate = (avgComments + avgScore) / totalPosts;

  return {
    avg_comments: avgComments,
    avg_score: avgScore,
    peak_hours: peakHours,
    interaction_rate: interactionRate,
    posts_per_hour: hourCounts
  };
}

function formatBestPostingTimes(peakHours: number[]): string[] {
  return peakHours.map(hour => {
    const period = hour < 12 ? 'AM' : 'PM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${period} - ${formattedHour}:59 ${period}`;
  });
}

function getRecommendedContentTypes(posts: SubredditPost[]): string[] {
  const types = new Set<string>();
  
  posts.forEach(post => {
    if (post.selftext.length > 0) types.add('text');
    if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
    if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
    if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
      types.add('link');
    }
  });

  return Array.from(types);
}

function analyzeRuleMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
  const text = `${rule.title} ${rule.description}`.toLowerCase();
  
  const highImpactKeywords = [
    'spam', 'promotion', 'advertising', 'marketing', 'self-promotion',
    'commercial', 'business', 'selling', 'merchandise', 'affiliate'
  ];
  
  const mediumImpactKeywords = [
    'quality', 'format', 'title', 'flair', 'tags',
    'submission', 'guidelines', 'requirements', 'posting'
  ];
  
  if (highImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

function calculateMarketingScore(input: AnalysisInput): number {
  // Start with a high baseline
  let score = 85;
  
  // Reduced penalties for restrictive rules
  const restrictiveRules = input.rules.filter(r => 
    r.marketingImpact === 'high' || 
    r.title.toLowerCase().includes('promot') || 
    r.title.toLowerCase().includes('spam')
  );
  
  score -= restrictiveRules.length * 4; // Reduced penalty
  
  // Bonus for active communities
  if (input.active_users > 1000) {
    score += 5;
  }
  
  // Bonus for post frequency
  if (input.posts_per_day > 50) {
    score += 3;
  }
  
  // Never go below 60%
  return Math.min(98, Math.max(60, score));
}

function prepareAnalysisInput(info: SubredditInfo, posts: SubredditPost[]): AnalysisInput {
  const engagement = calculateEngagementMetrics(posts);
  if (!engagement) {
    throw new Error('Not enough post data for analysis');
  }

  const historicalPosts = posts.map(post => ({
    ...post,
    engagement_rate: (post.score + post.num_comments) / engagement.interaction_rate,
    engagement_score: (post.score * 0.75 + post.num_comments * 0.25)
  }));

  const rulesWithImpact = info.rules.map(rule => ({
    ...rule,
    marketingImpact: analyzeRuleMarketingImpact(rule)
  }));

  return {
    name: info.name,
    title: info.title,
    subscribers: info.subscribers,
    active_users: info.active_users,
    description: info.description,
    posts_per_day: posts.length / 7,
    historical_posts: historicalPosts,
    engagement_metrics: engagement,
    rules: rulesWithImpact.map((rule, index) => ({
      title: rule.title,
      description: rule.description,
      priority: index + 1,
      marketingImpact: rule.marketingImpact
    }))
  };
}

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { info, posts, analysisId } = e.data;

  try {
    // Prepare input data focused only on marketing potential
    const input: SubredditAnalysisInput = {
      name: info.name,
      title: info.title,
      description: info.description?.substring(0, 1000),
      rules: info.rules.map((rule, index) => ({
        title: rule.title,
        description: rule.description,
        priority: index + 1,
        marketingImpact: determineMarketingImpact(rule)
      })),
      content_categories: determineContentCategories(info),
      posting_requirements: {
        karma_required: detectKarmaRequirement(info),
        account_age_required: detectAgeRequirement(info),
        manual_approval: false
      },
      allowed_content_types: determineAllowedContentTypes(info, posts)
    };

    // Run analysis with marketing-focused data
    const result = await analyzeSubreddit(input);

    // Post back the results
    self.postMessage({
      type: 'success',
      analysisId,
      result
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      analysisId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Helper functions for determining marketing-relevant data
function determineMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
  const text = `${rule.title} ${rule.description}`.toLowerCase();
  
  const highImpactKeywords = [
    'spam', 'promotion', 'advertising', 'marketing', 'self-promotion',
    'commercial', 'business', 'selling', 'merchandise', 'affiliate'
  ];
  
  const mediumImpactKeywords = [
    'quality', 'format', 'title', 'flair', 'tags',
    'submission', 'guidelines', 'requirements', 'posting'
  ];
  
  if (highImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

function determineContentCategories(info: SubredditInfo): string[] {
  const categories = new Set<string>();
  const description = info.description?.toLowerCase() || '';
  const title = info.title.toLowerCase();

  // Extract categories from title and description
  const commonCategories = [
    'discussion', 'news', 'media', 'art', 'gaming',
    'technology', 'business', 'entertainment', 'education'
  ];

  commonCategories.forEach(category => {
    if (description.includes(category) || title.includes(category)) {
      categories.add(category);
    }
  });

  return Array.from(categories);
}

function detectKarmaRequirement(info: SubredditInfo): boolean {
  const rulesText = info.rules
    .map(rule => `${rule.title} ${rule.description}`)
    .join(' ')
    .toLowerCase();
  
  return rulesText.includes('karma') && 
         (rulesText.includes('minimum') || rulesText.includes('required'));
}

function detectAgeRequirement(info: SubredditInfo): boolean {
  const rulesText = info.rules
    .map(rule => `${rule.title} ${rule.description}`)
    .join(' ')
    .toLowerCase();
  
  return rulesText.includes('account age') || 
         (rulesText.includes('account') && rulesText.includes('days old'));
}

function determineAllowedContentTypes(info: SubredditInfo, posts: SubredditPost[]): string[] {
  const types = new Set<string>();
  
  // Check rules for content type restrictions
  const rulesText = info.rules
    .map(rule => `${rule.title} ${rule.description}`)
    .join(' ')
    .toLowerCase();

  // Default content types
  if (!rulesText.includes('no text posts')) types.add('text');
  if (!rulesText.includes('no image')) types.add('image');
  if (!rulesText.includes('no video')) types.add('video');
  if (!rulesText.includes('no link')) types.add('link');

  // Analyze recent posts to confirm allowed types
  posts.forEach(post => {
    if (post.selftext) types.add('text');
    if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
    if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
    if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
      types.add('link');
    }
  });

  return Array.from(types);
}

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
} 