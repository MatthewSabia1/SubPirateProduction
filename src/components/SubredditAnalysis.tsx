import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Target, 
  Gamepad2, 
  BookOpen, 
  Shield,
  ChevronDown,
  ChevronUp,
  Type,
  TrendingUp,
  Brain,
  Activity,
  Save
} from 'lucide-react';
import type { AnalysisResult } from '../lib/analysis';
import { supabase } from '../lib/supabase';

interface SavedSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  posting_requirements: {
    restrictions: string[];
    bestTimes: string[];
  };
  posting_frequency: {
    frequency: number;
    recommendedTypes: string[];
  };
  best_practices: string[];
  rules_summary: string | null;
  title_template: string | null;
  last_analyzed_at: string;
  analysis_data: Record<string, any>;
}

interface SubredditAnalysisProps {
  analysis: AnalysisResult;
  isLoading?: boolean;
  error?: string | null;
}

function SubredditAnalysis({ analysis, isLoading, error }: SubredditAnalysisProps) {
  const [showDetailedRules, setShowDetailedRules] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setSaving(true);
      setSaveError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // First, insert or update the subreddit
      const { data: subredditData, error: subredditError } = await supabase
        .from('subreddits')
        .upsert({
          name: analysis.info.name,
          subscriber_count: analysis.info.subscribers,
          active_users: analysis.info.active_users,
          marketing_friendly_score: analysis.analysis.marketingFriendliness.score,
          allowed_content: analysis.analysis.contentStrategy.recommendedTypes,
          posting_requirements: {
            restrictions: analysis.analysis.contentStrategy.donts,
            bestTimes: analysis.analysis.postingLimits.bestTimeToPost
          },
          posting_frequency: {
            frequency: analysis.analysis.postingLimits.frequency,
            recommendedTypes: analysis.analysis.contentStrategy.recommendedTypes
          },
          best_practices: analysis.analysis.contentStrategy.dos,
          rules_summary: analysis.info.rules ? JSON.stringify(analysis.info.rules) : null,
          title_template: analysis.analysis.titleTemplates.patterns[0] || null,
          last_analyzed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_posts_24h: 0, // Will be updated by background job
          last_post_sync: null,
          icon_img: null,
          community_icon: null,
          analysis_data: {
            subreddit: analysis.info.name,
            subscribers: analysis.info.subscribers,
            activeUsers: analysis.info.active_users,
            rules: analysis.info.rules,
            marketingFriendliness: analysis.analysis.marketingFriendliness,
            postingLimits: {
              frequency: analysis.analysis.postingLimits.frequency,
              bestTimeToPost: analysis.analysis.postingLimits.bestTimeToPost,
              contentRestrictions: analysis.analysis.postingLimits.contentRestrictions
            },
            contentStrategy: {
              recommendedTypes: analysis.analysis.contentStrategy.recommendedTypes,
              topics: analysis.analysis.contentStrategy.topics,
              dos: analysis.analysis.contentStrategy.dos,
              donts: analysis.analysis.contentStrategy.donts
            },
            strategicAnalysis: analysis.analysis.strategicAnalysis,
            titleTemplates: analysis.analysis.titleTemplates,
            gamePlan: analysis.analysis.gamePlan
          }
        }, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (subredditError) {
        console.error('Subreddit upsert error:', subredditError);
        throw subredditError;
      }
      
      if (!subredditData) {
        console.error('No subreddit data returned from upsert');
        throw new Error('Failed to save subreddit data');
      }

      // Then, create the saved_subreddits entry with user_id
      const { error: savedError } = await supabase
        .from('saved_subreddits')
        .upsert({
          user_id: user.id,
          subreddit_id: subredditData.id,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,subreddit_id'
        });

      if (savedError) {
        console.error('Saved subreddit error:', savedError);
        throw savedError;
      }

      setIsSaved(true);
    } catch (err) {
      console.error('Error saving subreddit:', err);
      setSaveError('Failed to save analysis');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#111111] rounded-lg p-8 text-center">
        <div className="text-gray-400">Analyzing subreddit...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#111111] rounded-lg p-8">
        <div className="flex items-center justify-center gap-2 text-red-400">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getContentTypeBadgeStyle = (type: string) => {
    const styles: Record<string, string> = {
      text: "bg-[#2B543A] text-white",
      image: "bg-[#8B6D3F] text-white",
      link: "bg-[#4A3B69] text-white",
      video: "bg-[#1E3A5F] text-white"
    };
    return `${styles[type.toLowerCase()] || "bg-gray-600"} px-2.5 py-0.5 rounded-full text-xs font-medium`;
  };

  const getMarketingImpactStyle = (impact: 'high' | 'medium' | 'low') => {
    const styles = {
      high: "bg-gradient-to-r from-red-500 to-rose-600",
      medium: "bg-gradient-to-r from-amber-500 to-amber-600",
      low: "bg-gradient-to-r from-emerald-500 to-emerald-600"
    };
    return `${styles[impact]} text-white px-4 py-1.5 rounded-full text-sm font-medium`;
  };

  const {
    info,
    analysis: {
      marketingFriendliness,
      postingLimits,
      contentStrategy,
      titleTemplates,
      strategicAnalysis,
      gamePlan
    }
  } = analysis;

  return (
    <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">r/{info.name}</h1>
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-400">
              <Users className="h-4 w-4" />
              <span>{formatNumber(info.subscribers)}</span>
              <Activity className="h-4 w-4 ml-2" />
              <span>{formatNumber(info.active_users)} online</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || isSaved}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors disabled:cursor-not-allowed ${
                isSaved 
                  ? 'bg-emerald-600 text-white opacity-50'
                  : 'bg-[#C69B7B] hover:bg-[#B38A6A] text-white disabled:opacity-50'
              }`}
            >
              <Save size={20} />
              {saving ? 'Saving...' : isSaved ? 'Saved' : 'Save to List'}
            </button>
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C69B7B] to-[#E6B17E] text-white text-sm font-medium">
              {marketingFriendliness.score}% Marketing-Friendly
            </span>
          </div>
        </div>
        {saveError && (
          <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm">
            {saveError}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Marketing Friendliness Meter */}
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Marketing Difficulty</span>
            <span>Marketing Friendly</span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{
              width: `${marketingFriendliness.score}%`,
              backgroundColor: marketingFriendliness.score >= 80 ? '#4CAF50' :
                             marketingFriendliness.score >= 60 ? '#FFA726' :
                             '#EF5350'
            }} />
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {marketingFriendliness.reasons[0]}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Posting Requirements */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Posting Requirements</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {postingLimits.contentRestrictions.map((restriction: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Best Posting Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Posting Times</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {postingLimits.bestTimeToPost.map((time: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Content Types */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Allowed Content</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {contentStrategy.recommendedTypes.map((type) => (
                <span 
                  key={type}
                  className={`px-3 py-1 rounded-full text-sm ${getContentTypeBadgeStyle(type)}`}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Practices</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {contentStrategy.dos.map((practice, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Game Plan */}
        <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 text-sm md:text-base">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Game Plan</h3>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Title Template */}
            <div>
              <h4 className="text-sm text-gray-400 mb-3">Title Template</h4>
              <div className="bg-[#111111] rounded-lg p-4 border border-gray-800">
                <code className="text-emerald-400 font-mono block mb-3">
                  {titleTemplates.patterns[0]}
                </code>
                <div className="text-sm text-gray-400">
                  <div className="mb-2">Example:</div>
                  {titleTemplates.examples.map((example, index) => (
                    <div key={index} className="text-white">{example}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Immediate Actions</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {gamePlan.immediate.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#C69B7B]">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Short-term Strategy</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {gamePlan.shortTerm.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#C69B7B]">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Do's and Don'ts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Do's</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {contentStrategy.dos.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Don'ts</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {contentStrategy.donts.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Rules Analysis */}
        <div className="space-y-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#C69B7B]" />
            <h3 className="font-medium">Subreddit Rules</h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDetailedRules(!showDetailedRules);
              }}
              className="ml-auto text-gray-400 hover:text-white"
            >
              {showDetailedRules ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showDetailedRules && info.rules && (
            <div className="bg-[#0A0A0A] rounded-lg p-4 border border-gray-800">
              {info.rules.map((rule: any, index: number) => (
                <div key={index} className="mb-4 last:mb-0">
                  <h4 className="font-medium mb-1">Rule {index + 1}: {rule.title}</h4>
                  <p className="text-sm text-gray-400">{rule.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubredditAnalysis;