import React from 'react';
import { supabase } from '../lib/supabase';
import { History, TrendingUp } from 'lucide-react';
import { redditApi } from '../lib/redditApi';
import { useAuth } from '../contexts/AuthContext';

interface FrequentSearch {
  username: string;
  avatar_url: string | null;
  reddit_avatar_url: string | null;
  search_count: number;
  last_searched_at: string;
  type: 'recent' | 'frequent';
}

interface FrequentSearchesProps {
  onUsernameClick: (username: string) => void;
}

function FrequentSearches({ onUsernameClick }: FrequentSearchesProps) {
  const [searches, setSearches] = React.useState<FrequentSearch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuth();

  const fetchRedditAvatars = async (searches: FrequentSearch[]) => {
    const updatedSearches = await Promise.all(
      searches.map(async (search) => {
        try {
          const response = await fetch(`https://www.reddit.com/user/${search.username}/about.json`);
          if (!response.ok) return search;
          
          const data = await response.json();
          const avatarUrl = data?.data?.icon_img || data?.data?.snoovatar_img || null;
          
          // Remove query parameters from the URL if they exist
          const cleanAvatarUrl = avatarUrl ? avatarUrl.split('?')[0] : null;
          
          return {
            ...search,
            reddit_avatar_url: cleanAvatarUrl
          };
        } catch (err) {
          console.error(`Error fetching avatar for ${search.username}:`, err);
          return search;
        }
      })
    );
    return updatedSearches;
  };

  const fetchSearches = async () => {
    try {
      // Only fetch searches if the user is authenticated
      if (!user) {
        setSearches([]);
        setLoading(false);
        return;
      }

      // Get recent searches (last 24 hours) for the current user
      const { data: recentData, error: recentError } = await supabase
        .from('frequent_searches')
        .select('username, avatar_url, search_count, last_searched_at')
        .eq('user_id', user.id) // Filter by current user ID
        .gte('last_searched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('last_searched_at', { ascending: false })
        .limit(3);

      // Get frequent searches (more than 2 searches) for the current user
      const { data: frequentData, error: frequentError } = await supabase
        .from('frequent_searches')
        .select('username, avatar_url, search_count, last_searched_at')
        .eq('user_id', user.id) // Filter by current user ID
        .gt('search_count', 2)
        .order('search_count', { ascending: false })
        .limit(3);

      if (recentError) throw recentError;
      if (frequentError) throw frequentError;

      // Combine and deduplicate searches
      const recentSearches = (recentData || []).map(search => ({
        ...search,
        reddit_avatar_url: null,
        type: 'recent' as const
      }));

      const frequentSearches = (frequentData || [])
        .filter(frequent => !recentSearches.some(recent => recent.username === frequent.username))
        .map(search => ({
          ...search,
          reddit_avatar_url: null,
          type: 'frequent' as const
        }));

      const combinedSearches = [...recentSearches, ...frequentSearches].slice(0, 3);
      
      // Only fetch avatars if we have searches
      if (combinedSearches.length > 0) {
        // Fetch Reddit avatars
        const searchesWithAvatars = await fetchRedditAvatars(combinedSearches);
        setSearches(searchesWithAvatars);
      } else {
        setSearches([]);
      }
    } catch (err) {
      console.error('Error fetching searches:', err);
      setSearches([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchSearches();
    } else {
      setSearches([]);
      setLoading(false);
    }
  }, [user]); // Re-fetch when user changes

  const getAvatarUrl = (search: FrequentSearch) => {
    // Use Reddit avatar first
    if (search.reddit_avatar_url) return search.reddit_avatar_url;
    // Then use stored avatar
    if (search.avatar_url) return search.avatar_url;
    // Finally fallback to generated avatar
    return `https://api.dicebear.com/7.x/initials/svg?seed=${search.username}&backgroundColor=111111`;
  };

  const handleClick = (search: FrequentSearch) => {
    // Prevent any potential race conditions by using the search object directly
    onUsernameClick(search.username);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Frequent Searches</h2>
      {loading ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[180px] h-10 bg-[#1A1A1A] animate-pulse rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      ) : searches.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {searches.map((search) => (
            <button
              key={search.username}
              onClick={() => handleClick(search)}
              className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#222222] transition-colors rounded-lg p-2 group flex-shrink-0 w-[180px]"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={getAvatarUrl(search)}
                  alt={search.username}
                  className="w-6 h-6 rounded-full bg-[#222222] object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${search.username}&backgroundColor=111111`;
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1A1A1A] group-hover:bg-[#222222] flex items-center justify-center">
                  {search.type === 'recent' ? (
                    <History size={8} className="text-gray-400" />
                  ) : (
                    <TrendingUp size={8} className="text-[#C69B7B]" />
                  )}
                </div>
              </div>
              <span className="text-sm truncate flex-1">{search.username}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-2 text-gray-400 text-sm">
          No searches yet
        </div>
      )}
    </div>
  );
}

export default FrequentSearches; 