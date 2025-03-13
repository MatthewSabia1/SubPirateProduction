import React, { useState, useCallback, useEffect } from 'react';
import { Search, Shield, Users, ExternalLink, AlertTriangle, Activity, Bookmark, BookmarkCheck } from 'lucide-react';
import { getSubredditInfo, getSubredditPosts, searchSubreddits, SubredditInfo, RedditAPIError, cleanRedditImageUrl } from '../lib/reddit';
import { analyzeSubredditData, AnalysisProgress, AnalysisResult } from '../lib/analysis';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import AnalysisCard from '../features/subreddit-analysis/components/analysis-card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRedditAccounts } from '../contexts/RedditAccountContext';

const customStyles = `
  .dashboard-card {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #222222;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  }
  
  .dashboard-card:hover {
    border-color: #333333;
    transform: translateY(-4px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .dashboard-card-featured {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 2px solid #C69B7B;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
  }
  
  .dashboard-button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  
  .button-outline {
    color: #ffffff;
    border: 1px solid #C69B7B;
  }
  
  .button-outline:hover {
    background-color: #C69B7B;
    color: #000000;
  }
  
  .button-primary {
    background-color: #C69B7B;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
  }
  
  .button-primary:hover {
    background-color: #B38A6A;
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    background-color: rgba(198, 155, 123, 0.1);
    border: 1px solid rgba(198, 155, 123, 0.2);
    color: #C69B7B;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

function Dashboard() {
  const { user } = useAuth();
  const { hasRedditAccounts } = useRedditAccounts();
  const [savedSubreddits, setSavedSubreddits] = useState<Set<string>>(new Set());
  const [subredditInput, setSubredditInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SubredditInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showNSFW, setShowNSFW] = useState(true);
  const [sortBy, setSortBy] = useState<'subscribers' | 'name'>('subscribers');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const navigate = useNavigate();
  
  // Show success message if redirected from successful checkout
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'success') {
      setShowSuccessMessage(true);
      // Remove the query parameter
      window.history.replaceState({}, '', window.location.pathname);
      // Hide the message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (!searchInput?.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await searchSubreddits(searchInput);
        setSearchResults(results);
      } catch (err) {
        if (err instanceof RedditAPIError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message || 'An unexpected error occurred while searching. Please try again later.');
        } else {
          setError('An unexpected error occurred while searching. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchInput]);

  const getSubredditIcon = (subreddit: SubredditInfo) => {
    try {
      // Try community icon first
      if (subreddit.community_icon) {
        const cleanIcon = cleanRedditImageUrl(subreddit.community_icon);
        if (cleanIcon) return cleanIcon;
      }
      
      // Try icon_img next
      if (subreddit.icon_img) {
        const cleanIcon = cleanRedditImageUrl(subreddit.icon_img);
        if (cleanIcon) return cleanIcon;
      }
    } catch (err) {
      console.error('Error processing subreddit icon:', err);
    }
    
    // Fallback to generated avatar
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(subreddit.name)}&backgroundColor=0f0f0f&radius=12`;
  };

  const handleAnalyzeSubreddit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subredditInput?.trim() || analyzing) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysisResult(null);
    setAnalyzeProgress({
      status: 'Validating subreddit...',
      progress: 0,
      indeterminate: true
    });

    try {
      // Clean and validate subreddit name
      const cleanSubreddit = subredditInput.trim().replace(/^r\//, '');
      if (!cleanSubreddit) {
        throw new Error('Please enter a valid subreddit name');
      }
      
      setAnalyzeProgress({
        status: 'Fetching subreddit information...',
        progress: 20,
        indeterminate: false
      });
      
      const info = await getSubredditInfo(cleanSubreddit);

      setAnalyzeProgress({
        status: 'Collecting recent posts...',
        progress: 40,
        indeterminate: false
      });
      
      const posts = await getSubredditPosts(cleanSubreddit, 'top', 500, 'month');

      const result = await analyzeSubredditData(
        info,
        posts,
        (progress) => setAnalyzeProgress(progress)
      );

      localStorage.setItem(
        `analysis:${cleanSubreddit}`,
        JSON.stringify(result)
      );

      setAnalysisResult(result);
    } catch (err) {
      if (err instanceof RedditAPIError) {
        setAnalyzeError(err.message);
      } else if (err instanceof Error) {
        setAnalyzeError(err.message || 'An unexpected error occurred. Please try again later.');
      } else {
        setAnalyzeError('An unexpected error occurred. Please try again later.');
      }
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress(null);
    }
  };

  const filteredResults = searchResults
    .sort((a, b) => {
      if (sortBy === 'subscribers') {
        return b.subscribers - a.subscribers;
      }
      return a.name.localeCompare(b.name);
    });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Add function to check if a subreddit is saved
  const checkIfSaved = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_subreddits')
        .select(`
          subreddit_id,
          subreddits!inner (
            name
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Define type for the Supabase response
      interface SavedSubredditRow {
        subreddit_id: string;
        subreddits: {
          name: string;
        };
      }
      
      const savedNames = data?.reduce<string[]>((names, row: any) => {
        if (row.subreddits?.name) {
          names.push(row.subreddits.name);
        }
        return names;
      }, []) || [];
      
      setSavedSubreddits(new Set(savedNames));
    } catch (err) {
      console.error('Error checking saved subreddits:', err);
    }
  };

  // Load saved subreddits on mount
  useEffect(() => {
    checkIfSaved();
  }, [user]);

  // Add save/unsave functionality
  const handleSaveToggle = async (subreddit: SubredditInfo) => {
    if (!user) {
      console.error('User must be logged in to save subreddits');
      return;
    }

    try {
      if (savedSubreddits.has(subreddit.name)) {
        // Remove from saved - first get the subreddit_id
        const { data: subredditData, error: subredditError } = await supabase
          .from('subreddits')
          .select('id')
          .eq('name', subreddit.name)
          .single();

        if (subredditError) throw subredditError;

        // Then delete the saved_subreddits entry
        const { error } = await supabase
          .from('saved_subreddits')
          .delete()
          .eq('user_id', user.id)
          .eq('subreddit_id', subredditData.id);

        if (error) {
          console.error('Error removing subreddit:', error);
          throw error;
        }
        
        setSavedSubreddits(prev => {
          const next = new Set(prev);
          next.delete(subreddit.name);
          return next;
        });
      } else {
        // First ensure the subreddit exists in the subreddits table
        const { data: existingSubreddit, error: subredditError } = await supabase
          .from('subreddits')
          .upsert({
            name: subreddit.name,
            subscriber_count: subreddit.subscribers,
            active_users: subreddit.active_users,
            icon_img: subreddit.icon_img,
            community_icon: subreddit.community_icon,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'name'
          })
          .select()
          .single();

        if (subredditError) {
          console.error('Error upserting subreddit:', subredditError);
          throw subredditError;
        }

        // Now save to saved_subreddits
        const { error: saveError } = await supabase
          .from('saved_subreddits')
          .insert({
            user_id: user.id,
            subreddit_id: existingSubreddit.id,
            created_at: new Date().toISOString()
          });

        if (saveError) {
          console.error('Error saving subreddit:', saveError);
          throw saveError;
        }
        
        setSavedSubreddits(prev => new Set([...prev, subreddit.name]));
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-20">
      <style>{customStyles}</style>
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
          <p className="text-center">
            🎉 Thank you for subscribing! Your account has been successfully upgraded.
          </p>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">Reddit <span className="text-[#C69B7B]">War Room</span></h1>
        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Access powerful tools to find, analyze, and organize subreddits for your strategic marketing campaigns.
        </p>
      </div>

      <div className="flex flex-col gap-8 max-w-5xl mx-auto mb-12">
        {/* Analyze Specific Subreddit */}
        <div className="dashboard-card-featured">
          <h2 className="text-xl font-semibold mb-6">Analyze Specific Subreddit</h2>
          <form onSubmit={handleAnalyzeSubreddit} className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={subredditInput}
                onChange={(e) => setSubredditInput(e.target.value)}
                placeholder="Enter subreddit name (with or without r/)"
                className="w-full h-[52px] bg-[#050505] rounded-lg pl-4 pr-[120px] text-white placeholder-gray-500 border-none focus:ring-1 focus:ring-[#C69B7B]"
                disabled={analyzing}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button 
                  type="submit" 
                  className="dashboard-button button-primary h-10 px-6 rounded-lg text-base font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-[#C69B7B]"
                  disabled={analyzing}
                >
                  <Search size={16} />
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>
            
            {analyzeProgress && (
              <div className="bg-[#0a0a0a] p-4 rounded-lg">
                <ProgressBar 
                  progress={analyzeProgress.progress}
                  status={analyzeProgress.status}
                  indeterminate={analyzeProgress.indeterminate}
                />
              </div>
            )}

            {analyzeError && (
              <div className="p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
                <AlertTriangle size={20} className="shrink-0" />
                <p>{analyzeError}</p>
              </div>
            )}

            {analysisResult && (
              <div className="mt-8">
                <AnalysisCard 
                  analysis={analysisResult}
                  isLoading={analyzing}
                  error={analyzeError}
                />
              </div>
            )}
          </form>
        </div>

        {/* Discover Subreddits */}
        <div className="dashboard-card">
          <h2 className="text-xl font-semibold mb-6">Discover Subreddits</h2>
          <div className="space-y-6">
            <div className="relative">
              <input 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search subreddits by keywords..."
                className="w-full h-[52px] bg-[#050505] rounded-lg pl-4 pr-[120px] text-white placeholder-gray-500 border-none focus:ring-1 focus:ring-[#C69B7B]"
                disabled={loading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {loading && (
                  <div className="text-gray-400">
                    Searching...
                  </div>
                )}
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-[#0A0A0A] rounded-lg px-4 h-10">
                  <Users size={16} className="text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'subscribers' | 'name')}
                    className="bg-transparent border-none text-base text-gray-400 focus:ring-0 cursor-pointer h-10"
                  >
                    <option value="subscribers">Most Subscribers</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
                <AlertTriangle size={20} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12 text-gray-400">
                Searching subreddits...
              </div>
            )}

            {!loading && searchResults.length === 0 && searchInput && (
              <div className="text-center py-12 text-gray-400">
                No subreddits found matching your search.
              </div>
            )}

            {filteredResults.length > 0 && (
              <div className="space-y-3">
                {filteredResults.map((subreddit) => (
                  <div 
                    key={subreddit.name}
                    className="flex items-start gap-4 bg-[#0A0A0A] p-4 rounded-lg hover:bg-[#1A1A1A] transition-colors group"
                  >
                    <a 
                      href={`https://reddit.com/r/${subreddit.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img 
                        src={getSubredditIcon(subreddit)}
                        alt={`r/${subreddit.name}`}
                        className="w-12 h-12 rounded-lg bg-[#1A1A1A] group-hover:bg-[#222222] transition-colors object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (subreddit.icon_img && target.src !== subreddit.icon_img) {
                            target.src = subreddit.icon_img;
                          } else {
                            target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111&radius=12`;
                          }
                        }}
                        loading="lazy"
                      />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a 
                          href={`https://reddit.com/r/${subreddit.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2"
                        >
                          r/{subreddit.name}
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                      </div>
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                        {subreddit.description}
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5 bg-[#1A1A1A] px-2.5 py-1 rounded-md">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-gray-300 font-medium">{formatNumber(subreddit.subscribers)}</span>
                            {subreddit.active_users > 0 && (
                              <>
                                <span className="text-gray-600 mx-1.5">•</span>
                                <Activity size={14} className="text-emerald-400" />
                                <span className="text-emerald-400 font-medium">{formatNumber(subreddit.active_users)} online</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSaveToggle(subreddit)}
                        className={`h-9 px-3 flex items-center gap-1.5 rounded-md transition-colors whitespace-nowrap ${
                          savedSubreddits.has(subreddit.name)
                            ? 'bg-[#C69B7B] text-white hover:bg-[#B38A6A]'
                            : 'bg-[#1A1A1A] text-gray-400 hover:text-white hover:bg-[#222222]'
                        }`}
                        title={savedSubreddits.has(subreddit.name) ? 'Remove from saved' : 'Save for later'}
                      >
                        {savedSubreddits.has(subreddit.name) ? (
                          <>
                            <BookmarkCheck size={16} />
                            <span className="text-sm font-medium">Saved</span>
                          </>
                        ) : (
                          <>
                            <Bookmark size={16} />
                            <span className="text-sm font-medium">Save</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={async () => {
                          setSubredditInput(subreddit.name);
                          setAnalyzing(true);
                          setAnalyzeError(null);
                          setAnalysisResult(null);
                          setAnalyzeProgress({
                            status: 'Validating subreddit...',
                            progress: 0,
                            indeterminate: true
                          });

                          try {
                            const cleanSubreddit = subreddit.name.trim().replace(/^r\//, '');
                            
                            setAnalyzeProgress({
                              status: 'Fetching subreddit information...',
                              progress: 20,
                              indeterminate: false
                            });
                            
                            const info = await getSubredditInfo(cleanSubreddit);

                            setAnalyzeProgress({
                              status: 'Collecting recent posts...',
                              progress: 40,
                              indeterminate: false
                            });
                            
                            const posts = await getSubredditPosts(cleanSubreddit, 'top', 500, 'month');

                            const result = await analyzeSubredditData(
                              info,
                              posts,
                              (progress) => setAnalyzeProgress(progress)
                            );

                            localStorage.setItem(
                              `analysis:${cleanSubreddit}`,
                              JSON.stringify(result)
                            );

                            setAnalysisResult(result);
                          } catch (err) {
                            if (err instanceof RedditAPIError) {
                              setAnalyzeError(err.message);
                            } else if (err instanceof Error) {
                              setAnalyzeError(err.message || 'An unexpected error occurred. Please try again later.');
                            } else {
                              setAnalyzeError('An unexpected error occurred. Please try again later.');
                            }
                            setAnalysisResult(null);
                          } finally {
                            setAnalyzing(false);
                            setAnalyzeProgress(null);
                          }
                        }}
                        className="dashboard-button button-primary h-9 px-4 rounded-md text-sm font-medium text-white transition-colors whitespace-nowrap flex items-center gap-2"
                        disabled={analyzing}
                      >
                        <Search size={16} />
                        {analyzing ? 'Analyzing...' : 'Analyze'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;