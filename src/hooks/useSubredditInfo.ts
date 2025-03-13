import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubredditInfo {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  active_users: number;
  rules?: Array<{
    title: string;
    description: string;
  }>;
  created_utc: number;
  over18: boolean;
  allowedContentTypes?: string[];
}

export const useSubredditInfo = (subredditName: string) => {
  const [subredditInfo, setSubredditInfo] = useState<SubredditInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubredditInfo = async () => {
      if (!subredditName) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First check if we have this subreddit in our database
        const { data: savedSubreddit, error: dbError } = await supabase
          .from('subreddits')
          .select('*')
          .eq('name', subredditName.toLowerCase())
          .single();

        if (savedSubreddit && !dbError) {
          setSubredditInfo({
            name: savedSubreddit.name,
            title: savedSubreddit.title || '',
            description: savedSubreddit.description || '',
            subscribers: savedSubreddit.subscribers || 0,
            active_users: savedSubreddit.active_users || 0,
            rules: savedSubreddit.rules || [],
            created_utc: savedSubreddit.created_utc || 0,
            over18: savedSubreddit.over18 || false,
            allowedContentTypes: savedSubreddit.allowed_content_types || []
          });
          setIsLoading(false);
          return;
        }

        // If not in database, fetch from Reddit API
        const response = await fetch(`/api/reddit/subreddit-info?subreddit=${subredditName}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch subreddit info: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        const subredditData = data.data;
        setSubredditInfo({
          name: subredditData.name || subredditName,
          title: subredditData.title || '',
          description: subredditData.description || '',
          subscribers: subredditData.subscribers || 0,
          active_users: subredditData.active_users || 0,
          rules: subredditData.rules || [],
          created_utc: subredditData.created_utc || 0,
          over18: subredditData.over18 || false,
          allowedContentTypes: subredditData.allowed_content_types || []
        });
      } catch (err) {
        console.error('Error fetching subreddit info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subreddit information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubredditInfo();
  }, [subredditName]);

  return { subredditInfo, isLoading, error };
}; 