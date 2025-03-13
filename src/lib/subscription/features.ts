import { Database } from '../database.types'

export type FeatureKey = string;

// Define all possible feature keys
export const FEATURE_KEYS = {
  ANALYZE_SUBREDDIT: 'analyze_subreddit',
  ANALYZE_UNLIMITED: 'analyze_unlimited',
  CREATE_PROJECT: 'create_project',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_DATA: 'export_data',
  TEAM_COLLABORATION: 'team_collaboration',
  CUSTOM_TRACKING: 'custom_tracking',
  API_ACCESS: 'api_access',
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_ACCOUNT: 'dedicated_account',
  ADMIN_PANEL: 'admin_panel', // Special admin-only feature
} as const

// Add gift to the SubscriptionTier type
export type SubscriptionTier = 'free' | 'starter' | 'creator' | 'pro' | 'agency' | 'admin' | 'gift';

// Map of features included in each tier
export const TIER_FEATURES: Record<SubscriptionTier, FeatureKey[]> = {
  free: [
    // Free tier has limited access
    FEATURE_KEYS.ANALYZE_SUBREDDIT, // Limited to 3 per month
  ],
  starter: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT, // Limited to 10 per month
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.EXPORT_DATA,
  ],
  creator: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT, // Limited to 50 per month
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.PRIORITY_SUPPORT,
  ],
  pro: [
    FEATURE_KEYS.ANALYZE_UNLIMITED,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.API_ACCESS,
    FEATURE_KEYS.PRIORITY_SUPPORT,
  ],
  agency: [
    FEATURE_KEYS.ANALYZE_UNLIMITED,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.API_ACCESS,
    FEATURE_KEYS.PRIORITY_SUPPORT,
    FEATURE_KEYS.DEDICATED_ACCOUNT,
  ],
  admin: [
    // Admin tier gets ALL features
    FEATURE_KEYS.ANALYZE_UNLIMITED,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.API_ACCESS,
    FEATURE_KEYS.PRIORITY_SUPPORT,
    FEATURE_KEYS.DEDICATED_ACCOUNT,
    FEATURE_KEYS.ADMIN_PANEL, // Admin-only feature
  ],
  gift: [
    // Gift tier gets Pro features
    FEATURE_KEYS.ANALYZE_UNLIMITED,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.API_ACCESS,
    FEATURE_KEYS.PRIORITY_SUPPORT,
  ],
}

// Usage limits for each tier
export const USAGE_LIMITS: Record<SubscriptionTier, Record<string, number>> = {
  free: {
    'subreddit_analysis_count': 3, // 3 subreddit analyses per month
    'saved_subreddits': 10, // Max 10 saved subreddits
    'projects': 1, // Max 1 project
    'reddit_accounts': 1, // Max 1 Reddit account
  },
  starter: {
    'subreddit_analysis_count': 10, // 10 subreddit analyses per month
    'saved_subreddits': 25, // Max 25 saved subreddits
    'projects': 2, // Max 2 projects
    'reddit_accounts': 3, // Max 3 Reddit accounts
  },
  creator: {
    'subreddit_analysis_count': 50, // 50 subreddit analyses per month
    'saved_subreddits': 100, // Max 100 saved subreddits
    'projects': 5, // Max 5 projects
    'reddit_accounts': 10, // Max 10 Reddit accounts
  },
  pro: {
    'subreddit_analysis_count': Infinity, // Unlimited subreddit analyses
    'saved_subreddits': 500, // Max 500 saved subreddits
    'projects': 10, // Max 10 projects
    'reddit_accounts': 25, // Max 25 Reddit accounts
  },
  agency: {
    'subreddit_analysis_count': Infinity, // Unlimited subreddit analyses
    'saved_subreddits': Infinity, // Unlimited saved subreddits
    'projects': Infinity, // Unlimited projects
    'reddit_accounts': 100, // Max 100 Reddit accounts
  },
  admin: {
    // Admin tier gets unlimited usage
    'subreddit_analysis_count': Infinity,
    'saved_subreddits': Infinity,
    'projects': Infinity,
    'reddit_accounts': Infinity, // Unlimited Reddit accounts
    // Any future metrics should be unlimited for admins
  },
  gift: {
    // Gift tier gets Pro plan limits
    'subreddit_analysis_count': Infinity, // Unlimited subreddit analyses
    'saved_subreddits': 500, // Max 500 saved subreddits
    'projects': 10, // Max 10 projects
    'reddit_accounts': 25, // Max 25 Reddit accounts
  },
}

// Feature descriptions for UI
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  [FEATURE_KEYS.ANALYZE_SUBREDDIT]: 'Access to detailed subreddit analysis including marketing friendliness scores, posting requirements, and best practices',
  [FEATURE_KEYS.ANALYZE_UNLIMITED]: 'Unlimited subreddit analysis per month',
  [FEATURE_KEYS.CREATE_PROJECT]: 'Create and manage marketing projects to organize your subreddit targets',
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: 'Access to advanced analytics including engagement metrics, trend analysis, and detailed reporting',
  [FEATURE_KEYS.EXPORT_DATA]: 'Export analysis data and reports in various formats',
  [FEATURE_KEYS.TEAM_COLLABORATION]: 'Invite team members and collaborate on projects',
  [FEATURE_KEYS.CUSTOM_TRACKING]: 'Set up custom tracking metrics and alerts for your subreddits',
  [FEATURE_KEYS.API_ACCESS]: 'Access to the SubPirate API for custom integrations',
  [FEATURE_KEYS.PRIORITY_SUPPORT]: 'Priority email and chat support',
  [FEATURE_KEYS.DEDICATED_ACCOUNT]: 'Dedicated account manager for your team',
  [FEATURE_KEYS.ADMIN_PANEL]: 'Access to administrative features and controls',
}

// Helper to check if a feature is included in a tier
export function isTierFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return TIER_FEATURES[tier].includes(feature)
}

// Get all features for a tier
export function getTierFeatures(tier: SubscriptionTier): FeatureKey[] {
  return TIER_FEATURES[tier]
}

// Get tier from product name
export function getTierFromProductName(productName: string): SubscriptionTier {
  const name = productName.toLowerCase();
  
  // Special handling for admin and gift products
  if (name.includes('admin')) return 'admin';
  if (name.includes('gift')) return 'gift';
  
  // Regular subscription tiers
  if (name.includes('starter')) return 'starter';
  if (name.includes('creator')) return 'creator';
  if (name.includes('pro')) return 'pro';
  if (name.includes('agency')) return 'agency';
  
  return 'free';
}

// Check if within usage limit
export function isWithinUsageLimit(tier: SubscriptionTier, metric: string, currentUsage: number): boolean {
  // Admin and gift users follow their tier's usage limits
  const limit = USAGE_LIMITS[tier]?.[metric];
  
  // If no limit is defined, or if limit is Infinity, allow usage
  if (limit === undefined || limit === Infinity) return true;
  
  return currentUsage < limit;
}

// Get friendly name for subscription tier
export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'starter': return 'Starter Plan';
    case 'creator': return 'Creator Plan';
    case 'pro': return 'Pro Plan';
    case 'agency': return 'Agency Plan';
    case 'admin': return 'Admin Plan';
    case 'gift': return 'Gift Plan';
    default: return 'Free Plan';
  }
} 