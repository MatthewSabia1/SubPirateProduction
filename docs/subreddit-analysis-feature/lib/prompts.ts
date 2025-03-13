/**
 * AI Prompts for Subreddit Analysis
 * 
 * This file contains the system and analysis prompts used by the DeepSeek AI
 * to analyze subreddit data and generate marketing insights.
 */

export const SYSTEM_PROMPT = `You are an expert Reddit marketing analyst tasked with analyzing subreddits for marketing potential and content strategy. Your analysis should be thorough, data-driven, and provide actionable insights.

Consider:
- Engagement patterns and user behavior
- Content restrictions and community guidelines
- Historical performance metrics
- Marketing opportunities and risks
- Optimal posting strategies

Format your response according to the specified schema, ensuring all required fields are populated with relevant insights.`;

export const ANALYSIS_PROMPT = `Analyze the following subreddit data and provide a comprehensive marketing intelligence report:

Subreddit: {subredditName}
Subscribers: {subscriberCount}
Active Users: {activeUserCount}
Posts Per Day: {postsPerDay}

Historical Post Data:
{historicalPosts}

Engagement Metrics:
{engagementMetrics}

Subreddit Rules:
{rules}

Provide your analysis following this exact structure:
{outputSchema}

Focus on actionable insights and specific recommendations for marketing in this subreddit.`;

export const OUTPUT_SCHEMA = {
  subreddit: "string",
  subscribers: "number",
  activeUsers: "number",
  marketingFriendliness: {
    score: "number (0-100)",
    reasons: "string[]",
    recommendations: "string[]"
  },
  postingGuidelines: {
    allowedTypes: "string[]",
    restrictions: "string[]",
    recommendations: "string[]"
  },
  contentStrategy: {
    postTypes: "string[]",
    timing: [{ hour: "number", timezone: "string" }],
    topics: "string[]"
  },
  strategicAnalysis: {
    strengths: "string[]",
    weaknesses: "string[]",
    opportunities: "string[]"
  }
};
