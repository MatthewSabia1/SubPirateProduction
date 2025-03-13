import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, AlertTriangle, Trash2, MessageCircle, Star, Activity, ExternalLink, Upload, X, ChevronDown, ChevronUp, Calendar, Shield, BadgeCheck, ArrowLeftRight, EyeOff, ImageOff, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { redditApi, SubredditPost } from '../lib/redditApi';
import { syncRedditAccountPosts } from '../lib/redditSync';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import RedditImage from '../components/RedditImage';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';

interface RedditAccount {
  id: string;
  username: string;
  karma_score?: number;
  link_karma?: number;
  comment_karma?: number;
  awardee_karma?: number;
  awarder_karma?: number;
  total_karma?: number;
  total_posts?: number;
  posts_today: number;
  avatar_url?: string;
  is_gold?: boolean;
  is_mod?: boolean;
  verified?: boolean;
  has_verified_email?: boolean;
  created_utc?: string;
  last_post_check: string;
  last_karma_check: string;
  refreshing?: boolean;
  posts?: {
    recent: SubredditPost[];
    top: SubredditPost[];
  };
}

function RedditAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<RedditAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'top'>('recent');
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Add checkUsageLimit at the component level
  const { checkUsageLimit } = useFeatureAccess();

  // Refresh single account data
  const refreshAccountData = useCallback(async (account: RedditAccount) => {
    try {
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? { ...a, refreshing: true } : a
      ));

      // First sync all posts for this account
      await syncRedditAccountPosts(account.id);

      // Then fetch posts directly using Reddit API for display
      const posts = await redditApi.getUserPosts(account.username);
      
      // Get posts count from our database for the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: postsData, error: postsError } = await supabase
        .from('reddit_posts')
        .select('id, title, url, selftext, score, num_comments, created_at')
        .eq('reddit_account_id', account.id)
        .gte('created_at', oneDayAgo.toISOString());

      if (postsError) throw postsError;
      
      const postsToday = postsData?.length || 0;
      const postKarma = posts.length > 0 ? posts[0].post_karma || 0 : 0;

      // Update account stats in database
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({
          karma_score: postKarma,
          total_posts: posts.length,
          posts_today: postsToday,
          last_karma_check: new Date().toISOString(),
          last_post_check: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) throw updateError;

      // Update the account in state with fresh data
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? {
          ...a,
          karma_score: postKarma,
          total_posts: posts.length,
          posts_today: postsToday,
          last_karma_check: new Date().toISOString(),
          last_post_check: new Date().toISOString(),
          refreshing: false,
          posts: {
            recent: posts.filter(p => new Date(p.created_utc * 1000) >= oneDayAgo),
            top: posts.sort((a, b) => b.score - a.score).slice(0, 10)
          }
        } : a
      ));
    } catch (err) {
      console.error(`Error refreshing data for ${account.username}:`, err);
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? { ...a, refreshing: false } : a
      ));
    }
  }, [setAccounts, setError]);

  // Memoize getRedditProfilePic with useCallback
  const getRedditProfilePic = useCallback(async (username: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data?.data?.icon_img?.split('?')[0] || null;
    } catch (error) {
      console.error("Error fetching Reddit profile picture:", error);
      return null;
    }
  }, []);

  // Memoize fetchAccounts with useCallback
  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional data for each account
      const accountsWithData = await Promise.all(
        (data || []).map(async (account) => {
          try {
            // Check if we need to update karma and posts (every hour)
            const lastCheck = new Date(account.last_karma_check || 0);
            const hoursSinceLastCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastCheck >= 1) {
              const posts = await redditApi.getUserPosts(account.username);
              const postsToday = posts.filter(post => {
                const postDate = new Date(post.created_utc * 1000);
                const today = new Date();
                return postDate.toDateString() === today.toDateString();
              }).length;

              // Get post karma from user data
              const postKarma = posts.length > 0 ? posts[0].post_karma || 0 : 0;

              // Update account stats in database
              const { error: updateError } = await supabase
                .from('reddit_accounts')
                .update({
                  karma_score: postKarma,
                  total_posts: posts.length,
                  posts_today: postsToday,
                  last_karma_check: new Date().toISOString()
                })
                .eq('id', account.id);

              if (updateError) throw updateError;

              return {
                ...account,
                karma_score: postKarma,
                total_posts: posts.length,
                posts_today: postsToday,
                last_karma_check: new Date().toISOString()
              };
            }
            return account;
          } catch (err) {
            console.error(`Error updating stats for ${account.username}:`, err);
            return account;
          }
        })
      );

      setAccounts(accountsWithData);
    } catch (err) {
      console.error('Error fetching Reddit accounts:', err);
      setError('Failed to load Reddit accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  
  // Update dependencies for this useEffect
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach(account => {
        syncRedditAccountPosts(account.id).then(() => {
          refreshAccountData(account);
        });
      });
    }
  }, [accounts, refreshAccountData]);

  // Memoize the handleAddAccount function
  const handleAddAccount = useCallback(async () => {
    if (connecting) return;

    setConnecting(true);
    setAddError(null);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get the current count of Reddit accounts
      const { count, error: countError } = await supabase
        .from('reddit_accounts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);
        
      if (countError) {
        throw new Error('Failed to check account count: ' + countError.message);
      }
      
      // Use the checkUsageLimit from the component scope
      if (!checkUsageLimit('reddit_accounts', count || 0)) {
        setAddError('You have reached your Reddit account limit for your current plan. Please upgrade to connect more accounts.');
        setConnecting(false);
        return;
      }

      // Generate a random state string for security
      const state = Math.random().toString(36).substring(7);
      
      // Store state in session storage to verify on callback
      sessionStorage.setItem('reddit_oauth_state', state);

      // Construct the OAuth URL with expanded scopes
      const params = new URLSearchParams({
        client_id: import.meta.env.VITE_REDDIT_APP_ID,
        response_type: 'code',
        state,
        redirect_uri: `${window.location.origin}/auth/reddit/callback`,
        duration: 'permanent',
        scope: [
          'identity',
          'read',
          'submit',
          'subscribe',
          'history',
          'mysubreddits',
          'privatemessages',
          'save',
          'vote',
          'edit',
          'flair',
          'report'
        ].join(' ')
      });

      // Redirect to Reddit's OAuth page
      window.location.href = `https://www.reddit.com/api/v1/authorize?${params}`;
    } catch (err) {
      console.error('Error initiating Reddit OAuth:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to connect Reddit account');
      setConnecting(false);
    }
  }, [user, connecting, setConnecting, setAddError, checkUsageLimit]);

  // Memoize handleDeleteAccount
  const handleDeleteAccount = useCallback(async () => {
    if (!deleteAccount) return;

    try {
      // Delete avatar if exists and is a valid URL
      if (deleteAccount.avatar_url && typeof deleteAccount.avatar_url === 'string') {
        const avatarPath = deleteAccount.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('user_images')
          .remove([avatarPath]);
      }

      // Delete account
      const { error } = await supabase
        .from('reddit_accounts')
        .delete()
        .eq('id', deleteAccount.id);

      if (error) throw error;
      setAccounts(prev => prev.filter(a => a.id !== deleteAccount.id));
      setDeleteAccount(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete Reddit account');
    }
  }, [deleteAccount, setAccounts, setDeleteAccount, setError]);

  // Memoize handleAvatarUpload
  const handleAvatarUpload = useCallback(async (accountId: string, file: File) => {
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    setUploadingAvatar(accountId);

    try {
      // Set up unique path for avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `reddit_avatars/${user.id}/${accountId}.${fileExt}`;

      // First remove any existing avatar
      try {
        const { data: existingFiles } = await supabase.storage
          .from('user_images')
          .list(`reddit_avatars/${user.id}`);

        const existingAvatar = existingFiles?.find(f => f.name.startsWith(accountId));
        
        if (existingAvatar) {
          await supabase.storage
            .from('user_images')
            .remove([`reddit_avatars/${user.id}/${existingAvatar.name}`]);
        }
      } catch (err) {
        console.log('No existing avatar to delete or error deleting:', err);
      }

      // Upload the new avatar
      const { error: uploadError } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicURL } = supabase.storage
        .from('user_images')
        .getPublicUrl(filePath);

      // Update account with new avatar URL
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({ avatar_url: publicURL.publicUrl })
        .eq('id', accountId);

      if (updateError) throw updateError;

      // Update local state
      setAccounts(prev => 
        prev.map(a => 
          a.id === accountId 
            ? { ...a, avatar_url: publicURL.publicUrl } 
            : a
        )
      );
      
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(null);
    }
  }, [user, setAccounts, setError]);

  // Memoize handleDeleteAvatar
  const handleDeleteAvatar = useCallback(async (accountId: string) => {
    try {
      // Find the account
      const account = accounts.find(a => a.id === accountId);
      if (!account || !account.avatar_url || !user) return;

      // Get the file path from the URL
      const avatarPath = account.avatar_url.split('/').slice(-2).join('/');
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('user_images')
        .remove([avatarPath]);

      if (deleteError) throw deleteError;

      // Update database
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({ avatar_url: undefined })
        .eq('id', accountId);

      if (updateError) throw updateError;

      // Update local state
      setAccounts(prev => 
        prev.map(a => 
          a.id === accountId 
            ? { ...a, avatar_url: undefined } 
            : a
        )
      );
      
      setUploadingAvatar(null);
    } catch (err) {
      console.error('Error deleting avatar:', err);
      setError('Failed to delete avatar');
      setUploadingAvatar(null);
    }
  }, [accounts, user, setAccounts, setError, setUploadingAvatar]);

  // Memoize loadAccountPosts
  const loadAccountPosts = useCallback(async (account: RedditAccount) => {
    if (account.posts) return;
    
    setLoadingPosts(true);
    try {
      const [recentPosts, topPosts] = await Promise.all([
        redditApi.getUserPosts(account.username, 'new'),
        redditApi.getUserPosts(account.username, 'top')
      ]);

      setAccounts(prev => prev.map(a => 
        a.id === account.id ? {
          ...a,
          posts: {
            recent: recentPosts,
            top: topPosts
          }
        } : a
      ));
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [setAccounts, setLoadingPosts, activeTab, setError]);

  // Memoize toggleAccountExpansion
  const toggleAccountExpansion = useCallback(async (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      setActiveTab('recent');
      return;
    }

    setExpandedAccount(accountId);
    setActiveTab('recent');
    const account = accounts.find(a => a.id === accountId);
    if (account && !account.posts) {
      await loadAccountPosts(account);
    }
  }, [expandedAccount, setExpandedAccount, accounts, loadAccountPosts]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const getAccountAvatar = (username: string) => {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=111111`;
  };

  // Helper function to get avatar URL
  function getAvatarSrc(account: RedditAccount): string {
    return account.avatar_url || getAccountAvatar(account.username);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading Reddit accounts...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="flex flex-col mb-8">
          <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">Reddit <span className="text-[#C69B7B]">Accounts</span></h1>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            Build a resilient network of Reddit accounts to distribute your content strategically and maximize traffic.
          </p>
        </div>

        <div className="flex justify-end mb-8">
          <button
            onClick={handleAddAccount}
            disabled={connecting}
            className={`bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 px-4 rounded flex items-center space-x-2 transition-colors ${
              connecting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Users size={20} />
                <span>Connect Reddit Account</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {addError && (
          <div className="bg-red-900/50 text-red-100 p-4 rounded mb-6">
            {addError}
          </div>
        )}

        {/* Accounts List */}
        <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_120px_80px] gap-4 p-4 border-b border-[#222222] text-sm text-gray-400">
            <div className="pl-2">Account</div>
            <div></div>
            <div className="text-center">Karma</div>
            <div className="text-center">Total Posts</div>
            <div className="text-center">Posts Today</div>
            <div className="text-right pr-2">Actions</div>
          </div>

          <div className="divide-y divide-[#222222]">
            {accounts.map((account) => (
              <div 
                key={account.id}
                className="md:grid md:grid-cols-[auto_1fr_120px_120px_120px_80px] gap-4 p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="relative group">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden">
                    <RedditImage 
                      src={getAvatarSrc(account)}
                      alt={`u/${account.username}`}
                      className="w-full h-full object-cover"
                      fallbackSrc={getAccountAvatar(account.username)}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(account.id, file);
                          }}
                          disabled={uploadingAvatar === account.id}
                        />
                        <Upload 
                          size={16} 
                          className="text-white hover:text-[#C69B7B] transition-colors"
                        />
                      </label>
                      {account.avatar_url && (
                        <button
                          onClick={() => handleDeleteAvatar(account.id)}
                          className="text-white hover:text-red-400 transition-colors"
                          disabled={uploadingAvatar === account.id}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {uploadingAvatar === account.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin text-lg">⚬</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <a 
                    href={`https://reddit.com/user/${account.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2 mb-1"
                  >
                    u/{account.username}
                    {account.is_gold && (
                      <span className="text-amber-400" title="Reddit Premium">
                        <Star size={14} />
                      </span>
                    )}
                    {account.is_mod && (
                      <span className="text-green-400" title="Moderator">
                        <Shield size={14} />
                      </span>
                    )}
                    {account.verified && (
                      <span className="text-blue-400" title="Verified">
                        <BadgeCheck size={14} />
                      </span>
                    )}
                    <ExternalLink size={14} className="text-gray-400" />
                  </a>
                  <div className="flex items-center gap-4 md:hidden mt-2">
                    <div className="flex items-center gap-1 text-amber-400" title="Total Karma">
                      <Star size={14} />
                      <span className="text-sm">{account.total_karma || account.karma_score || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400" title="Total Posts">
                      <MessageCircle size={14} />
                      <span className="text-sm">{account.total_posts || '—'}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${(account.posts_today ?? 0) > 0 ? 'text-emerald-400' : 'text-gray-400'}`} title="Posts Today">
                      <Activity size={14} />
                      <span className="text-sm">{account.posts_today ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center gap-1 text-amber-400" title={`Link: ${account.link_karma || 0}\nComment: ${account.comment_karma || 0}\nAwardee: ${account.awardee_karma || 0}\nAwarder: ${account.awarder_karma || 0}`}>
                  <Star size={16} />
                  <span>{account.total_karma || account.karma_score || '—'}</span>
                </div>

                <div className="hidden md:flex items-center justify-center gap-1 text-gray-400">
                  <MessageCircle size={16} />
                  <span>{account.total_posts || '—'}</span>
                </div>

                <div className={`hidden md:flex items-center justify-center gap-1 ${(account.posts_today ?? 0) > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  <Activity size={16} />
                  <span>{account.posts_today ?? 0}</span>
                </div>

                <div className="absolute md:static top-4 right-4">
                  <button
                    onClick={() => toggleAccountExpansion(account.id)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title={expandedAccount === account.id ? "Hide Posts" : "Show Posts"}
                  >
                    {expandedAccount === account.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteAccount(account)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title="Remove Account"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Expanded Posts Section */}
                {expandedAccount === account.id && (
                  <div className="col-span-6 border-t border-[#222222] bg-[#0f0f0f] mt-4 -mx-4 px-4">
                    {/* Tabs */}
                    <div className="flex gap-4 py-4">
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
                      <button
                        onClick={() => refreshAccountData(account)}
                        disabled={account.refreshing}
                        className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 transition-colors
                          ${account.refreshing 
                            ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                            : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                          }`}
                      >
                        <RefreshCcw size={14} className={account.refreshing ? 'animate-spin' : ''} />
                        {account.refreshing ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>

                    {/* Posts List */}
                    {loadingPosts ? (
                      <div className="py-8 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C69B7B] mx-auto mb-4"></div>
                        <p>Loading posts...</p>
                      </div>
                    ) : account.posts ? (
                      account.posts[activeTab].length > 0 ? (
                        <div className="divide-y divide-[#222222]">
                          {account.posts[activeTab].map((post) => (
                            <div key={post.id} className="py-4 hover:bg-[#111111] transition-colors">
                              <div className="flex items-start gap-4">
                                {(post.preview_url || post.thumbnail) ? (
                                  <RedditImage 
                                    src={post.preview_url || post.thumbnail || getAvatarSrc(account)}
                                    alt=""
                                    className="w-20 h-20 rounded-md object-cover bg-[#111111]"
                                    fallbackSrc={getAvatarSrc(account)}
                                  />
                                ) : (
                                  <div className="w-20 h-20 rounded-md bg-[#111111] flex items-center justify-center">
                                    <RedditImage 
                                      src={getAvatarSrc(account)}
                                      alt=""
                                      className="w-12 h-12"
                                      fallbackSrc={getAccountAvatar(account.username)}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={`https://reddit.com${post.url.startsWith('/r/') ? '' : '/r/' + post.subreddit}/comments/${post.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[15px] font-medium hover:text-[#C69B7B] transition-colors line-clamp-2 mb-2"
                                  >
                                    {post.title}
                                  </a>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <Users size={14} />
                                      <span>{post.score} points</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageCircle size={14} />
                                      <span>{post.num_comments} comments</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      <span>{formatDate(post.created_utc)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-400">
                          <p>No {activeTab === 'recent' ? 'recent' : 'top'} posts found</p>
                          <p className="text-sm mt-2">Try refreshing the data or checking another tab</p>
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-gray-400">
                        <AlertTriangle size={24} className="mx-auto mb-4" />
                        <p>Failed to load posts</p>
                        <button 
                          onClick={() => refreshAccountData(account)}
                          className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] rounded text-sm"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No Reddit accounts connected yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-1">Remove Reddit Account</h2>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to remove u/{deleteAccount?.username}? This action cannot be undone.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={handleDeleteAccount}
              className="primary flex-1 text-sm md:text-base"
            >
              Remove Account
            </button>
            <button 
              onClick={() => setDeleteAccount(null)}
              className="secondary text-sm md:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default RedditAccounts;