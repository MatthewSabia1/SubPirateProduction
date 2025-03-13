/// <reference lib="webworker" />

import { SubredditInfo, SubredditPost } from './reddit';
import { AnalysisResult, AnalysisProgress } from './analysis';
import { analyzeSubreddit } from './openRouter';

interface WorkerMessage {
  info: SubredditInfo;
  posts: SubredditPost[];
  analysisId: string;
}

declare const self: SharedWorkerGlobalScope;

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  
  port.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { info, posts, analysisId } = event.data;
    
    try {
      // Send initial progress
      port.postMessage({ 
        type: 'progress', 
        analysisId, 
        data: { progress: 0, status: 'Starting analysis...', indeterminate: true } 
      });

      // First prepare a basic analysis to show while waiting for the AI
      const basicAnalysis: AnalysisResult = {
        info: {
          ...info,
          rules: info.rules.map(rule => ({
            ...rule,
            marketingImpact: determineMarketingImpact(rule)
          }))
        },
        posts: posts.map(post => ({
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc
        })),
        analysis: {
          marketingFriendliness: {
            score: 50, // Default generous score while waiting for AI
            reasons: ['Initial analysis in progress...', 'Full AI analysis coming soon...'],
            recommendations: ['Wait for complete analysis...']
          },
          postingLimits: {
            frequency: Math.ceil(posts.length / 7), // Simple estimate
            bestTimeToPost: ['Morning', 'Afternoon', 'Evening'],
            contentRestrictions: []
          },
          contentStrategy: {
            recommendedTypes: ['text'],
            topics: ['Initial analysis'],
            style: 'Informative',
            dos: ['Wait for full analysis'],
            donts: ['Don\'t act on initial data']
          },
          titleTemplates: {
            patterns: ['[Category] Title'],
            examples: ['Example Title'],
            effectiveness: 70
          },
          strategicAnalysis: {
            strengths: ['Full analysis coming soon'],
            weaknesses: ['Analysis in progress'],
            opportunities: ['Wait for complete data'],
            risks: ['Preliminary only']
          },
          gamePlan: {
            immediate: ['Wait for AI analysis'],
            shortTerm: ['Coming soon'],
            longTerm: ['Analysis in progress']
          }
        }
      };

      // Send the basic analysis for immediate display
      port.postMessage({
        type: 'basicAnalysis',
        analysisId,
        data: basicAnalysis
      });

      // Update progress
      port.postMessage({
        type: 'progress',
        analysisId,
        data: { progress: 30, status: 'Running AI analysis...', indeterminate: false }
      });

      // Prepare input for AI analysis
      const analysisInput = {
        name: info.name,
        title: info.title,
        description: info.description,
        rules: (info.rules || []).map(rule => ({
          title: rule.title || '',
          description: rule.description || '',
          priority: 1,
          marketingImpact: determineMarketingImpact(rule)
        })),
        content_categories: [],
        posting_requirements: {
          karma_required: info.description?.toLowerCase().includes('karma') || false,
          account_age_required: info.description?.toLowerCase().includes('account age') || false,
          manual_approval: info.description?.toLowerCase().includes('approval') || false
        },
        allowed_content_types: determineAllowedContentTypes(info, posts)
      };

      // Log the analysis input and rules specifically to debug
      console.log('Sending to OpenRouter:', analysisInput);
      console.log('Rules being sent:', JSON.stringify(info.rules || []));

      // Now run the actual AI analysis
      const aiResult = await analyzeSubreddit(analysisInput);
      
      // Log the result to debug
      console.log('OpenRouter result:', aiResult);

      // Update progress
      port.postMessage({
        type: 'progress',
        analysisId,
        data: { progress: 90, status: 'Finalizing analysis...', indeterminate: false }
      });

      // Create the final result by combining AI analysis with our data
      const finalResult: AnalysisResult = {
        info: basicAnalysis.info,
        posts: basicAnalysis.posts,
        analysis: {
          marketingFriendliness: {
            score: typeof aiResult.marketingFriendliness?.score === 'number' 
              ? normalizeMarketingScore(aiResult.marketingFriendliness.score)
              : 50, // Default to 50% if no score is provided
            reasons: Array.isArray(aiResult.marketingFriendliness?.reasons) 
              ? aiResult.marketingFriendliness.reasons 
              : ['Analysis complete'],
            recommendations: Array.isArray(aiResult.marketingFriendliness?.recommendations) 
              ? aiResult.marketingFriendliness.recommendations 
              : ['Follow recommended strategies']
          },
          postingLimits: aiResult.postingLimits,
          contentStrategy: aiResult.contentStrategy,
          titleTemplates: aiResult.titleTemplates,
          strategicAnalysis: aiResult.strategicAnalysis,
          gamePlan: aiResult.gamePlan
        }
      };

      // Send the complete result
      port.postMessage({
        type: 'complete',
        analysisId,
        data: finalResult
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      port.postMessage({
        type: 'error',
        analysisId,
        error: err.message || 'Unknown error during analysis'
      });
    }
  };

  port.start();
};

// Helper function to determine marketing impact of rules
function determineMarketingImpact(rule: any): 'high' | 'medium' | 'low' {
  if (!rule || !rule.title && !rule.description) {
    return 'low';
  }

  const text = `${rule.title || ''} ${rule.description || ''}`.toLowerCase();
  
  const highImpactKeywords = [
    'no promotion', 'no advertising', 'no marketing', 'no self-promotion',
    'spam', 'banned', 'prohibited', 'not allowed'
  ];
  
  const mediumImpactKeywords = [
    'limit', 'restrict', 'guideline', 'approval', 'permission'
  ];
  
  if (highImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

// Helper function to determine allowed content types
function determineAllowedContentTypes(info: any, posts: any[]): string[] {
  const types = new Set<string>(['text']);
  
  // Check post types
  posts.forEach(post => {
    if (post.url?.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
    if (post.url?.match(/\.(mp4|webm)$/i)) types.add('video');
    if (post.url?.match(/^https?:\/\//)) types.add('link');
  });
  
  return Array.from(types);
}

// Helper function to normalize marketing score to ensure it's in the 0-100 range
function normalizeMarketingScore(score: number): number {
  // Convert decimal scores (0-1) to percentage (0-100)
  if (score < 1) {
    score = score * 100;
  }
  
  // Apply minimum threshold of 30%
  return Math.max(30, Math.min(100, Math.round(score)));
} 