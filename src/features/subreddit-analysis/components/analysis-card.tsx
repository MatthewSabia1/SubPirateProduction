/* src/features/subreddit-analysis/components/analysis-card.tsx */

import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Shield, 
  Type, 
  TrendingUp, 
  Brain, 
  Activity, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Target,
  BookmarkCheck
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { HeatmapChart } from '../../../components/HeatmapChart';

interface AnalysisData {
  info: {
    name: string;
    subscribers: number;
    active_users: number;
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

interface AnalysisCardProps {
  analysis: AnalysisData;
  mode?: 'new' | 'saved';
  onSaveComplete?: () => void;
  isAnalyzing?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

interface SavedSubreddit {
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

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  analysis, 
  mode = 'new',
  onSaveComplete,
  isAnalyzing = false,
  isLoading,
  error
}) => {
  const [showDetailedRules, setShowDetailedRules] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setError] = useState<string | null>(null);
  const [saveAttempts, setSaveAttempts] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update validation to be more comprehensive
  if (!analysis?.analysis?.postingLimits?.contentRestrictions || 
      !analysis?.analysis?.marketingFriendliness?.score || 
      !analysis?.analysis?.contentStrategy?.recommendedTypes) {
    return (
      <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden p-4">
        <div className="text-red-400 space-y-2">
          <div className="font-medium">Error: Analysis data is incomplete</div>
          <ul className="text-sm list-disc list-inside">
            {!analysis?.analysis?.postingLimits?.contentRestrictions && <li>Missing posting limits or restrictions</li>}
            {!analysis?.analysis?.marketingFriendliness?.score && <li>Missing marketing friendliness score</li>}
            {!analysis?.analysis?.contentStrategy?.recommendedTypes && <li>Missing content strategy</li>}
          </ul>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication error: ' + userError.message);
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
            restrictions: analysis.analysis.postingLimits.contentRestrictions,
            recommendations: analysis.analysis.postingLimits.bestTimeToPost
          },
          posting_frequency: {
            timing: analysis.analysis.postingLimits.bestTimeToPost.map(time => ({
              hour: parseInt(time.split(':')[0]),
              timezone: 'UTC'
            })),
            postTypes: analysis.analysis.contentStrategy.recommendedTypes
          },
          best_practices: analysis.analysis.contentStrategy.dos,
          rules_summary: analysis.info.rules ? JSON.stringify(analysis.info.rules) : null,
          title_template: analysis.analysis.titleTemplates?.patterns?.[0] || null,
          last_analyzed_at: new Date().toISOString(),
          analysis_data: {
            info: analysis.info,
            posts: analysis.posts,
            analysis: analysis.analysis
          }
        }, {
          onConflict: 'name'
        })
        .select();

      if (subredditError) throw new Error('Database error: ' + subredditError.message);
      
      if (!subredditData || subredditData.length === 0) {
        throw new Error('Failed to save subreddit data: No data returned');
      }

      const savedSubreddit = subredditData[0];

      // Then, create the saved_subreddits entry with user_id
      const { error: savedError } = await supabase
        .from('saved_subreddits')
        .upsert({
          user_id: user.id,
          subreddit_id: savedSubreddit.id,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,subreddit_id'
        });

      if (savedError) throw new Error('Failed to save user reference: ' + savedError.message);

      setSaveAttempts(0);
      setSaveSuccess(true);
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (err) {
      console.error('Error saving subreddit:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save subreddit';
      setError(errorMessage);
      setSaveAttempts(prev => prev + 1);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">r/{analysis.info.name}</h1>
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-400">
              <Users className="h-4 w-4" />
              <span>{formatNumber(analysis.info.subscribers)}</span>
              <Activity className="h-4 w-4 ml-2" />
              <span>{formatNumber(analysis.info.active_users)} online</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C69B7B] to-[#E6B17E] text-white text-sm font-medium">
            {analysis.analysis.marketingFriendliness.score}% Marketing-Friendly
          </span>
        </div>
      </div>

      <div className="flex justify-between items-start p-4 md:p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold">Subreddit Analysis</h2>
        {mode === 'new' && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                saveSuccess 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-[#C69B7B] hover:bg-[#B38A6A] text-white'
              }`}
            >
              {saveSuccess ? (
                <>
                  <BookmarkCheck size={20} />
                  Saved To List
                </>
              ) : (
                <>
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save To List'}
                </>
              )}
            </button>
            {saveError && (
              <div className="p-3 bg-red-900/30 text-red-400 rounded-md text-sm max-w-md">
                <div className="font-medium">Error saving analysis:</div>
                <div className="mt-1">{saveError}</div>
                {saveAttempts > 0 && saveAttempts < 3 && (
                  <button
                    onClick={handleSave}
                    className="mt-2 text-[#C69B7B] hover:text-[#B38A6A] transition-colors"
                  >
                    Retry Save
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Marketing Friendliness Score */}
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Marketing Difficulty</span>
            <span>Marketing Friendly</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-4xl font-bold">{analysis.analysis.marketingFriendliness.score}%</div>
            <div className="flex-1">
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${analysis.analysis.marketingFriendliness.score}%`,
                    backgroundColor: analysis.analysis.marketingFriendliness.score >= 80 ? '#4CAF50' :
                                   analysis.analysis.marketingFriendliness.score >= 60 ? '#FFA726' :
                                   '#EF5350'
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                {analysis.analysis.marketingFriendliness.reasons[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Remove duplicate Community Stats section and update the header stats */}
        <div className="flex items-center gap-2 text-sm md:text-base">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="h-4 w-4" />
            <span>{formatNumber(analysis.info.subscribers)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 ml-4">
            <Activity className="h-4 w-4" />
            <span>{formatNumber(analysis.info.active_users)} online</span>
          </div>
        </div>

        {/* Best Posting Times */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#C69B7B]" />
            <h3 className="font-medium">Best Posting Times</h3>
          </div>
          {analysis.posts && analysis.posts.length > 0 ? (
            <HeatmapChart posts={analysis.posts} />
          ) : (
            <ul className="space-y-2 text-gray-400 text-sm">
              {analysis.analysis.postingLimits.bestTimeToPost.map((time, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{time}</span>
                </li>
              ))}
            </ul>
          )}
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
              {analysis.analysis.postingLimits.contentRestrictions.map((restriction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{restriction}</span>
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
              {analysis.analysis.contentStrategy.recommendedTypes.map((type) => (
                <span 
                  key={type}
                  className={getContentTypeBadgeStyle(type)}
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
              {analysis.analysis.contentStrategy.dos?.map((practice, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Game Plan */}
        {analysis.analysis.gamePlan && (
          <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 text-sm md:text-base">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#C69B7B]" />
                <h3 className="font-medium">Game Plan</h3>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Title Template */}
              {analysis.analysis.titleTemplates && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Title Template</h4>
                  <div className="bg-[#111111] rounded-lg p-4 border border-gray-800">
                    {analysis.analysis.titleTemplates.patterns && analysis.analysis.titleTemplates.patterns[0] && (
                      <code className="text-emerald-400 font-mono block mb-3 px-2 py-1.5 bg-emerald-900/10 rounded border border-emerald-900/20 overflow-x-auto whitespace-nowrap">
                        {analysis.analysis.titleTemplates.patterns[0]}
                      </code>
                    )}
                    <div className="text-sm text-gray-400">
                      <div className="mb-2 font-medium">Example Structure:</div>
                      <div className="space-y-3">
                        {analysis.analysis.titleTemplates.examples && analysis.analysis.titleTemplates.examples.map((example, index) => (
                          <div key={index} className="border-l-2 border-emerald-500/30 pl-3 py-1">
                            <div className="text-white font-medium mb-2">{example}</div>
                            
                            {/* Template explanation */}
                            {index === 0 && analysis.analysis.titleTemplates.patterns && analysis.analysis.titleTemplates.patterns[0] && (
                              <div className="grid grid-cols-1 gap-2 text-xs mt-3 bg-[#0A0A0A] p-3 rounded-md border border-gray-800/50">
                                <div className="text-emerald-400 mb-1 font-medium">Template Breakdown:</div>
                                {(() => {
                                  try {
                                    // Improved regex to properly capture bracketed elements
                                    const pattern = analysis.analysis.titleTemplates.patterns[0];
                                    const parts = pattern.match(/(\[[^\]]+\])|([^\[\]]+)/g) || [];
                                    
                                    return parts.map((part, partIndex) => {
                                      // Check if this part is a bracketed template part
                                      const isBracketedPart = part.startsWith('[') && part.endsWith(']');
                                      
                                      if (isBracketedPart) {
                                        const partName = part.replace(/[\[\]]/g, '').trim();
                                        return (
                                          <div key={partIndex} className="flex items-start gap-2">
                                            <div className="inline-block px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-mono whitespace-nowrap mt-0.5 flex-shrink-0">
                                              [{partName}]
                                            </div>
                                            <div className="text-gray-400">
                                              {partName === 'QUESTION' ? 'Main question or topic of your post' :
                                              partName === 'CONTEXT' ? 'Brief background or situation context' :
                                              partName === 'DETAIL' ? 'Specific details about your question/request' :
                                              partName === 'GOAL' ? "What you're trying to achieve" :
                                              partName === 'KEYWORD' ? 'Relevant keyword for visibility' :
                                              partName === 'TOPIC' ? 'The main subject area of your post' :
                                              partName === 'SPECIFIC' ? 'Specific detail that makes post unique' :
                                              partName === 'CATEGORY' ? 'The category or type of your post' :
                                              'Part of your title that adds more information'}
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }).filter(Boolean);
                                  } catch (e) {
                                    console.error('Error parsing title template:', e);
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 bg-[#0A0A0A] p-3 rounded text-xs border border-[#222222]">
                        <div className="text-emerald-400 mb-2 font-medium">Pro Tip:</div>
                        <p>Follow this template structure for maximum engagement. Posts that match the subreddit&apos;s preferred title format typically receive 30-40% more upvotes and comments.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Immediate Actions</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.gamePlan.immediate.map((action, index) => (
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
                    {analysis.analysis.gamePlan.shortTerm.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#C69B7B]">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Long-term Strategy */}
              {analysis.analysis.gamePlan.longTerm && analysis.analysis.gamePlan.longTerm.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm text-gray-400 mb-3">Long-term Strategy</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.gamePlan.longTerm.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#C69B7B]">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Do's and Don'ts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm text-gray-400 mb-3">Do's</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    {analysis.analysis.contentStrategy.dos?.map((item, index) => (
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
                    {analysis.analysis.contentStrategy.donts?.map((item, index) => (
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
        )}

        {/* Detailed Rules Analysis */}
        {analysis.info.rules && (
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
            {showDetailedRules && (
              <div className="bg-[#0A0A0A] rounded-lg p-4 border border-gray-800">
                {analysis.info.rules.map((rule: any, index: number) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">Rule {index + 1}: {rule.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        rule.marketingImpact === 'low' ? 'bg-green-500/20 text-green-400' : 
                        rule.marketingImpact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {rule.marketingImpact === 'low' ? 'Low Impact' : 
                         rule.marketingImpact === 'medium' ? 'Medium Impact' : 
                         'High Impact'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{rule.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Subreddit Link */}
        {mode === 'saved' && (
          <div className="mt-6">
            <a
              href={`https://reddit.com/r/${analysis.info.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C69B7B] hover:text-[#B38A6A] transition-colors inline-flex items-center gap-2"
            >
              View all posts in r/{analysis.info.name}
              <ChevronRight size={16} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisCard; 