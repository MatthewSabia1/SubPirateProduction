export interface AnalysisData {
  subreddit: string;
  subscribers: number;
  activeUsers: number;
  rules?: any[];
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
    dos: string[];
    donts: string[];
  };
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    risks: string[];
  };
  titleTemplates?: {
    patterns: string[];
    examples: string[];
    effectiveness: number;
  };
  gamePlan?: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface SavedSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  posting_requirements: any;
  posting_frequency: any;
  best_practices: string[];
  rules_summary: string;
  title_template: string;
  last_analyzed_at: string;
  analysis_data: AnalysisData;
} 