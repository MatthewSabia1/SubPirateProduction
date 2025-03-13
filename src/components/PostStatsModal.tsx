import React, { useState, useEffect } from 'react';
import { Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PostStatsModalProps {
  subredditId: string;
  children: React.ReactNode;
  className?: string;
  fetchPostCounts?: () => Promise<void>;
}

interface AccountPostCount {
  username: string;
  post_count: number;
}

function PostStatsModal({ subredditId, children, className = '', fetchPostCounts }: PostStatsModalProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [accountPosts, setAccountPosts] = useState<AccountPostCount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isHovered && !accountPosts.length) {
      fetchAccountPosts();
    }
  }, [isHovered, subredditId]);

  const fetchAccountPosts = async () => {
    setLoading(true);
    try {
      // Get posts with account info using proper join
      const { data, error } = await supabase
        .from('reddit_posts')
        .select(`
          reddit_account_id,
          reddit_accounts!inner (
            id,
            username
          ),
          created_at
        `)
        .eq('subreddit_id', subredditId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Count posts by account
      const postsByAccount = (data || []).reduce<Record<string, number>>((acc, post) => {
        const username = post.reddit_accounts.username;
        acc[username] = (acc[username] || 0) + 1;
        return acc;
      }, {});

      // Convert to array and sort by post count
      const counts = Object.entries(postsByAccount).map(([username, count]) => ({
        username,
        post_count: count
      })).sort((a, b) => b.post_count - a.post_count);

      setAccountPosts(counts);
    } catch (err) {
      console.error('Error fetching account posts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#1A1A1A] rounded-lg shadow-xl border border-[#333333] p-3 text-sm z-50">
          <div className="text-gray-400 mb-3">
            Posts in the last 24 hours
          </div>
          
          {loading ? (
            <div className="text-center text-gray-500 py-2">
              Loading...
            </div>
          ) : accountPosts.filter(a => a.post_count > 0).length > 0 ? (
            <div className="space-y-2">
              {accountPosts.filter(a => a.post_count > 0).map((account, index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <User size={14} className="text-gray-500" />
                    <span>u/{account.username}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Calendar size={14} />
                    <span>{account.post_count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-2">
              No posts in the last 24 hours
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PostStatsModal;