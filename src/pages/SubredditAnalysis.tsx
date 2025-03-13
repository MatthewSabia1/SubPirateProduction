import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Target, 
  Gamepad2, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck,
  Shield,
  ChevronDown,
  ChevronUp,
  Type,
  TrendingUp,
  Brain,
  Activity
} from 'lucide-react';
import { getSubredditInfo, getSubredditPosts } from '../lib/reddit';
import { analyzeSubredditData, AnalysisResult, AnalysisProgress } from '../lib/analysis';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { analysisWorker } from '../lib/analysisWorker';
import { RedditAPI } from '../lib/redditApi';

interface SubredditAnalysisProps {
  analysis?: AnalysisResult | null;
}

// Early in the file, add type definitions for the map callback parameters
type Restriction = string;
type PostingTime = string;

interface AnalysisCallbacks {
  onProgress: (progress: AnalysisProgress) => void;
  onBasicAnalysis: (result: AnalysisResult) => void;
  onComplete: (result: AnalysisResult) => void;
  onError: (error: Error | string) => void;
}

function SubredditAnalysis({ analysis: initialAnalysis }: SubredditAnalysisProps) {
  const auth = useAuth();
  if (!auth) throw new Error('AuthContext not available');
  
  const [subreddit, setSubreddit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<AnalysisResult | null>(initialAnalysis || null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ 
    status: '', 
    progress: 0, 
    indeterminate: false 
  });
  const [isBasicAnalysisReady, setIsBasicAnalysisReady] = useState(false);
  const [isDetailedAnalysisInProgress, setIsDetailedAnalysisInProgress] = useState(false);
  const [showDetailedRules, setShowDetailedRules] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [subredditId, setSubredditId] = useState<string | null>(null);

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

  const isValidAnalysis = (analysis: unknown): analysis is AnalysisResult => {
    return analysis !== null &&
           typeof analysis === 'object' &&
           'info' in (analysis as any) &&
           'analysis' in (analysis as any) &&
           'posts' in (analysis as any);
  };

  useEffect(() => {
    // This effect is only for cleanup when the component is fully unmounted
    return () => {
      // Only terminate if we're actually leaving the analysis page
      // (not just navigating between subreddits)
      if (!analysisWorker.isAnalyzing()) {
        analysisWorker.terminate();
      }
    };
  }, []);

  const performAnalysis = useCallback(async () => {
    if (!subreddit) {
      setError('Please enter a subreddit name');
      return;
    }

    // Cancel any existing analysis before starting a new one
    if (analysisWorker.isAnalyzing()) {
      analysisWorker.cancelCurrentAnalysis();
    }

    setError(null);
    setAnalysisProgress({ status: 'Starting analysis...', progress: 0, indeterminate: true });

    try {
      const redditApi = new RedditAPI();
      const info = await redditApi.getSubredditInfo(subreddit);
      const posts = await redditApi.getSubredditPosts(subreddit, 'hot');

      await analysisWorker.analyze(
        info,
        posts,
        (progress: AnalysisProgress) => setAnalysisProgress(progress),
        (result: AnalysisResult) => {
          setLocalAnalysis(result);
          setIsBasicAnalysisReady(true);
          setAnalysisProgress({ status: 'Running detailed analysis...', progress: 50, indeterminate: false });
        }
      ).then((result: AnalysisResult) => {
        setLocalAnalysis(result);
        setIsDetailedAnalysisInProgress(false);
        localStorage.setItem(`analysis:${subreddit}`, JSON.stringify(result));
        setAnalysisProgress({ status: 'Analysis complete', progress: 100, indeterminate: false });
      }).catch((error: Error | string) => {
        setError(error instanceof Error ? error.message : error);
        setAnalysisProgress({ status: 'Analysis failed', progress: 0, indeterminate: false });
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch subreddit data');
      setAnalysisProgress({ status: 'Analysis failed', progress: 0, indeterminate: false });
    }
  }, [subreddit]);

  useEffect(() => {
    if (!auth?.user?.id) {
      setError('Please sign in to analyze subreddits');
      return;
    }

    if (!subreddit) {
      setError('Please enter a subreddit name');
      return;
    }

    performAnalysis();
  }, [auth?.user?.id, subreddit, performAnalysis]);

  useEffect(() => {
    if (!localAnalysis || !auth) return;

    // Check if subreddit exists in database and get its ID
    async function getOrCreateSubredditId() {
      try {
        if (!localAnalysis) return;

        // Use upsert to handle race conditions
        const { data: upsertedSubreddit, error: upsertError } = await supabase
          .from('subreddits')
          .upsert(
            {
              name: localAnalysis.info.name,
              subscriber_count: localAnalysis.info.subscribers,
              active_users: localAnalysis.info.active_users,
              marketing_friendly_score: localAnalysis.analysis.marketingFriendliness.score,
              posting_requirements: {
                restrictions: localAnalysis.analysis.contentStrategy.donts,
                bestTimes: localAnalysis.analysis.postingLimits.bestTimeToPost
              },
              posting_frequency: {
                frequency: localAnalysis.analysis.postingLimits.frequency,
                recommendedTypes: localAnalysis.analysis.contentStrategy.recommendedTypes
              },
              allowed_content: localAnalysis.analysis.contentStrategy.recommendedTypes,
              best_practices: localAnalysis.analysis.contentStrategy.dos,
              rules_summary: localAnalysis.info.rules.map(r => r.title).join('\n'),
              last_analyzed_at: new Date().toISOString()
            },
            {
              onConflict: 'name',
              ignoreDuplicates: false
            }
          )
          .select('id')
          .maybeSingle();

        if (upsertError) throw upsertError;

        if (upsertedSubreddit) {
          setSubredditId(upsertedSubreddit.id);
          return;
        }

        // If upsert didn't return data, try to fetch the existing record
        const { data: existingSubreddit, error: fetchError } = await supabase
          .from('subreddits')
          .select('id')
          .eq('name', localAnalysis.info.name)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (existingSubreddit) {
          setSubredditId(existingSubreddit.id);
        }
      } catch (err) {
        console.error('Error getting/creating subreddit:', err);
      }
    }

    getOrCreateSubredditId();
  }, [localAnalysis, auth]);

  useEffect(() => {
    if (!subredditId || !auth?.user?.id) return;

    // Check if subreddit is saved
    async function checkSavedStatus() {
      try {
        const { data, error } = await supabase
          .from('saved_subreddits')
          .select('id')
          .eq('subreddit_id', subredditId)
          .eq('user_id', auth.user.id)
          .maybeSingle();

        if (error) throw error;
        setIsSaved(!!data);
      } catch (err) {
        console.error('Error checking saved status:', err);
      }
    }

    checkSavedStatus();
  }, [subredditId, auth]);

  const toggleSaved = async () => {
    if (!subredditId || !localAnalysis || !auth?.user?.id) return;

    setSavingState('saving');
    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_subreddits')
          .delete()
          .eq('subreddit_id', subredditId)
          .eq('user_id', auth.user.id);

        if (error) throw error;
        setIsSaved(false);
      } else {
        // Add to saved
        const { error: savedError } = await supabase
          .from('saved_subreddits')
          .upsert(
            {
              subreddit_id: subredditId,
              user_id: auth.user.id,
              last_post_at: null
            },
            { onConflict: 'subreddit_id,user_id', ignoreDuplicates: true }
          );

        if (savedError) throw savedError;
        setIsSaved(true);
      }
      setSavingState('idle');
    } catch (err) {
      console.error('Error toggling saved status:', err);
      setSavingState('error');
      setTimeout(() => setSavingState('idle'), 2000);
    }
  };

  const LoadingIndicator = () => (
    <div className="flex items-center gap-2 text-gray-400">
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#C69B7B]"></div>
      <span className="text-sm">AI analysis in progress...</span>
    </div>
  );

  const LoadingListItem = () => (
    <li className="flex items-start gap-2 animate-pulse">
      <span className="text-[#C69B7B]">•</span>
      <div className="h-4 bg-gray-700/20 rounded w-full"></div>
    </li>
  );

  // Add this before the return statement
  const isAISection = (text: string) => {
    return text.includes('loading') || text.includes('Analyzing') || text.includes('in progress');
  };

  const renderListWithLoading = (items: string[], isLoading: boolean) => {
    if (isLoading && items.some(item => isAISection(item))) {
      return (
        <>
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-[#C69B7B]">•</span>
              {isAISection(item) ? (
                <div className="text-gray-500 italic">{item}</div>
              ) : (
                <span>{item}</span>
              )}
            </li>
          ))}
          <LoadingListItem />
          <LoadingListItem />
        </>
      );
    }
    return items.map((item, index) => (
      <li key={index} className="flex items-start gap-2">
        <span className="text-[#C69B7B]">•</span>
        <span>{item}</span>
      </li>
    ));
  };

  if (!isBasicAnalysisReady && !error) {
    return (
      <div className="bg-[#111111] rounded-lg p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C69B7B]"></div>
          <div className="text-gray-400">Analyzing subreddit...</div>
          <div className="text-sm text-gray-500">Calculating basic metrics</div>
        </div>
      </div>
    );
  }

  if (error || !localAnalysis || !isValidAnalysis(localAnalysis)) {
    return (
      <div className="bg-[#111111] rounded-lg p-8">
        <div className="flex items-start gap-4 text-red-400">
          <AlertTriangle size={24} className="shrink-0 mt-1" />
          <div>
            <h3 className="font-medium mb-2">Analysis Error</h3>
            <p className="text-sm">{error || 'Invalid analysis data received. Please try again.'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-sm transition-colors"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // At this point TypeScript knows localAnalysis is valid
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
  } = localAnalysis;

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
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C69B7B] to-[#E6B17E] text-white text-sm font-medium">
              {marketingFriendliness.score}% Marketing-Friendly
            </span>
            <button 
              onClick={toggleSaved}
              className="secondary flex items-center gap-2 h-9 px-3 text-sm md:text-base"
              disabled={savingState === 'saving'}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck size={18} />
                  <span className="text-sm">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark size={18} />
                  <span className="text-sm">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {isDetailedAnalysisInProgress && (
          <div className="mt-4 bg-[#1A1A1A] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#C69B7B]"></div>
              <div className="text-sm text-gray-400">{analysisProgress.status}</div>
              <div className="ml-auto text-xs text-gray-500">{analysisProgress.progress}%</div>
            </div>
            <div className="mt-2 h-1 bg-[#222222] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#C69B7B] transition-all duration-300"
                style={{ width: `${analysisProgress.progress}%` }}
              />
            </div>
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
              {renderListWithLoading(postingLimits.contentRestrictions, isDetailedAnalysisInProgress)}
            </ul>
          </div>

          {/* Best Posting Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Posting Times</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {postingLimits.bestTimeToPost.map((time: PostingTime, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Content Strategy */}
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
              {renderListWithLoading(contentStrategy.dos, isDetailedAnalysisInProgress)}
            </ul>
          </div>
        </div>

        {/* Game Plan */}
        <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 text-sm md:text-base">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#C69B7B]" />
                <h3 className="font-medium">Game Plan</h3>
              </div>
              {isDetailedAnalysisInProgress && <LoadingIndicator />}
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Title Template */}
            <div>
              <h4 className="text-sm text-gray-400 mb-3">Title Template</h4>
              <div className="bg-[#111111] rounded-lg p-4 border border-gray-800">
                {isDetailedAnalysisInProgress ? (
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-700/20 rounded w-3/4 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700/20 rounded w-1/2 animate-pulse"></div>
                      <div className="h-4 bg-gray-700/20 rounded w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <code className="text-emerald-400 font-mono block mb-3">
                      {titleTemplates.patterns[0]}
                    </code>
                    <div className="text-sm text-gray-400">
                      <div className="mb-2">Example:</div>
                      {titleTemplates.examples.map((example, index) => (
                        <div key={index} className="text-white">{example}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Immediate Actions</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {renderListWithLoading(gamePlan.immediate, isDetailedAnalysisInProgress)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Short-term Strategy</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {renderListWithLoading(gamePlan.shortTerm, isDetailedAnalysisInProgress)}
                </ul>
              </div>
            </div>

            {/* Strategic Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Strengths</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {renderListWithLoading(strategicAnalysis.strengths, isDetailedAnalysisInProgress)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Opportunities</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {renderListWithLoading(strategicAnalysis.opportunities, isDetailedAnalysisInProgress)}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Rules Analysis */}
        <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800">
          <button 
            onClick={() => setShowDetailedRules(!showDetailedRules)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#111111] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Detailed Rules Analysis</h3>
            </div>
            {showDetailedRules ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>

          {showDetailedRules && info.rules && (
            <div className="bg-[#0A0A0A] rounded-lg p-4 border border-gray-800">
              {info.rules.map((rule: any, index: number) => {
                const ruleWithImpact = rule as { title: string; description: string; marketingImpact?: 'high' | 'medium' | 'low' };
                return (
                  <div key={index} className="mb-4 last:mb-0">
                    <h4 className="font-medium mb-1">Rule {index + 1}: {ruleWithImpact.title}</h4>
                    <p className="text-sm text-gray-400">{ruleWithImpact.description}</p>
                    <div className={getMarketingImpactStyle(ruleWithImpact.marketingImpact ?? 'low')}>
                      Marketing Impact: {ruleWithImpact.marketingImpact ?? 'low'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubredditAnalysis;