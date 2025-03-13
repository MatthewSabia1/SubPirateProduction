import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Shield, 
  Users, 
  ExternalLink, 
  AlertTriangle,
  AlertCircle,
  Activity,
  Globe,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Grid,
  List,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClickOutside } from '../hooks/useClickOutside';
import Modal from '../components/Modal';
import RedditImage from '../components/RedditImage';
import { syncRedditAccountPosts, ensureRedditPostsSchema } from '../lib/redditSync';

// Define interfaces
interface RedditAccount {
  username: string;
  avatar_url: string | null;
}

interface Subreddit {
  name: string;
}

interface RedditPost {
  id: string;
  post_id: string;
  reddit_account_id: string;
  created_at: string;
  reddit_accounts: RedditAccount;
  subreddits: Subreddit;
}

interface RedditPostDetails {
  title: string;
  url: string;
  selftext: string;
  score: number;
  num_comments: number;
  thumbnail: string | null;
  preview: { images: { source: { url: string } }[] } | null;
}

interface DayPost {
  date: Date;
  posts: RedditPost[];
}

type ViewType = 'month' | 'week' | 'day';
type SortType = 'recent' | 'top';

interface Filter {
  accounts: string[];
  subreddits: string[];
  projects: string[];
}

interface FilterOption {
  id: string;
  name: string;
  image?: string;
}

// PostItem component for compact post preview
const PostItem = React.memo(({ post }: { post: RedditPost }) => {
  const avatarSrc = post.reddit_accounts.avatar_url || 
    `https://api.dicebear.com/7.x/initials/svg?seed=${post.reddit_accounts.username}&backgroundColor=333333`;
  return (
    <div className="bg-[#1A1A1A] p-3 rounded-lg shadow-sm hover:shadow-md hover:bg-[#252525] transition-all duration-200 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <img src={avatarSrc} alt={post.reddit_accounts.username} className="w-8 h-8 rounded-full" />
        <div className="flex-1">
          <span className="text-sm font-semibold text-gray-200 truncate block">u/{post.reddit_accounts.username}</span>
          <span className="text-sm text-[#C69B7B] truncate block">r/{post.subreddits.name}</span>
        </div>
      </div>
      <div className="text-xs italic text-gray-500">{new Date(post.created_at).toLocaleTimeString()}</div>
    </div>
  );
});

// ExpandablePostItem component for detailed post view in the modal
const ExpandablePostItem = ({ post, isExpanded, onToggle, details }: { 
  post: RedditPost; 
  isExpanded: boolean; 
  onToggle: () => void; 
  details: RedditPostDetails | null 
}) => {
  const avatarSrc = post.reddit_accounts.avatar_url || 
    `https://api.dicebear.com/7.x/initials/svg?seed=${post.reddit_accounts.username}&backgroundColor=333333`;
  return (
    <div className="bg-[#1A1A1A] p-3 rounded-lg shadow-sm hover:shadow-md hover:bg-[#252525] transition-all duration-200">
      <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
        <RedditImage 
          src={avatarSrc} 
          alt={post.reddit_accounts.username} 
          className="w-8 h-8 rounded-full" 
        />
        <div className="flex-1">
          <span className="text-sm font-semibold text-gray-200 truncate block">u/{post.reddit_accounts.username}</span>
          <span className="text-sm text-[#C69B7B] truncate block">r/{post.subreddits.name}</span>
        </div>
        <div className="text-xs italic text-gray-500">{new Date(post.created_at).toLocaleTimeString()}</div>
      </div>
      {isExpanded && details && (
        <div className="mt-2 p-2 bg-[#111111] rounded-md">
          <a
            href={`https://reddit.com/r/${post.subreddits.name}/comments/${post.post_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-md font-bold text-white hover:underline"
          >
            {details.title}
          </a>
          {details.selftext ? (
            <p className="text-sm text-gray-300 mt-1">{details.selftext}</p>
          ) : (
            <a href={details.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#C69B7B] hover:underline">
              {details.url}
            </a>
          )}
          <div className="mt-2 text-xs text-gray-400">
            <span>Score: {details.score}</span> | <span>Comments: {details.num_comments}</span>
          </div>
        </div>
      )}
      {isExpanded && !details && (
        <div className="mt-2 p-2 bg-[#111111] rounded-md">
          <p className="text-sm text-gray-300">Loading post details...</p>
        </div>
      )}
    </div>
  );
};

function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<DayPost[]>([]);
  const [accounts, setAccounts] = useState<FilterOption[]>([]);
  const [subreddits, setSubreddits] = useState<FilterOption[]>([]);
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [openDropdown, setOpenDropdown] = useState<keyof Filter | null>(null);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postDetails, setPostDetails] = useState<Record<string, RedditPostDetails>>({});
  const [activeTab, setActiveTab] = useState<SortType>('recent');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const dropdownRef = useClickOutside(() => setOpenDropdown(null));
  const [filters, setFilters] = useState<Filter>(() => {
    const savedFilters = localStorage.getItem('calendarFilters');
    try {
      const parsed = savedFilters ? JSON.parse(savedFilters) : { accounts: [], subreddits: [], projects: [] };
      
      // Validate UUIDs in accounts array
      parsed.accounts = Array.isArray(parsed.accounts) 
        ? parsed.accounts.filter(isValidUUID)
        : [];
        
      return parsed;
    } catch (err) {
      return { accounts: [], subreddits: [], projects: [] };
    }
  });

  // UUID validation regex
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isValidUUID(str: string): boolean {
    return UUID_REGEX.test(str);
  }

  // Fetch data when user, date, view, or filters change
  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, currentDate, view, filters]);

  // Separate useEffect for fetching accounts, subreddits, and projects
  // These should only be fetched when the user changes
  useEffect(() => {
    if (user) {
      fetchRedditAccounts();
      fetchSubreddits();
      fetchProjects();
    }
  }, [user]);

  // Add all user's Reddit accounts to filters by default once accounts are loaded
  useEffect(() => {
    if (accounts.length > 0) {
      // To prevent an infinite loop, check if we need to update
      const allAccountIds = accounts.map(account => account.id);
      const currentAccountIds = filters.accounts;
      
      // Only update if the filters don't already contain ALL account IDs
      const accountsToAdd = allAccountIds.filter(id => !currentAccountIds.includes(id));
      
      if (accountsToAdd.length > 0) {
        console.log('Adding missing Reddit accounts to default filter:', accountsToAdd);
        setFilters(prev => ({
          ...prev,
          accounts: [...prev.accounts, ...accountsToAdd]
        }));
      }
    }
  }, [accounts]);

  // Check for any posts immediately when the component loads
  // This useEffect should run only once when user is loaded
  useEffect(() => {
    const checkInitialPosts = async () => {
      if (user) {
        try {
          // Check if database schema has all needed columns
          await ensureRedditPostsSchema();
          
          // Check if we have any posts in the database at all
          const { count, error } = await supabase
            .from('reddit_posts')
            .select('*', { count: 'exact', head: true });
            
          if (error) throw error;
          
          console.log(`Found ${count} total posts in database on initial load`);
          
          // If no posts, prompt a refresh
          if (count === 0) {
            console.log('No posts found in database, consider refreshing data');
            setError('No Reddit posts found. Click "Refresh Data" to sync your posts.');
          }
        } catch (err) {
          console.error('Error checking initial posts:', err);
          setError('Failed to initialize calendar. Please try refreshing the page.');
        }
      }
    };
    
    checkInitialPosts();
  }, [user]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('calendarFilters', JSON.stringify(filters));
  }, [filters]);

  // Fetch post details when modal opens
  useEffect(() => {
    if (modalDate) {
      const postsForDate = getPostsForDate(modalDate);
      postsForDate.forEach(post => {
        if (!postDetails[post.id] && !loadingDetails[post.id]) {
          fetchPostDetails(post);
        }
      });
    }
  }, [modalDate]);

  // Track loading state for each post to avoid duplicate fetches
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  const fetchRedditAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('id, username, avatar_url')
        .eq('user_id', user?.id)
        .order('username');

      if (error) throw error;
      setAccounts((data || []).map(account => ({
        id: account.id,
        name: account.username,
        image: account.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${account.username}&backgroundColor=111111`
      })));
    } catch (err) {
      console.error('Error fetching reddit accounts:', err);
    }
  };

  const fetchSubreddits = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_subreddits_with_icons')
        .select('subreddit_id, name, icon_img, community_icon')
        .order('name');

      if (error) throw error;
      setSubreddits((data || []).map(subreddit => ({
        id: subreddit.subreddit_id,
        name: subreddit.name,
        image: subreddit.community_icon || subreddit.icon_img || `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111`
      })));
    } catch (err) {
      console.error('Error fetching subreddits:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, image_url')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setProjects((data || []).map(project => ({
        id: project.id,
        name: project.name,
        image: project.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`
      })));
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      // Validate account IDs before querying
      const validAccountIds = filters.accounts.filter(isValidUUID);
      
      // Get start and end dates for the view
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      switch (view) {
        case 'month':
          startDate.setDate(1);
          endDate.setMonth(endDate.getMonth() + 1, 0);
          break;
        case 'week':
          startDate.setDate(currentDate.getDate() - currentDate.getDay());
          endDate.setDate(startDate.getDate() + 6);
          break;
        case 'day':
          endDate.setDate(currentDate.getDate() + 1);
          break;
      }

      // Ensure the dates are at the START and END of the day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Log date range for debugging
      console.log(`Fetching posts from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`Current view is: ${view}, Current date is: ${currentDate.toDateString()}`);

      // Build the query based on account filters
      let query = supabase
        .from('reddit_posts')
        .select(`
          id,
          post_id,
          reddit_account_id,
          subreddit_id,
          created_at,
          reddit_accounts!reddit_account_id(username, avatar_url),
          subreddits!subreddit_id(name)
        `)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      // Only apply account filter if there are valid UUIDs
      if (validAccountIds.length > 0) {
        query = query.in('reddit_account_id', validAccountIds);
      }

      if (filters.subreddits.length > 0) {
        query = query.in('subreddit_id', filters.subreddits);
      }

      if (filters.projects.length > 0) {
        // Get subreddit IDs for the selected projects
        const { data: projectSubreddits } = await supabase
          .from('project_subreddits')
          .select('subreddit_id')
          .in('project_id', filters.projects);

        const subredditIds = projectSubreddits?.map(ps => ps.subreddit_id) || [];
        query = query.in('subreddit_id', subredditIds);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Database error fetching posts:', error);
        if (error.code === '42703') {
          // Column does not exist error
          throw new Error('Database schema error: Please contact support');
        } else if (error.code === 'PGRST204') {
          // Schema cache error
          throw new Error('Database configuration error: Please try again later');
        } else {
          throw error;
        }
      }
      
      // Log the number of posts returned
      console.log(`Retrieved ${data?.length || 0} posts from database`);
      
      // If no posts are found, log it but don't set an error
      if (!data || data.length === 0) {
        console.log('No posts found for the selected filters and date range. Calendar will still be displayed.');
      } else {
        // Log detailed date information to help debug
        console.log('First post date:', new Date(data[0].created_at).toISOString());
        console.log('Last post date:', new Date(data[data.length - 1].created_at).toISOString());
        
        // Count posts by date
        const dateCount = data.reduce((acc, post) => {
          const date = new Date(post.created_at).toDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Posts by date:', dateCount);
        
        // Check if today's posts are included
        const today = new Date().toDateString();
        console.log(`Posts for today (${today}):`, dateCount[today] || 0);
        
        // Check post date range
        const postDates = data.map(post => new Date(post.created_at).getTime());
        const minDate = new Date(Math.min(...postDates));
        const maxDate = new Date(Math.max(...postDates));
        console.log(`Post date range: ${minDate.toDateString()} to ${maxDate.toDateString()}`);
      }
      
      // Group posts by date
      const postsByDate = (data || []).reduce<DayPost[]>((acc, post: any) => {
        const date = new Date(post.created_at);
        date.setHours(0, 0, 0, 0);
        
        // Properly map the API response to match our RedditPost interface
        const formattedPost: RedditPost = {
          id: post.id,
          post_id: post.post_id,
          reddit_account_id: post.reddit_account_id,
          created_at: post.created_at,
          reddit_accounts: {
            username: extractUsername(post.reddit_accounts),
            avatar_url: extractAvatarUrl(post.reddit_accounts)
          },
          subreddits: {
            name: extractSubredditName(post.subreddits)
          }
        };
        
        // Log warning if subreddit data is missing
        if (extractSubredditName(post.subreddits) === 'unknown') {
          console.warn(`Missing subreddit data for post ID: ${post.id}, Post ID: ${post.post_id}`);
          console.log('Post data:', JSON.stringify(post, null, 2));
        }
        
        const existingDay = acc.find(day => day.date.getTime() === date.getTime());
        if (existingDay) existingDay.posts.push(formattedPost);
        else acc.push({ date, posts: [formattedPost] });
        return acc;
      }, []);

      setPosts(postsByDate);
      
      // Log the number of days with posts
      console.log(`Grouped into ${postsByDate.length} days with posts`);
    } catch (err) {
      console.error('Error fetching posts:', err);
      
      // Provide a user-friendly error message
      if (err instanceof Error) {
        setError(`Failed to load posts: ${err.message}`);
      } else {
        setError('Failed to load posts. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (post: RedditPost) => {
    setLoadingDetails(prev => ({ ...prev, [post.id]: true }));
    try {
      // Handle 'unknown' subreddit case
      if (post.subreddits.name === 'unknown') {
        console.warn(`Cannot fetch details for post ${post.post_id}: Subreddit name is unknown`);
        const errorDetails: RedditPostDetails = {
          title: 'Missing subreddit information',
          url: '',
          selftext: 'Post details cannot be fetched because the subreddit information is missing.',
          score: 0,
          num_comments: 0,
          thumbnail: null,
          preview: null
        };
        setPostDetails(prev => ({ ...prev, [post.id]: errorDetails }));
        setLoadingDetails(prev => ({ ...prev, [post.id]: false }));
        return;
      }
    
      // Fetch post data with error handling
      const response = await fetch(`https://www.reddit.com/r/${post.subreddits.name}/comments/${post.post_id}.json`);
      
      // Log the URL being fetched for debugging
      console.log(`Fetching post details from: https://www.reddit.com/r/${post.subreddits.name}/comments/${post.post_id}.json`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`Post not found: Subreddit "${post.subreddits.name}" or post ID "${post.post_id}" may be incorrect or deleted`);
          
          // Create error details object with informative message
          const errorDetails: RedditPostDetails = {
            title: `Post not found (404)`,
            url: '',
            selftext: `The post could not be found on Reddit. It may have been deleted or the subreddit "${post.subreddits.name}" is incorrect.`,
            score: 0,
            num_comments: 0,
            thumbnail: null,
            preview: null
          };
          
          setPostDetails(prev => ({ ...prev, [post.id]: errorDetails }));
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data?.[0]?.data?.children?.[0]?.data) {
        throw new Error('Invalid response format from Reddit API');
      }

      const postData = data[0].data.children[0].data;
      
      // Helper function to validate image URLs - only filters out non-URL placeholder values
      const isValidImageUrl = (url?: string): boolean => {
        if (!url) return false;
        // Only filter out Reddit's special non-URL placeholder values
        if (['self', 'default'].includes(url)) return false;
        return true;
      };
      
      // Process thumbnail URL - explicitly handle NSFW thumbnails
      let thumbnailUrl = null;
      if (postData.thumbnail === 'nsfw') {
        // For NSFW posts, if we have a preview image available, use that
        if (postData.preview?.images?.[0]?.source?.url) {
          thumbnailUrl = decodeHtmlEntities(postData.preview.images[0].source.url);
        } else {
          // Otherwise, we'll let the fallback system take over
          thumbnailUrl = null;
        }
      } else if (isValidImageUrl(postData.thumbnail)) {
        thumbnailUrl = decodeHtmlEntities(postData.thumbnail);
      }
      
      // Process preview URL
      let previewUrl = null;
      if (postData.preview?.images?.[0]?.source?.url) {
        previewUrl = decodeHtmlEntities(postData.preview.images[0].source.url);
      } else if (postData.preview?.images?.[0]?.resolutions?.length > 0) {
        // Get a medium-sized resolution if available
        const resolutions = postData.preview.images[0].resolutions;
        const mediumRes = resolutions.find((r: any) => r.width >= 320 && r.width <= 640);
        if (mediumRes?.url) {
          previewUrl = decodeHtmlEntities(mediumRes.url);
        } else {
          // Otherwise use the largest resolution
          previewUrl = decodeHtmlEntities(resolutions[resolutions.length - 1].url);
        }
      }

      // Handle over_18 content specifically - ensure we're not filtering NSFW posts
      if (postData.over_18) {
        console.log('Processing NSFW post:', postData.id);
        // Make sure we're getting images even for NSFW content
        if (!thumbnailUrl && !previewUrl) {
          console.log('NSFW post has no images, checking additional sources');
          // Try to get image from media, if available
          if (postData.media?.oembed?.thumbnail_url) {
            thumbnailUrl = decodeHtmlEntities(postData.media.oembed.thumbnail_url);
          }
        }
      }
      
      // Create a safe details object with only primitive values and simple objects
      const safeDetails: RedditPostDetails = {
        title: String(postData.title || 'Untitled'),
        url: String(postData.url || ''),
        selftext: String(postData.selftext || ''),
        score: Number(postData.score || 0),
        num_comments: Number(postData.num_comments || 0),
        thumbnail: thumbnailUrl,
        preview: previewUrl ? { images: [{ source: { url: previewUrl } }] } : null
      };

      // Log the extracted image URLs for debugging
      console.log('Post thumbnail URL:', safeDetails.thumbnail);
      console.log('Post preview URL:', safeDetails.preview?.images[0]?.source?.url);
      console.log('Is NSFW:', postData.over_18);

      // Update state with the safe object
      setPostDetails(prev => ({ ...prev, [post.id]: safeDetails }));
    } catch (err) {
      console.error(`Error fetching details for post ${post.post_id}:`, err);
      // Set a safe error state
      const errorDetails: RedditPostDetails = {
        title: 'Error loading post',
        url: '',
        selftext: '',
        score: 0,
        num_comments: 0,
        thumbnail: null,
        preview: null
      };
      setPostDetails(prev => ({ ...prev, [post.id]: errorDetails }));
    } finally {
      setLoadingDetails(prev => ({ ...prev, [post.id]: false }));
    }
  };

  // Helper function to decode HTML entities in URLs
  const decodeHtmlEntities = (encodedString: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = encodedString;
    return textarea.value;
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month': newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); break;
      case 'week': newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7)); break;
      case 'day': newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Filter toggle function
  const toggleFilter = (type: keyof Filter, value: string) => {
    // Validate UUID for accounts
    if (type === 'accounts' && !isValidUUID(value)) {
      console.error('Invalid UUID provided for account filter:', value);
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value) ? prev[type].filter(v => v !== value) : [...prev[type], value]
    }));
  };

  // Get days for month view
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    const daysFromPrevMonth = firstDay.getDay();
    const prevMonth = new Date(year, month, 0);
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonth.getDate() - i));
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) days.push(new Date(year, month + 1, i));
    return days;
  };

  // Get days for week view
  const getDaysInWeek = (date: Date) => {
    const days: Date[] = [];
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());
    for (let i = 0; i < 7; i++) days.push(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
    return days;
  };

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    const dayPosts = posts.find(p => p.date.toDateString() === date.toDateString());
    let filteredPosts = dayPosts?.posts || [];
    
    // Filter by selected account if one is selected
    if (selectedAccount) {
      filteredPosts = filteredPosts.filter(post => 
        post.reddit_account_id === selectedAccount
      );
    }
    
    return filteredPosts;
  };

  // Close modal and reset expanded post
  const closeModal = () => {
    setModalDate(null);
    setSelectedAccount(null);
    setExpandedPostId(null);
  };

  // Render month view
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-px bg-[#222222] relative">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-[#111111] p-2 text-center text-sm text-gray-300 font-semibold sticky top-0 z-10">
            {day}
          </div>
        ))}
        {days.map(date => {
          const isToday = date.toDateString() === today.toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const dayPosts = getPostsForDate(date);
          const postsByAccount = dayPosts.reduce<Record<string, number>>((acc, post) => {
            const username = post.reddit_accounts.username;
            acc[username] = (acc[username] || 0) + 1;
            return acc;
          }, {});

          return (
            <div
              key={date.toISOString()}
              onClick={() => {
                // Show modal even if there are no posts, allowing for potential future features
                setModalDate(date);
              }}
              className={`bg-[#111111] p-2 min-h-[120px] cursor-pointer transition-all duration-200 hover:bg-[#1A1A1A] ${
                isCurrentMonth ? 'text-white' : 'text-gray-600'
              } ${isToday ? 'shadow-inner ring-2 ring-[#C69B7B] ring-inset' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{date.getDate()}</span>
                {dayPosts.length > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-xs bg-[#2B543A] text-white rounded-full">
                    {dayPosts.length}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {Object.entries(postsByAccount).slice(0, 2).map(([username, count]) => (
                  <div key={username} className="flex items-center justify-between bg-[#1A1A1A] p-1.5 rounded-md shadow-sm">
                    <span className="text-xs text-gray-200 truncate">u/{username}</span>
                    <span className="text-xs text-[#2B543A]">{count}</span>
                  </div>
                ))}
                {Object.keys(postsByAccount).length > 2 && (
                  <span className="text-xs text-gray-400">+{Object.keys(postsByAccount).length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const days = getDaysInWeek(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create hours array for all 24 hours regardless of posts
    const hours = Array.from({ length: 24 }).map((_, hour) => hour);

    return (
      <div className="flex flex-col">
        {/* Week Header */}
        <div className="grid grid-cols-[120px_repeat(7,1fr)] bg-[#111111] border-b border-[#222222] sticky top-0 z-20">
          <div className="p-4 text-sm text-gray-400 font-medium">Time</div>
          {days.map(date => {
            const isToday = date.toDateString() === today.toDateString();
            const dayPosts = getPostsForDate(date);
            const dayName = date.toLocaleDateString('default', { weekday: 'short' });
            const monthDay = date.toLocaleDateString('default', { month: 'short', day: 'numeric' });

            return (
              <div 
                key={date.toISOString()}
                className={`p-4 text-center ${isToday ? 'bg-[#1A1A1A] ring-2 ring-[#C69B7B] ring-inset' : ''}`}
              >
                <div className="font-medium">{dayName}</div>
                <div className="text-sm text-gray-400">{monthDay}</div>
                {dayPosts.length > 0 && (
                  <div className="mt-1 inline-flex items-center px-2 py-0.5 bg-[#2B543A] text-white text-xs rounded-full">
                    {dayPosts.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div className="relative">
          {/* Always show at least the business hours even when there are no posts */}
          {hours.filter(hour => hour >= 8 && hour <= 20).map(hour => {
            const hourPosts = days.map(date => {
              const dayPosts = getPostsForDate(date);
              return dayPosts.filter(post => new Date(post.created_at).getHours() === hour);
            });
            
            const hasPostsInHour = hourPosts.some(posts => posts.length > 0);

            return (
              <div 
                key={hour} 
                className="grid grid-cols-[120px_repeat(7,1fr)] min-h-[100px] border-b border-[#222222] hover:bg-[#0A0A0A] transition-colors group"
              >
                <div className="p-4 text-sm text-gray-400 sticky left-0 bg-[#111111] group-hover:bg-[#0A0A0A] transition-colors">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {hourPosts.map((posts, index) => (
                  <div key={index} className="p-2 relative">
                    {posts.length > 0 && (
                      <div className="space-y-2">
                        {posts.map(post => (
                          <div
                            key={post.id}
                            onClick={() => {
                              setModalDate(days[index]);
                              setExpandedPostId(post.id);
                            }}
                            className="group/post cursor-pointer"
                          >
                            <PostItem post={post} />
                            <div className="absolute inset-0 bg-black/0 group-hover/post:bg-black/5 transition-colors rounded-lg pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Current Time Indicator */}
          {(() => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const topOffset = (currentHour - 8 + currentMinute / 60) * 100; // Adjust for business hours start
            
            // Only show the indicator if we're within business hours
            if (currentHour >= 8 && currentHour <= 20) {
              return (
                <div 
                  className="absolute left-0 right-0 border-t-2 border-[#C69B7B] z-10 pointer-events-none"
                  style={{ top: `${topOffset}px` }}
                >
                  <div className="absolute -top-1 left-[120px] w-2 h-2 bg-[#C69B7B] rounded-full" />
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayPosts = getPostsForDate(currentDate);
    const postsByAccount = dayPosts.reduce<Record<string, number>>((acc, post) => {
      const username = post.reddit_accounts.username;
      acc[username] = (acc[username] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="bg-[#111111] p-4 min-h-[600px] rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
          {dayPosts.length > 0 && (
            <span className="px-3 py-1 bg-[#2B543A] text-white text-sm rounded-full">
              {dayPosts.length} posts
            </span>
          )}
        </div>

        {dayPosts.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(postsByAccount).map(([username, count]) => (
              <div key={username} className="bg-[#1A1A1A] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">u/{username}</span>
                  <span className="px-2 py-1 bg-[#2B543A] text-white text-xs rounded-full">
                    {count} posts
                  </span>
                </div>
                <div className="space-y-2">
                  {dayPosts
                    .filter(post => post.reddit_accounts.username === username)
                    .map(post => (
                      <PostItem key={post.id} post={post} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <p>No posts for this day</p>
              <p className="text-sm mt-1">Try changing your date selection or refresh data to sync recent posts</p>
              {accounts.length === 0 && (
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#C69B7B] text-sm rounded-md transition-colors"
                >
                  Connect Reddit Account
                </button>
              )}
              {accounts.length > 0 && (
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#C69B7B] text-sm rounded-md transition-colors"
                >
                  Refresh Data
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const hasPosts = posts.some(day => day.posts.length > 0);

  // Get the title based on the current view
  const getDateTitle = () => {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Simple date formatting function
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Add a function to check if sync is needed
  const isSyncNeeded = async (accountId: string): Promise<boolean> => {
    try {
      // Check when this account was last synced
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('username, last_post_sync')
        .eq('id', accountId)
        .single();
      
      if (error) throw error;
      
      // Only sync if it's been more than 15 minutes since last sync
      const lastSync = data?.last_post_sync ? new Date(data.last_post_sync) : null;
      const now = new Date();
      const minutesSinceLastSync = lastSync 
        ? (now.getTime() - lastSync.getTime()) / (60 * 1000) 
        : null;
      
      return !lastSync || minutesSinceLastSync === null || minutesSinceLastSync > 15;
    } catch (err) {
      console.error(`Error checking sync status for account ${accountId}:`, err);
      return true; // On error, assume sync is needed
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      // Refresh posts for all connected accounts
      if (accounts.length > 0) {
        console.log(`Starting refresh for ${accounts.length} accounts`);
        // Get all account IDs
        const accountIds = accounts.map(account => account.id);
        
        // Track successful and failed syncs
        let successCount = 0;
        let failCount = 0;
        
        // For each account, trigger a sync - don't skip any accounts to ensure fresh data
        for (let i = 0; i < accountIds.length; i++) {
          const accountId = accountIds[i];
          try {
            const accountName = accounts.find(a => a.id === accountId)?.name || accountId;
            console.log(`Syncing posts for account ${accountName} (${i+1}/${accountIds.length})`);
            
            // Force a sync of this account
            await syncRedditAccountPosts(accountId);
            successCount++;
            
            // Add a small delay between syncs to avoid overwhelming the API
            if (i < accountIds.length - 1) {
              console.log('Waiting briefly before syncing next account...');
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
            }
          } catch (err) {
            console.error(`Error syncing account ${accountId}:`, err);
            failCount++;
          }
        }
        
        console.log(`Sync complete. Success: ${successCount}, Failed: ${failCount}`);
      } else {
        console.log('No accounts found to sync');
        setError('No Reddit accounts connected. Please connect an account first.');
        setRefreshing(false);
        return;
      }
      
      // First update our local state
      await fetchRedditAccounts();
      await fetchSubreddits();
      await fetchProjects();
      
      // Then refresh the posts data
      console.log('Refreshing posts data in calendar view...');
      await fetchPosts();
      
      // Verify we have posts in the database
      try {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1); // Show posts from last month to now
        
        // Get a count of all posts across all accounts for the past month
        const { count, error } = await supabase
          .from('reddit_posts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString());
          
        if (error) throw error;
        
        console.log(`After refresh: found ${count} total posts in database from the last month`);
        
        if (count === 0) {
          // Still no posts after refresh - something is wrong
          setError('No posts found after refresh. Please check your Reddit accounts.');
        } else if (posts.length === 0 && currentDate.getMonth() === today.getMonth()) {
          // Posts in database but not showing even though we're viewing the current month
          console.log('Posts found in database but not showing in UI - refreshing view');
          await fetchPosts();
        }
      } catch (verifyErr) {
        console.error('Error verifying posts after refresh:', verifyErr);
      }
      
      // Show success message
      console.log('Successfully refreshed Reddit data');
    } catch (err) {
      console.error('Error during manual refresh:', err);
      setError(`Failed to refresh data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions to extract data correctly regardless of structure
  function extractUsername(accounts: any): string {
    if (!accounts) return 'unknown';
    if (Array.isArray(accounts)) {
      return accounts[0]?.username || 'unknown';
    }
    return accounts.username || 'unknown';
  }

  function extractAvatarUrl(accounts: any): string | null {
    if (!accounts) return null;
    if (Array.isArray(accounts)) {
      return accounts[0]?.avatar_url || null;
    }
    return accounts.avatar_url || null;
  }

  function extractSubredditName(subreddits: any): string {
    if (!subreddits) return 'unknown';
    if (Array.isArray(subreddits)) {
      return subreddits[0]?.name || 'unknown';
    }
    return subreddits.name || 'unknown';
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 relative">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">Posting <span className="text-[#C69B7B]">Calendar</span></h1>
        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Strategically schedule your Reddit content to maximize visibility and engagement across multiple accounts.
        </p>
      </div>

      <div className="flex justify-end items-center gap-2 mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`bg-[#1A1A1A] hover:bg-[#252525] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            refreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Manually refresh Reddit data"
        >
          <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
        <div className="flex-1 bg-[#0A0A0A] p-4 rounded-lg shadow-sm" ref={dropdownRef}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'accounts' ? null : 'accounts')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] rounded-md hover:bg-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Filter by Reddit Accounts"
                aria-expanded={openDropdown === 'accounts'}
              >
                <Users size={16} className="text-gray-400" />
                <span className="text-sm">Reddit Accounts</span>
                {filters.accounts.length > 0 && (
                  <span className="bg-[#2B543A] text-white text-xs px-2 py-0.5 rounded-full">{filters.accounts.length}</span>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {openDropdown === 'accounts' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-3 max-h-60 overflow-y-auto z-50">
                  {accounts.length > 0 ? (
                    accounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => toggleFilter('accounts', account.id)}
                        className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                          filters.accounts.includes(account.id) ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <img src={account.image} alt={account.name} className="w-6 h-6 rounded-full" />
                        <span className="text-sm truncate">{account.name}</span>
                        {filters.accounts.includes(account.id) && <Check size={16} className="ml-auto text-[#C69B7B]" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400 text-sm">No accounts found</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'subreddits' ? null : 'subreddits')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] rounded-md hover:bg-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Filter by Subreddits"
                aria-expanded={openDropdown === 'subreddits'}
              >
                <Globe size={16} className="text-gray-400" />
                <span className="text-sm">Subreddits</span>
                {filters.subreddits.length > 0 && (
                  <span className="bg-[#2B543A] text-white text-xs px-2 py-0.5 rounded-full">{filters.subreddits.length}</span>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {openDropdown === 'subreddits' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-3 max-h-60 overflow-y-auto z-50">
                  {subreddits.length > 0 ? (
                    subreddits.map(subreddit => (
                      <button
                        key={subreddit.id}
                        onClick={() => toggleFilter('subreddits', subreddit.id)}
                        className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                          filters.subreddits.includes(subreddit.id) ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <img src={subreddit.image} alt={subreddit.name} className="w-6 h-6 rounded-md" />
                        <span className="text-sm truncate">r/{subreddit.name}</span>
                        {filters.subreddits.includes(subreddit.id) && <Check size={16} className="ml-auto text-[#C69B7B]" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400 text-sm">No subreddits found</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'projects' ? null : 'projects')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] rounded-md hover:bg-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Filter by Projects"
                aria-expanded={openDropdown === 'projects'}
              >
                <FolderKanban size={16} className="text-gray-400" />
                <span className="text-sm">Projects</span>
                {filters.projects.length > 0 && (
                  <span className="bg-[#2B543A] text-white text-xs px-2 py-0.5 rounded-full">{filters.projects.length}</span>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {openDropdown === 'projects' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-3 max-h-60 overflow-y-auto z-50">
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => toggleFilter('projects', project.id)}
                        className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                          filters.projects.includes(project.id) ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <img src={project.image} alt={project.name} className="w-6 h-6 rounded-lg" />
                        <span className="text-sm truncate">{project.name}</span>
                        {filters.projects.includes(project.id) && <Check size={16} className="ml-auto text-[#C69B7B]" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400 text-sm">No projects found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && 
       error !== 'No Reddit posts found. Click "Refresh Data" to sync your posts.' && 
       error !== 'No posts found after refresh. Please check your Reddit accounts.' && 
       error !== 'No posts found for the selected filters and date range.' && (
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-[#111111] rounded-lg shadow-lg border border-[#222222] overflow-hidden">
        <div className="p-4 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">{getDateTitle()}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 bg-[#1A1A1A] border border-[#333333] hover:bg-[#252525] rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Previous"
              >
                <ChevronLeft size={20} className="text-gray-300" />
              </button>
              <button
                onClick={goToToday}
                className="px-6 py-2 bg-[#1A1A1A] border border-[#333333] hover:bg-[#252525] rounded-md text-base text-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Go to today"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 bg-[#1A1A1A] border border-[#333333] hover:bg-[#252525] rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Next"
              >
                <ChevronRight size={20} className="text-gray-300" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-md">
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] ${
                view === 'month' ? 'bg-[#C69B7B] text-white' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525]'
              }`}
              aria-label="Month view"
              aria-pressed={view === 'month'}
            >
              <Grid size={16} />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] ${
                view === 'week' ? 'bg-[#C69B7B] text-white' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525]'
              }`}
              aria-label="Week view"
              aria-pressed={view === 'week'}
            >
              <CalendarIcon size={16} />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              onClick={() => setView('day')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] ${
                view === 'day' ? 'bg-[#C69B7B] text-white' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525]'
              }`}
              aria-label="Day view"
              aria-pressed={view === 'day'}
            >
              <List size={16} />
              <span className="hidden sm:inline">Day</span>
            </button>
          </div>
        </div>
        <div className="p-2 min-h-[600px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#C69B7B]"></div>
            </div>
          ) : (
            <>
              {view === 'month' && renderMonthView()}
              {view === 'week' && renderWeekView()}
              {view === 'day' && renderDayView()}
            </>
          )}
        </div>
      </div>

      {/* Modal for displaying all posts with details */}
      {modalDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div
            className="bg-[#111111] rounded-lg shadow-lg border border-[#222222] max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#222222] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Posts for {modalDate.toLocaleDateString()}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                  <span>{getPostsForDate(modalDate).length} posts on this day</span>
                  {selectedAccount && (
                    <>
                      <span>•</span>
                      <span>Filtered by u/{accounts.find(a => a.id === selectedAccount)?.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-[#1A1A1A] rounded-full transition-all duration-200 ml-4"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-gray-300" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-[#222222]">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                    activeTab === 'recent'
                      ? 'bg-[#C69B7B] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Most Recent
                </button>
                <button
                  onClick={() => setActiveTab('top')}
                  className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                    activeTab === 'top'
                      ? 'bg-[#C69B7B] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Top Posts
                </button>
              </div>
              <div className="relative">
                <select
                  value={selectedAccount || ''}
                  onChange={(e) => setSelectedAccount(e.target.value || null)}
                  className="bg-[#1A1A1A] border-none rounded-md px-4 h-9 text-sm focus:ring-1 focus:ring-[#333333] min-w-[200px]"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      u/{account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {getPostsForDate(modalDate).length > 0 ? (
              <div className="divide-y divide-[#222222] overflow-y-auto max-h-[calc(80vh-140px)]">
                {getPostsForDate(modalDate)
                  .sort((a, b) => {
                    if (activeTab === 'top') {
                      const scoreA = postDetails[a.id]?.score || 0;
                      const scoreB = postDetails[b.id]?.score || 0;
                      return scoreB - scoreA;
                    }
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  })
                  .map((post) => (
                    <div key={post.id} className="p-4 hover:bg-[#111111] transition-colors">
                      {postDetails[post.id] ? (
                        <div className="flex items-start gap-4">
                          {/* Post Image - Try preview image first, then thumbnail, then fallback to generated image */}
                          <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-[#111111]">
                            <RedditImage 
                              src={postDetails[post.id].preview?.images[0]?.source?.url || postDetails[post.id].thumbnail || ''}
                              alt={postDetails[post.id].title || ""}
                              className="w-full h-full object-cover"
                              fallbackSrc={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(postDetails[post.id].title || post.post_id)}&backgroundColor=111111&radius=12`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-gray-400">
                                u/{post.reddit_accounts.username}
                              </span>
                              <span className="text-gray-600">•</span>
                              <span className="text-sm text-[#C69B7B]">
                                r/{post.subreddits.name}
                              </span>
                            </div>
                            <a
                              href={postDetails[post.id].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[15px] font-medium hover:text-[#C69B7B] transition-colors line-clamp-2 mb-2"
                            >
                              {postDetails[post.id].title}
                            </a>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Users size={14} />
                                <span>{postDetails[post.id].score} points</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle size={14} />
                                <span>{postDetails[post.id].num_comments} comments</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Activity size={14} />
                                <span>{formatDate(new Date(post.created_at).getTime() / 1000)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-400">Loading post details...</div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <AlertCircle size={32} className="mb-3" />
                <p className="text-lg">No posts found for this date</p>
                <p className="text-sm mt-1 mb-5">Try selecting a different date or refreshing your data</p>
                
                <div className="flex gap-3">
                  {accounts.length > 0 ? (
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className={`px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#C69B7B] text-sm rounded-md transition-colors flex items-center gap-2 ${
                        refreshing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
                      {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                  ) : (
                    <button 
                      onClick={closeModal}
                      className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-[#C69B7B] text-sm rounded-md transition-colors"
                    >
                      Connect Reddit Account
                    </button>
                  )}
                  
                  <button 
                    onClick={closeModal}
                    className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white text-sm rounded-md transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;