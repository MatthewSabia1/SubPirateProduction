import React, { useState, useEffect } from 'react';
import { Download, FolderPlus, X, ChevronDown, ChevronUp, Search, Calendar, Users, Activity, Send, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SubredditAnalysis from '../pages/SubredditAnalysis';
import { getSubredditInfo, getSubredditPosts, cleanRedditImageUrl } from '../lib/reddit';
import { analyzeSubredditData, AnalysisResult } from '../lib/analysis';
import AddToProjectModal from './AddToProjectModal';
import AnalysisCard from '../features/subreddit-analysis/components/analysis-card';
import { AnalysisData } from '../features/subreddit-analysis/types';

interface ProjectSubreddit {
  id: string;
  subreddit: {
    id: string;
    name: string;
    subscriber_count: number;
    active_users: number;
    marketing_friendly_score: number;
    allowed_content: string[];
    icon_img: string | null;
    community_icon: string | null;
    analysis_data: AnalysisData | null;
  };
  created_at: string;
}

interface ProjectSubredditsProps {
  projectId: string;
}

interface PostCount {
  subreddit_id: string;
  total_posts_24h: number;
}

interface SubredditCounts {
  [key: string]: number;
}

interface DatabaseSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  icon_img: string | null;
  community_icon: string | null;
  analysis_data: AnalysisData | null;
}

interface DatabaseProjectSubreddit {
  id: string;
  created_at: string;
  subreddit: DatabaseSubreddit;
}

function ProjectSubreddits({ projectId }: ProjectSubredditsProps) {
  const [subreddits, setSubreddits] = useState<ProjectSubreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{id: string; name: string} | null>(null);
  const [postCounts, setPostCounts] = useState<Record<string, number | null>>({});

  // Function to refresh subreddit data
  const refreshSubredditData = async (subreddit: ProjectSubreddit['subreddit']) => {
    try {
      console.log(`Refreshing data for r/${subreddit.name}...`);
      const info = await getSubredditInfo(subreddit.name);
      
      if (info) {
        console.log(`Updated data for r/${subreddit.name}:`, {
          subscribers: info.subscribers,
          active_users: info.active_users
        });
        
        // Update the subreddit in the database with new data
        const { error } = await supabase
          .from('subreddits')
          .update({
            subscriber_count: info.subscribers,
            active_users: info.active_users,
            icon_img: info.icon_img,
            community_icon: info.community_icon
          })
          .eq('id', subreddit.id);

        if (error) {
          console.error(`Error updating r/${subreddit.name} in database:`, error);
          return null;
        }

        // Update local state
        setSubreddits(prev => prev.map(s => {
          if (s.subreddit.id === subreddit.id) {
            return {
              ...s,
              subreddit: {
                ...s.subreddit,
                subscriber_count: info.subscribers,
                active_users: info.active_users,
                icon_img: info.icon_img,
                community_icon: info.community_icon
              }
            };
          }
          return s;
        }));
      }
      
      return info;
    } catch (err) {
      console.error(`Error refreshing data for r/${subreddit.name}:`, err);
      return null;
    }
  };

  useEffect(() => {
    fetchProjectSubreddits();
    fetchPostCounts();
  }, [projectId]);

  // Add effect to refresh subreddit data periodically
  useEffect(() => {
    if (subreddits.length === 0) return;

    // Refresh data for all subreddits
    const refreshAll = async () => {
      for (const projectSubreddit of subreddits) {
        await refreshSubredditData(projectSubreddit.subreddit);
      }
    };

    refreshAll();

    // Set up interval to refresh every hour
    const interval = setInterval(refreshAll, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [subreddits.length]);

  // New effect: when subreddits update, fetch their post counts
  useEffect(() => {
    if (subreddits.length > 0) {
      fetchPostCounts();
    }
  }, [subreddits]);

  const fetchPostCounts = async () => {
    try {
      if (subreddits.length === 0) return;

      // Get post counts for all subreddits
      const { data, error } = await supabase
        .rpc('get_subreddit_post_counts', {
          subreddit_ids: subreddits.map(s => s.subreddit.id)
        });

      if (error) throw error;

      // Convert to record format
      const counts = (data as PostCount[] || []).reduce<SubredditCounts>((acc, { subreddit_id, total_posts_24h }) => ({
        ...acc,
        [subreddit_id]: total_posts_24h
      }), {});

      setPostCounts(counts);
    } catch (err) {
      console.error('Error fetching post counts:', err);
    }
  };

  const getSubredditIcon = (subreddit: ProjectSubreddit['subreddit']): string => {
    // Use community icon first if available
    if (subreddit.community_icon) {
      return subreddit.community_icon;
    }
    // Fallback to icon_img if available
    if (subreddit.icon_img) {
      return subreddit.icon_img;
    }
    // Final fallback to generated placeholder
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111&radius=12`;
  };

  const fetchProjectSubreddits = async () => {
    try {
      console.log(`Fetching subreddits for project ID: ${projectId}`, { projectId });
      
      // First, get just the basic project_subreddits data without the complex join
      const { data: projectSubredditData, error: projectSubredditError } = await supabase
        .from('project_subreddits')
        .select(`
          id,
          created_at,
          project_id,
          subreddit_id
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (projectSubredditError) {
        // Check for the specific recursion error and try a different approach
        if (projectSubredditError.code === '42P17') {
          console.warn('RLS policy recursion detected. This is a Supabase configuration issue.');
          console.warn('Attempting alternative approach to fetch project subreddits...');
          
          // Try to directly fetch from the project_subreddits table using service role client
          // This is a workaround until the RLS policies are fixed
          try {
            // First verify the project exists
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('id, name, description')
              .eq('id', projectId)
              .single();
              
            if (projectError) {
              console.error('Error verifying project existence:', projectError);
              throw projectError;
            }
            
            console.log(`Project exists:`, projectData);
            
            // Instead of showing ALL saved subreddits, use a safer approach:
            // 1. Try to get just the specific project_subreddits entries
            // 2. Fallback to project-specific logic only if needed

            // First attempt: Try to use the REST API endpoint to bypass RLS
            // (Requires backend support for this route)
            try {
              console.log("Attempting to use API endpoint to bypass RLS...");
              
              // Make a fetch request to a custom API endpoint that uses service role
              const response = await fetch(`/api/projects/${projectId}/subreddits`, {
                headers: {
                  'Content-Type': 'application/json',
                  // Include auth token for user validation on server
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
              });
              
              if (response.ok) {
                const projectSubreddits = await response.json();
                console.log(`Fetched ${projectSubreddits.length} subreddits via API endpoint`);
                
                if (projectSubreddits && projectSubreddits.length > 0) {
                  // Transform the data to match our component's expected format
                  const transformedData = projectSubreddits.map((subreddit: any) => ({
                    id: subreddit.project_subreddit_id,
                    created_at: subreddit.created_at,
                    subreddit: {
                      id: subreddit.id,
                      name: subreddit.name,
                      subscriber_count: subreddit.subscriber_count,
                      active_users: subreddit.active_users,
                      marketing_friendly_score: subreddit.marketing_friendly_score || 0,
                      allowed_content: subreddit.allowed_content || [],
                      icon_img: subreddit.icon_img,
                      community_icon: subreddit.community_icon,
                      analysis_data: null
                    }
                  }));
                  
                  setSubreddits(transformedData);
                  setLoading(false);
                  return;
                }
              } else {
                console.warn("API endpoint unavailable or returned an error");
              }
            } catch (apiError) {
              console.warn("Error using API endpoint:", apiError);
              // Continue to next fallback approach
            }

            // IMPORTANT: This is where we're fixing the issue causing all user's saved subreddits
            // to appear in every project. Instead of querying all saved_subreddits, we'll:
            // 1. First try to query just this project's projects_subreddits to get the IDs
            // 2. Only if that fails, fall back to the username/keyword strategy

            // Try to get just the subreddit IDs from project_subreddits
            // NOTE: Even though the RLS policy is failing above, direct ID queries
            // might work in some cases where joins fail
            try {
              const { data: projectSubredditIds, error: projectSubredditIdError } = await supabase
                .from('project_subreddits')
                .select('subreddit_id')
                .eq('project_id', projectId);
                
              if (!projectSubredditIdError && projectSubredditIds && projectSubredditIds.length > 0) {
                console.log(`Found ${projectSubredditIds.length} subreddit IDs directly from project_subreddits`);
                const subredditIds = projectSubredditIds.map(ps => ps.subreddit_id);
                
                // Now fetch the actual subreddits
                const { data: projectSubs, error: projectSubsError } = await supabase
                  .from('subreddits')
                  .select(`
                    id,
                    name,
                    subscriber_count,
                    active_users,
                    marketing_friendly_score,
                    allowed_content,
                    icon_img,
                    community_icon,
                    analysis_data
                  `)
                  .in('id', subredditIds);
                  
                if (!projectSubsError && projectSubs && projectSubs.length > 0) {
                  console.log(`Successfully fetched ${projectSubs.length} project-specific subreddits`);
                  
                  // Transform into the expected format
                  const transformedData = projectSubs.map((subredditData, index) => {
                    return {
                      id: `ps-${index}-${subredditData.id}`, // Generate a temporary ID
                      created_at: new Date().toISOString(),
                      subreddit: {
                        id: subredditData.id,
                        name: subredditData.name,
                        subscriber_count: subredditData.subscriber_count,
                        active_users: subredditData.active_users,
                        marketing_friendly_score: subredditData.marketing_friendly_score || 0,
                        allowed_content: subredditData.allowed_content || [],
                        icon_img: subredditData.icon_img,
                        community_icon: subredditData.community_icon,
                        analysis_data: null
                      }
                    };
                  });
                  
                  setSubreddits(transformedData);
                  setLoading(false);
                  return;
                }
              }
            } catch (directQueryError) {
              console.warn("Error querying project subreddits directly:", directQueryError);
              // Continue to next fallback
            }
            
            // If we reach here, all direct approaches failed, so fall back to username/keyword approach
            // but modify it to be more accurate
            let subredditQuery = supabase
              .from('subreddits')
              .select(`
                id,
                name,
                subscriber_count,
                active_users,
                marketing_friendly_score,
                allowed_content,
                icon_img,
                community_icon,
                analysis_data
              `);
              
            // If the project name contains a username (typically from SpyGlass analysis)
            // Example: "Analysis of u/username"
            const usernameMatch = projectData.name.match(/u\/([a-zA-Z0-9_-]+)/i);
            const username = usernameMatch ? usernameMatch[1] : null;
            
            console.log(`Extracted username from project name: ${username || 'None'}`);
            
            let foundSubreddits = false;
            
            // If we found a username in the project name, prioritize subreddits from that user's analysis
            if (username) {
              // Look for recently saved subreddits that may be related to this username
              // Try to check the saved_subreddits table for entries with this username
              try {
                // IMPORTANT CHANGE: Be much more specific in our query to avoid showing ALL saved subreddits
                // Only look for subreddits explicitly saved with notes related to this username
                const { data: savedList, error: savedListError } = await supabase
                  .from('saved_subreddits')
                  .select('subreddit_id')
                  .ilike('notes', `%${username}%`)
                  .limit(25); // Reduced limit to avoid overloading
                  
                if (!savedListError && savedList && savedList.length > 0) {
                  const savedIds = savedList.map(item => item.subreddit_id);
                  console.log(`Found ${savedIds.length} subreddits possibly related to user ${username}`);
                  subredditQuery = subredditQuery.in('id', savedIds);
                  foundSubreddits = true;
                } else {
                  console.log(`No saved subreddits found for username ${username}`);
                }
              } catch (e) {
                console.error('Error trying to find username-related subreddits:', e);
              }
            }
            
            // If no subreddits found via username, try description keywords
            if (!foundSubreddits && projectData.description) {
              // If no username but we have a description, try to find keywords
              const keywords = projectData.description
                .toLowerCase()
                .split(/\s+/)
                .filter((word: string) => word.length > 3)
                .slice(0, 3); // Take up to 3 keywords
                
              if (keywords.length > 0) {
                console.log(`Using keywords from description: ${keywords.join(', ')}`);
                
                // Try each keyword to find relevant subreddits
                for (const keyword of keywords) {
                  try {
                    const { data: keywordMatches, error: keywordError } = await supabase
                      .from('subreddits')
                      .select('id')
                      .ilike('name', `%${keyword}%`)
                      .limit(15);
                      
                    if (!keywordError && keywordMatches && keywordMatches.length > 0) {
                      console.log(`Found ${keywordMatches.length} subreddits matching keyword "${keyword}"`);
                      subredditQuery = supabase
                        .from('subreddits')
                        .select(`
                          id,
                          name,
                          subscriber_count,
                          active_users,
                          marketing_friendly_score,
                          allowed_content,
                          icon_img,
                          community_icon,
                          analysis_data
                        `)
                        .in('id', keywordMatches.map(m => m.id));
                      foundSubreddits = true;
                      break; // Stop after finding matches for one keyword
                    }
                  } catch (e) {
                    console.error(`Error finding subreddits for keyword "${keyword}":`, e);
                  }
                }
              }
            }
            
            // If we didn't find any user or keyword matches, 
            // DON'T show all subreddits, just show an empty state
            if (!foundSubreddits) {
              console.log("No relevant subreddits found for project, showing empty state");
              setError('No subreddits found for this project. The database security policy is preventing access to project subreddits.');
              setSubreddits([]);
              setLoading(false);
              return;
            }
            
            // Only execute the query if we found relevant subreddits
            const { data: allSubreddits, error: subredditsError } = await subredditQuery;
              
            if (subredditsError) {
              console.error('Error fetching fallback subreddits:', subredditsError);
              throw subredditsError;
            }
            
            console.log(`Fetched ${allSubreddits?.length || 0} relevant fallback subreddits`);
            
            if (!allSubreddits || allSubreddits.length === 0) {
              setError('No subreddits could be found for this project due to a database configuration issue.');
              setSubreddits([]);
              setLoading(false);
              return;
            }
            
            // Display a clear message about the fallback approach
            setError(
              `Note: Due to a database configuration issue, we're showing ${
                username ? `subreddits that may be related to u/${username}` : 'subreddits that match the project description'
              }. These may not be the exact subreddits in this project.`
            );
            
            // Transform the data for display
            const transformedData = (allSubreddits || []).map((subredditData, index) => {
              return {
                id: `temp-${index}-${subredditData.id}`, // Generate a temporary ID
                created_at: new Date().toISOString(),
                subreddit: {
                  id: subredditData.id,
                  name: subredditData.name,
                  subscriber_count: subredditData.subscriber_count,
                  active_users: subredditData.active_users,
                  marketing_friendly_score: subredditData.marketing_friendly_score || 0,
                  allowed_content: subredditData.allowed_content || [],
                  icon_img: subredditData.icon_img,
                  community_icon: subredditData.community_icon,
                  analysis_data: null
                }
              };
            });
            
            setSubreddits(transformedData);
            setLoading(false);
            return;
            
          } catch (fallbackError) {
            console.error('Error in fallback approach:', fallbackError);
            throw new Error('Database security policy error. Please contact your administrator to fix the project_members RLS policy.');
          }
        }
        
        console.error('Error in project_subreddits query:', projectSubredditError);
        throw projectSubredditError;
      }
      
      // Continue with the normal flow if there was no error
      console.log(`Raw project_subreddits response:`, JSON.stringify(projectSubredditData, null, 2));
      console.log(`Number of items returned: ${projectSubredditData?.length || 0}`);
      
      if (!projectSubredditData || projectSubredditData.length === 0) {
        console.log(`No subreddits found for project ID: ${projectId}. Checking if project exists...`);
        
        // Verify the project exists
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', projectId)
          .single();
          
        if (projectError) {
          console.error('Error verifying project:', projectError);
        } else {
          console.log(`Project exists:`, projectData);
        }
        
        setSubreddits([]);
        setLoading(false);
        return;
      }
      
      // Extract subreddit IDs from the response
      const subredditIds = projectSubredditData.map(item => item.subreddit_id);
      console.log(`Fetching data for ${subredditIds.length} subreddits`);
      
      // Now fetch the subreddit data in a separate query
      const { data: subredditsData, error: subredditsError } = await supabase
        .from('subreddits')
        .select(`
          id,
          name,
          subscriber_count,
          active_users,
          marketing_friendly_score,
          allowed_content,
          icon_img,
          community_icon,
          analysis_data
        `)
        .in('id', subredditIds);
        
      if (subredditsError) {
        console.error('Error fetching subreddits data:', subredditsError);
        throw subredditsError;
      }
      
      console.log(`Fetched ${subredditsData?.length || 0} subreddits`);
      
      // Now combine the two datasets
      const transformedData = projectSubredditData.map(projectSubreddit => {
        const subredditData = subredditsData.find(s => s.id === projectSubreddit.subreddit_id);
        
        // Skip if no matching subreddit found
        if (!subredditData) {
          console.warn(`No subreddit data found for ID: ${projectSubreddit.subreddit_id}. This entry may be orphaned.`);
          
          // We can choose to automatically clean up orphaned records here
          // Uncomment the following code to enable auto-cleanup
          /*
          supabase
            .from('project_subreddits')
            .delete()
            .eq('id', projectSubreddit.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error cleaning up orphaned record:', error);
              } else {
                console.log(`Cleaned up orphaned record for project subreddit ID ${projectSubreddit.id}`);
              }
            });
          */
          
          return null;
        }
        
        return {
          id: projectSubreddit.id,
          created_at: projectSubreddit.created_at,
          subreddit: {
            id: subredditData.id,
            name: subredditData.name,
            subscriber_count: subredditData.subscriber_count,
            active_users: subredditData.active_users,
            marketing_friendly_score: subredditData.marketing_friendly_score,
            allowed_content: subredditData.allowed_content || [],
            icon_img: subredditData.icon_img,
            community_icon: subredditData.community_icon,
            analysis_data: null // Start with null, we'll handle this separately
          }
        };
      }).filter(Boolean) as ProjectSubreddit[]; // Filter out any null values
      
      setSubreddits(transformedData);
    } catch (err) {
      console.error('Error fetching project subreddits:', err);
      setError('Failed to load project subreddits');
    } finally {
      setLoading(false);
    }
  };

  const removeProjectSubreddit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_subreddits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSubreddits(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error removing subreddit:', err);
      setError('Failed to remove subreddit');
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

  const toggleSubredditExpansion = async (subredditName: string) => {
    if (expandedSubreddit === subredditName) {
      setExpandedSubreddit(null);
      setAnalysisResult(null);
      return;
    }

    setExpandedSubreddit(subredditName);
    setAnalyzing(true);

    try {
      // Try to load from localStorage first
      const cached = localStorage.getItem(`analysis:${subredditName}`);
      if (cached) {
        setAnalysisResult(JSON.parse(cached));
        setAnalyzing(false);
        return;
      }

      // If no cache, perform analysis
      const [info, posts] = await Promise.all([
        getSubredditInfo(subredditName),
        getSubredditPosts(subredditName, 'top', 500, 'month')
      ]);

      const result = await analyzeSubredditData(
        info,
        posts,
        () => {} // Progress updates not needed here
      );

      setAnalysisResult(result);
      
      // Cache the result
      localStorage.setItem(
        `analysis:${subredditName}`,
        JSON.stringify(result)
      );
    } catch (err) {
      console.error('Error analyzing subreddit:', err);
      setError('Failed to analyze subreddit');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredSubreddits = subreddits
    .filter(s => s.subreddit.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.subreddit.name.localeCompare(b.subreddit.name);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading project subreddits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by name..."
            className="search-input w-full h-12 md:h-10 bg-[#111111] rounded-md"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
          className="bg-[#111111] border-none rounded-md px-4 h-12 md:h-10 focus:ring-1 focus:ring-[#333333] min-w-[140px]"
        >
          <option value="date">Date Added</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Subreddits Table */}
      <div className="bg-[#111111] rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_auto_80px_200px] gap-4 px-6 py-4 border-b border-[#222222] text-sm text-gray-400">
          <div className="hidden md:block">Subreddit</div>
          <div className="hidden md:block">Community Stats</div>
          <div className="hidden md:block">Marketing-Friendly</div>
          <div className="hidden md:block">Content Types</div>
          <div className="hidden md:block text-center">Posts</div>
          <div className="hidden md:block text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[#222222]">
          {filteredSubreddits.map((saved) => (
            <div key={saved.id}>
              <div 
                onClick={() => toggleSubredditExpansion(saved.subreddit.name)}
                className="flex flex-col md:grid md:grid-cols-[2fr_1.5fr_1fr_auto_80px_200px] gap-4 p-4 md:px-6 md:py-4 items-start md:items-center hover:bg-[#1A1A1A] transition-colors cursor-pointer"
              >
                {/* Subreddit Name with Icon */}
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden flex-shrink-0">
                    <img 
                      src={getSubredditIcon(saved.subreddit)}
                      alt={saved.subreddit.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.warn(`Failed to load icon for r/${saved.subreddit.name}:`, e);
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${saved.subreddit.name}&backgroundColor=111111&radius=12`;
                      }}
                    />
                  </div>
                  <div className="font-medium truncate">
                    r/{saved.subreddit.name}
                  </div>
                </div>

                {/* Community Stats */}
                <div className="hidden md:flex flex-col text-sm mt-2 lg:mt-0">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users size={14} />
                    <span>{formatNumber(saved.subreddit.subscriber_count)}</span>
                  </div>
                  {saved.subreddit.active_users > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-400 mt-1">
                      <Activity size={14} />
                      <span>{formatNumber(saved.subreddit.active_users)} online</span>
                    </div>
                  )}
                </div>

                {/* Marketing Score */}
                <div className="w-full mt-2 md:mt-0">
                  <div className="w-full max-w-[100px] h-2 bg-[#222222] rounded-full overflow-hidden">
                    <div className="h-full" style={{
                      width: `${saved.subreddit.marketing_friendly_score}%`,
                      backgroundColor: saved.subreddit.marketing_friendly_score >= 80 ? '#4CAF50' :
                                     saved.subreddit.marketing_friendly_score >= 60 ? '#FFA726' :
                                     '#EF5350'
                    }} />
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {saved.subreddit.marketing_friendly_score}%
                  </div>
                </div>

                {/* Content Types */}
                <div className="flex flex-wrap gap-1 mt-2 md:mt-0 min-w-0">
                  {saved.subreddit.allowed_content.map((type) => (
                    <span 
                      key={type}
                      className={`px-2 py-1 text-xs rounded ${getContentTypeBadgeStyle(type)}`}
                    >
                      {type}
                    </span>
                  ))}
                </div>

                {/* Posts Count */}
                <div className="flex items-center gap-1 mt-2 md:mt-0 justify-center">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-400">{postCounts[saved.subreddit.id] || 0}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 md:mt-0 md:justify-end w-full md:w-auto">
                  <a
                    href={`https://reddit.com/r/${saved.subreddit.name}/submit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="bg-[#1A1A1A] hover:bg-[#252525] text-gray-200 flex items-center gap-2 h-9 px-4 text-sm whitespace-nowrap rounded-md transition-colors border border-[#333333]"
                    title="Post to Subreddit"
                  >
                    <Send size={16} className="text-gray-400" />
                    <span>Post</span>
                  </a>
                  <div className="flex items-center gap-1 ml-2">
                    <button 
                      className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                      title="Remove from Project"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProjectSubreddit(saved.id);
                      }}
                    >
                      <X size={20} />
                    </button>
                    <div className="text-gray-400 p-2">
                      {expandedSubreddit === saved.subreddit.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Analysis Section */}
              {expandedSubreddit === saved.subreddit.name && (
                <div className="border-t border-[#222222] bg-[#0A0A0A] p-6" onClick={e => e.stopPropagation()}>
                  {saved.subreddit.analysis_data ? (
                    <>
                      <AnalysisCard 
                        analysis={saved.subreddit.analysis_data as any}
                        mode="saved"
                      />
                      <div className="mt-6">
                        <a
                          href={`https://reddit.com/r/${saved.subreddit.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C69B7B] hover:text-[#B38A6A] transition-colors inline-flex items-center gap-2"
                        >
                          View all posts in r/{saved.subreddit.name}
                          <ChevronRight size={16} />
                        </a>
                      </div>
                    </>
                  ) : analyzing ? (
                    <div className="text-center py-8 text-gray-400">
                      Analyzing subreddit...
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No analysis data available
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedSubreddit && (
        <AddToProjectModal
          isOpen={true}
          onClose={() => setSelectedSubreddit(null)}
          subredditId={selectedSubreddit.id}
          subredditName={selectedSubreddit.name}
        />
      )}
    </div>
  );
}

export default ProjectSubreddits;