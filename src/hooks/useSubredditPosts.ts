import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubredditPost {
  id: string;
  title: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  selftext?: string;
  is_self: boolean;
  post_hint?: string;
  content_categories?: string[];
  upvote_ratio: number;
}

export const useSubredditPosts = (subredditName: string, limit: number = 50) => {
  const [posts, setPosts] = useState<SubredditPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!subredditName) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First check if we have posts in our database
        const { data: savedPosts, error: dbError } = await supabase
          .from('subreddit_posts')
          .select('*')
          .eq('subreddit', subredditName.toLowerCase())
          .order('created_utc', { ascending: false })
          .limit(limit);

        if (savedPosts && savedPosts.length > 0 && !dbError) {
          setPosts(savedPosts.map(post => ({
            id: post.id,
            title: post.title || '',
            author: post.author || '',
            created_utc: post.created_utc || 0,
            score: post.score || 0,
            num_comments: post.num_comments || 0,
            url: post.url || '',
            selftext: post.selftext || '',
            is_self: post.is_self || false,
            post_hint: post.post_hint,
            content_categories: post.content_categories,
            upvote_ratio: post.upvote_ratio || 0
          })));
          setIsLoading(false);
          return;
        }

        // If not in database, fetch from Reddit API
        const response = await fetch(`/api/reddit/subreddit-posts?subreddit=${subredditName}&limit=${limit}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setPosts(data.data);
      } catch (err) {
        console.error('Error fetching subreddit posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subreddit posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [subredditName, limit]);

  return { posts, isLoading, error };
}; 