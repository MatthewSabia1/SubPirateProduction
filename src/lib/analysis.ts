import { SubredditInfo, SubredditPost } from './reddit';
import { analyzeSubreddit, AIAnalysisError } from './openRouter';

export interface AnalysisProgress {
  status: string;
  progress: number;
  indeterminate: boolean;
}

export interface AnalysisResult {
  info: SubredditInfo & {
    rules: Array<{
      title: string;
      description: string;
      marketingImpact: 'high' | 'medium' | 'low';
    }>;
  };
  posts: Array<{
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
  }>;
  analysis: {
    marketingFriendliness: {
      score: number;
      reasons: string[];
      recommendations: string[];
    };
    postingLimits: {
      frequency: number;
      bestTimeToPost: string[];
      contentRestrictions: string[];
    };
    contentStrategy: {
      recommendedTypes: string[];
      topics: string[];
      style: string;
      dos: string[];
      donts: string[];
    };
    titleTemplates: {
      patterns: string[];
      examples: string[];
      effectiveness: number;
    };
    strategicAnalysis: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      risks: string[];
    };
    gamePlan: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  };
}

interface SubredditAnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: SubredditPost[];
  engagement_metrics: {
    avg_comments: number;
    avg_score: number;
    peak_hours: number[];
    interaction_rate: number;
    posts_per_hour: number[];
  };
  rules: Array<{
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }>;
}

function calculateEngagementMetrics(posts: SubredditPost[]) {
  const totalPosts = posts.length;
  if (totalPosts === 0) return null;

  const avgComments = posts.reduce((sum, post) => sum + post.num_comments, 0) / totalPosts;
  const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / totalPosts;
  
  // Calculate posts per hour
  const postTimes = posts.map(post => new Date(post.created_utc * 1000).getHours());
  const hourCounts = new Array(24).fill(0);
  postTimes.forEach(hour => hourCounts[hour]++);
  
  // Find peak hours (hours with most posts)
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

function analyzeRuleMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
  const text = `${rule.title} ${rule.description}`.toLowerCase();
  
  // High impact keywords indicate significant marketing restrictions
  const highImpactKeywords = [
    'no promotion',
    'no advertising',
    'no marketing',
    'no self-promotion',
    'no solicitation',
    'banned',
    'prohibited',
    'not allowed',
    'spam'
  ];

  // Medium impact keywords indicate partial restrictions
  const mediumImpactKeywords = [
    'limited',
    'restricted',
    'guidelines',
    'approval',
    'permission',
    'ratio',
    'self-promotion saturday',
    'promotional content',
    'advertising guidelines'
  ];

  // Check for high impact restrictions first
  if (highImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }

  // Then check for medium impact restrictions
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }

  // Default to low impact if no restrictions found
  return 'low';
}

function prepareAnalysisInput(info: SubredditInfo, posts: SubredditPost[]): SubredditAnalysisInput {
  const engagement = calculateEngagementMetrics(posts);
  if (!engagement) {
    throw new Error('Not enough post data for analysis');
  }

  const historicalPosts = posts.map(post => ({
    ...post,
    engagement_rate: (post.score + post.num_comments) / engagement.interaction_rate
  }));

  // Analyze marketing impact for each rule
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
    posts_per_day: posts.length / 7, // Assuming posts are from last 7 days
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

function calculateMarketingScore(input: SubredditAnalysisInput): number {
  let score = 50; // Base score
  let factors: { name: string; score: number; weight: number; }[] = [];
  
  // Factor 1: Community Size (0-15 points)
  // Logarithmic scale to better handle both small and large communities
  const subscriberLog = Math.log10(input.subscribers + 1);
  const subscriberScore = Math.min((subscriberLog / 6) * 15, 15); // 1M subscribers = 15 points
  factors.push({ name: 'Community Size', score: subscriberScore, weight: 15 });

  // Factor 2: Community Activity (0-15 points)
  // Measures active users as a percentage of subscribers with diminishing returns
  const activityRatio = input.subscribers > 0 ? (input.active_users / input.subscribers) : 0;
  const activityScore = Math.min((Math.sqrt(activityRatio) * 15), 15);
  factors.push({ name: 'Community Activity', score: activityScore, weight: 15 });

  // Factor 3: Engagement Quality (0-30 points)
  // Combines post score and comments with diminishing returns
  const avgEngagement = input.engagement_metrics.avg_score + (input.engagement_metrics.avg_comments * 2);
  const engagementRatio = input.subscribers > 0 ? (avgEngagement / Math.sqrt(input.subscribers)) : 0;
  const engagementScore = Math.min((engagementRatio * 5), 30);
  factors.push({ name: 'Engagement Quality', score: engagementScore, weight: 30 });

  // Factor 4: Content Flexibility (0-20 points)
  // Starts at max and subtracts based on rule restrictions
  let flexibilityScore = 20;
  const highImpactRules = input.rules.filter(r => r.marketingImpact === 'high').length;
  const mediumImpactRules = input.rules.filter(r => r.marketingImpact === 'medium').length;
  flexibilityScore -= (highImpactRules * 3);
  flexibilityScore -= (mediumImpactRules * 1.5);
  flexibilityScore = Math.max(0, flexibilityScore);
  factors.push({ name: 'Content Flexibility', score: flexibilityScore, weight: 20 });

  // Factor 5: Activity Frequency (0-20 points)
  // Rewards consistent daily activity but doesn't overly penalize lower frequency
  const postsPerDayScore = Math.min(Math.sqrt(input.posts_per_day) * 8, 20);
  factors.push({ name: 'Activity Frequency', score: postsPerDayScore, weight: 20 });

  // Calculate weighted average
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const weightedScore = factors.reduce((sum, factor) => sum + (factor.score * (factor.weight / totalWeight)), 0);

  // Apply final adjustments
  let finalScore = weightedScore;

  // Bonus for very active communities (>10% engagement rate)
  if (engagementRatio > 0.1) {
    finalScore *= 1.1;
  }

  // Penalty for extremely restrictive communities (>5 high impact rules)
  if (highImpactRules > 5) {
    finalScore *= 0.9;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

function extractCommonTopics(posts: SubredditPost[]): string[] {
  // Extract common words/phrases from titles
  const commonWords = posts
    .map(post => post.title.toLowerCase())
    .join(' ')
    .split(/\W+/)
    .filter(word => word.length > 3)
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Get top 5 most common meaningful words
  return Object.entries(commonWords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function extractTitlePatterns(posts: SubredditPost[]): string[] {
  const patterns = [
    'Question format: "What/How/Why..."',
    'List format: "X ways to..."',
    'Guide format: "How to..."',
    'Discussion format: "Thoughts on..."'
  ];

  // Count pattern occurrences
  const patternCounts = patterns.map(pattern => ({
    pattern,
    count: posts.filter(post => 
      post.title.toLowerCase().includes(pattern.split(':')[1].trim().toLowerCase())
    ).length
  }));

  // Return patterns that appear in at least 10% of posts
  return patternCounts
    .filter(({ count }) => count >= posts.length * 0.1)
    .map(({ pattern }) => pattern);
}

function calculateTitleEffectiveness(posts: SubredditPost[]): number {
  if (!posts.length) return 0;

  // Calculate average engagement
  const avgEngagement = posts.reduce((sum, post) => 
    sum + post.score + post.num_comments, 0
  ) / posts.length;

  // Find posts with above average engagement
  const highEngagementPosts = posts.filter(post => 
    post.score + post.num_comments > avgEngagement
  );

  // Return percentage of high engagement posts
  return Math.round((highEngagementPosts.length / posts.length) * 100);
}

export async function analyzeSubredditData(
  info: SubredditInfo,
  posts: SubredditPost[],
  onProgress: (progress: AnalysisProgress) => void,
  onBasicAnalysisReady?: (result: AnalysisResult) => void
): Promise<AnalysisResult> {
  let basicResult: AnalysisResult | null = null;
  let aiAnalysisStarted = false;

  try {
    // Phase 1: Immediate Basic Analysis
    onProgress({ status: 'Calculating basic metrics...', progress: 20, indeterminate: false });

    // Handle case of no posts
    if (!posts.length) {
      basicResult = {
        info: {
          ...info,
          rules: info.rules.map(rule => ({
            ...rule,
            marketingImpact: analyzeRuleMarketingImpact(rule)
          }))
        },
        posts: [],
        analysis: {
          marketingFriendliness: {
            score: 50,
            reasons: ['New or inactive subreddit - not enough data for detailed analysis'],
            recommendations: ['Start by creating high-quality content to build engagement']
          },
          postingLimits: {
            frequency: 0,
            bestTimeToPost: ['No posting pattern established yet'],
            contentRestrictions: info.rules.map(rule => rule.description)
          },
          contentStrategy: {
            recommendedTypes: ['text', 'image', 'link'],
            topics: [],
            style: 'Focus on building community engagement',
            dos: [
              'Create initial content to set the tone',
              'Engage with any early subscribers',
              'Cross-promote in related subreddits'
            ],
            donts: [
              'Avoid spamming to grow quickly',
              'Don\'t post low-quality content'
            ]
          },
          titleTemplates: {
            patterns: [],
            examples: [],
            effectiveness: 0
          },
          strategicAnalysis: {
            strengths: [`${formatNumber(info.subscribers)} subscribers base`],
            weaknesses: ['Limited posting history'],
            opportunities: ['Fresh start to build community'],
            risks: ['May need time to gain traction']
          },
          gamePlan: {
            immediate: [
              'Create welcome/introduction post',
              'Set up subreddit rules and guidelines',
              'Design subreddit appearance'
            ],
            shortTerm: [
              'Post regular content to build activity',
              'Engage with early subscribers',
              'Cross-promote appropriately'
            ],
            longTerm: [
              'Build moderator team',
              'Develop content calendar',
              'Create community events'
            ]
          }
        }
      };

      if (onBasicAnalysisReady) {
        onBasicAnalysisReady(basicResult);
      }
      
      onProgress({ status: 'Basic analysis complete for new subreddit', progress: 100, indeterminate: false });
      return basicResult;
    }

    const scoredPosts = posts.map(post => ({
      ...post,
      engagement_score: (post.score * 0.75 + post.num_comments * 0.25)
    }));

    // Optimize post filtering
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recentPosts = scoredPosts.filter(post => post.created_utc * 1000 > oneMonthAgo);
    if (recentPosts.length < 50) {
      recentPosts = scoredPosts;
    }
    const topPosts = recentPosts
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 500);
    const basicAnalysisPosts = topPosts.slice(0, 100);

    onProgress({ status: 'Processing engagement metrics...', progress: 35, indeterminate: false });

    const input = prepareAnalysisInput(info, basicAnalysisPosts);
    let engagement = calculateEngagementMetrics(topPosts) || {
      avg_comments: 0,
      avg_score: 0,
      peak_hours: [9, 12, 15, 18],
      interaction_rate: 0,
      posts_per_hour: new Array(24).fill(0)
    };

    onProgress({ status: 'Generating basic insights...', progress: 45, indeterminate: false });

    // Immediately calculate and return basic metrics
    basicResult = {
      info: {
        ...info,
        rules: info.rules.map(rule => ({
          ...rule,
          marketingImpact: analyzeRuleMarketingImpact(rule)
        }))
      },
      posts: topPosts.map(post => ({
        title: post.title,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc
      })),
      analysis: {
        marketingFriendliness: {
          score: calculateMarketingScore(input),
          reasons: [
            `Community size: ${formatNumber(info.subscribers)} members`,
            `Activity level: ${formatNumber(info.active_users)} active users`,
            `Engagement rate: ${Math.round(engagement.interaction_rate)} interactions per post`
          ],
          recommendations: [
            'Follow posting guidelines and rules',
            'Match community engagement patterns',
            'Maintain consistent posting schedule'
          ]
        },
        postingLimits: {
          frequency: input.posts_per_day,
          bestTimeToPost: formatBestPostingTimes(engagement.peak_hours),
          contentRestrictions: info.rules
            .filter(rule => analyzeRuleMarketingImpact(rule) !== 'low')
            .map(rule => rule.description)
        },
        contentStrategy: {
          recommendedTypes: getRecommendedContentTypes(topPosts),
          topics: extractCommonTopics(topPosts),
          style: 'Match successful post formats',
          dos: [
            `Post during peak hours: ${formatBestPostingTimes(engagement.peak_hours)[0]}`,
            `Target ${Math.round(engagement.avg_comments)} or more comments per post`,
            'Follow community posting patterns'
          ],
          donts: [
            ...info.rules
              .filter(rule => analyzeRuleMarketingImpact(rule) === 'high')
              .map(rule => rule.title),
            'Avoid low-effort content',
            'Respect posting frequency limits'
          ]
        },
        titleTemplates: {
          patterns: extractTitlePatterns(topPosts),
          examples: topPosts.slice(0, 3).map(post => post.title),
          effectiveness: calculateTitleEffectiveness(topPosts)
        },
        strategicAnalysis: {
          strengths: [
            `Active community: ${formatNumber(info.active_users)} online users`,
            `Regular activity: ${Math.round(input.posts_per_day)} posts per day`,
            'Established posting patterns'
          ],
          weaknesses: [
            'Competition for visibility',
            'Need to maintain engagement',
            'Content quality standards'
          ],
          opportunities: [
            'Peak posting time optimization',
            'Content type diversification',
            'Community engagement potential'
          ],
          risks: [
            'Rule violation penalties',
            'Engagement fluctuations',
            'Content saturation'
          ]
        },
        gamePlan: {
          immediate: [
            'Study top performing content',
            'Plan content calendar',
            'Prepare posting templates'
          ],
          shortTerm: [
            'Build posting consistency',
            'Track engagement metrics',
            'Refine content strategy'
          ],
          longTerm: [
            'Establish community presence',
            'Optimize posting schedule',
            'Scale successful formats'
          ]
        }
      }
    };

    // Immediately notify with basic analysis
    if (onBasicAnalysisReady) {
      onBasicAnalysisReady(basicResult);
    }

    onProgress({ status: 'Basic analysis complete, starting AI analysis...', progress: 50, indeterminate: false });

    // Phase 2: Detailed AI Analysis
    aiAnalysisStarted = true;
    
    // Run AI analysis with retries and timeout
    const aiAnalysis = await (async () => {
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 2000;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          onProgress({ 
            status: attempt > 0 ? `Retrying AI analysis (attempt ${attempt + 1})...` : 'Running AI analysis...', 
            progress: 55 + (attempt * 5), 
            indeterminate: false 
          });

          return await analyzeSubreddit(input);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
            continue;
          }
        }
      }

      throw lastError || new Error('AI analysis failed after retries');
    })();

    onProgress({ status: 'AI analysis complete, finalizing recommendations...', progress: 80, indeterminate: false });

    // Merge AI analysis details into the basic result
    const finalResult: AnalysisResult = {
      ...basicResult,
      analysis: {
        ...basicResult.analysis,
        marketingFriendliness: {
          score: aiAnalysis.marketingFriendliness.score,
          reasons: aiAnalysis.marketingFriendliness.reasons,
          recommendations: aiAnalysis.marketingFriendliness.recommendations
        },
        postingLimits: {
          ...basicResult.analysis.postingLimits,
          contentRestrictions: aiAnalysis.postingLimits.contentRestrictions
        },
        contentStrategy: {
          ...basicResult.analysis.contentStrategy,
          topics: aiAnalysis.contentStrategy.topics,
          style: aiAnalysis.contentStrategy.style,
          dos: aiAnalysis.contentStrategy.dos,
          donts: aiAnalysis.contentStrategy.donts
        },
        titleTemplates: aiAnalysis.titleTemplates,
        strategicAnalysis: aiAnalysis.strategicAnalysis,
        gamePlan: aiAnalysis.gamePlan
      }
    };

    onProgress({ status: 'Analysis complete!', progress: 100, indeterminate: false });
    return finalResult;

  } catch (error) {
    console.error('Analysis error:', error);

    // If we have basic results but AI analysis failed, return basic results with error status
    if (basicResult && aiAnalysisStarted) {
      onProgress({ 
        status: 'Basic analysis complete, but detailed AI analysis failed. Using basic insights only.', 
        progress: 100, 
        indeterminate: false 
      });
      return {
        ...basicResult,
        analysis: {
          ...basicResult.analysis,
          marketingFriendliness: {
            ...basicResult.analysis.marketingFriendliness,
            recommendations: [
              ...basicResult.analysis.marketingFriendliness.recommendations,
              'Note: Detailed AI analysis failed. These are preliminary recommendations only.'
            ]
          }
        }
      };
    }

    // Otherwise, propagate the error
    if (error instanceof AIAnalysisError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(error.message || 'Failed to analyze subreddit data');
    }
    throw new Error('Failed to analyze subreddit data');
  }
}

// Helper function to format numbers (used in the analysis)
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}