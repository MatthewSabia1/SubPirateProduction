import React, { useState, useEffect } from 'react';
import { AlertCircle, User, CreditCard, Calendar, Star, Clock, Link, Search, Bookmark, Folder, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserDetailsProps {
  userId: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  role: string | null;
}

interface UserSubscription {
  id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  current_period_start: string;
  current_period_end: string;
  tier: string;
  price_amount: number;
  currency: string;
  status: string;
}

interface SavedSubreddit {
  id: string;
  name: string;
  icon_img: string | null;
  community_icon: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface RedditAccount {
  id: string;
  username: string;
  created_at: string;
  last_used_at: string;
}

interface FrequentSearch {
  id: string;
  username: string;
  search_count: number;
  last_searched_at: string;
}

interface UsageStats {
  id: string;
  user_id: string;
  subreddit_analysis_count: number;
  spyglass_searches_count: number; 
  calendar_posts_count: number;
  created_subreddits_count: number;
  created_projects_count: number;
  saved_subreddits_count: number;
  last_active: string;
  created_at: string;
  updated_at: string;
  month_start: string;
  month_end: string;
}

function UserDetails({ userId }: UserDetailsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [savedSubreddits, setSavedSubreddits] = useState<SavedSubreddit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [redditAccounts, setRedditAccounts] = useState<RedditAccount[]>([]);
  const [frequentSearches, setFrequentSearches] = useState<FrequentSearch[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profileError) throw profileError;
        setProfile(profileData);
        
        // Fetch subscription data - using separate queries instead of joins
        const { data: subscriptionData, error: subError } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (subError) throw subError;
        
        if (subscriptionData) {
          // Fetch price data separately
          const { data: priceData, error: priceError } = await supabase
            .from('stripe_prices')
            .select('*')
            .eq('id', subscriptionData.stripe_price_id)
            .maybeSingle();
            
          if (priceError) throw priceError;
          
          // Fetch product data separately if we have a product ID
          let productData = null;
          if (priceData?.stripe_product_id) {
            const { data: product, error: productError } = await supabase
              .from('stripe_products')
              .select('*')
              .eq('stripe_product_id', priceData.stripe_product_id)
              .maybeSingle();
              
            if (productError) throw productError;
            productData = product;
          }
          
          // Get tier from product metadata if available
          const tier = productData?.metadata?.tier || 
                      (productData?.name ? productData.name : 'Unknown');
                      
          setSubscription({
            id: subscriptionData.id,
            stripe_subscription_id: subscriptionData.stripe_subscription_id,
            stripe_price_id: subscriptionData.stripe_price_id,
            current_period_start: subscriptionData.current_period_start,
            current_period_end: subscriptionData.current_period_end,
            tier: tier,
            price_amount: priceData?.unit_amount || 0,
            currency: priceData?.currency || 'usd',
            status: subscriptionData.status
          });
        }
        
        // Fetch saved subreddits
        const { data: subredditsData, error: subredditsError } = await supabase
          .from('saved_subreddits_with_icons')
          .select('id, name, icon_img, community_icon, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (subredditsError) throw subredditsError;
        setSavedSubreddits(subredditsData || []);
        
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        
        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
        
        // Fetch Reddit accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('reddit_accounts')
          .select('id, username, created_at, last_used_at')
          .eq('user_id', userId)
          .order('last_used_at', { ascending: false });
        
        if (accountsError) throw accountsError;
        setRedditAccounts(accountsData || []);
        
        // Fetch frequent searches
        const { data: searchesData, error: searchesError } = await supabase
          .from('frequent_searches')
          .select('id, username, search_count, last_searched_at')
          .order('search_count', { ascending: false })
          .limit(10);
        
        if (searchesError) throw searchesError;
        setFrequentSearches(searchesData || []);
        
        // Fetch usage stats
        const { data: statsData, error: statsError } = await supabase
          .from('user_usage_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (statsError) throw statsError;
        setUsageStats(statsData);
        
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId]);
  
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4B675] border-t-transparent"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-900/20 text-red-400 p-4 rounded-lg flex items-center">
        <AlertCircle size={20} className="mr-2 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="bg-yellow-900/20 text-yellow-400 p-4 rounded-lg flex items-center">
        <AlertTriangle size={20} className="mr-2 flex-shrink-0" />
        <span>User not found</span>
      </div>
    );
  }
  
  // Format currency for display
  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    });
    
    return formatter.format(amount / 100); // Convert cents to dollars
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      {/* User Profile Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <User className="mr-2 text-[#D4B675]" size={20} />
          User Profile
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-[#222222] flex-shrink-0">
            {profile.image_url ? (
              <img 
                src={profile.image_url} 
                alt={profile.display_name || ''} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl">
                {(profile.display_name || profile.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">Display Name</div>
                <div className="font-medium text-lg">{profile.display_name || 'Not set'}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm mb-1">Email</div>
                <div>{profile.email || 'Not set'}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm mb-1">User ID</div>
                <div className="font-mono text-sm text-gray-300 overflow-hidden text-ellipsis">{profile.id}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm mb-1">User Role</div>
                <div>
                  {profile.role === 'admin' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-900/30 text-red-400">
                      Admin User
                    </span>
                  ) : profile.role === 'gift' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400">
                      Gift User
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-400">
                      Regular User
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm mb-1">Joined</div>
                <div>{formatDate(profile.created_at)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm mb-1">Last Updated</div>
                <div>{formatDate(profile.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subscription Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <CreditCard className="mr-2 text-[#D4B675]" size={20} />
          Subscription
        </h2>
        
        {subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Plan</div>
              <div className="font-medium">
                <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-[#D4B675]/30 text-[#D4B675]">
                  {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Status</div>
              <div>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  subscription.status === 'active' ? 'bg-green-900/30 text-green-400' :
                  subscription.status === 'canceled' ? 'bg-red-900/30 text-red-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Price</div>
              <div>{formatCurrency(subscription.price_amount, subscription.currency)}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Start Date</div>
              <div>{formatDate(subscription.current_period_start)}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">End Date</div>
              <div>{formatDate(subscription.current_period_end)}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Subscription ID</div>
              <div className="font-mono text-xs text-gray-300 truncate">{subscription.stripe_subscription_id}</div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-lg p-4 text-gray-400 flex items-center">
            <Calendar className="mr-2 text-gray-500" size={18} />
            This user has no active subscription
          </div>
        )}
      </div>
      
      {/* Usage Stats Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Activity className="mr-2 text-[#D4B675]" size={20} />
          Usage Statistics
        </h2>
        
        {usageStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Subreddit Analyses</div>
              <div className="text-2xl font-semibold">{usageStats.subreddit_analysis_count.toLocaleString()}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Searches Count</div>
              <div className="text-2xl font-semibold">{usageStats.spyglass_searches_count.toLocaleString()}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Last Active</div>
              <div>{formatDate(usageStats.last_active)}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Created At</div>
              <div>{formatDate(usageStats.created_at)}</div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-lg p-4 text-gray-400 flex items-center">
            <Activity className="mr-2 text-gray-500" size={18} />
            No usage statistics available
          </div>
        )}
      </div>
      
      {/* Reddit Accounts Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Link className="mr-2 text-[#D4B675]" size={20} />
          Connected Reddit Accounts
        </h2>
        
        {redditAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="pb-2 text-left text-sm font-medium text-gray-400">Username</th>
                  <th className="pb-2 text-left text-sm font-medium text-gray-400">Added</th>
                  <th className="pb-2 text-left text-sm font-medium text-gray-400">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {redditAccounts.map(account => (
                  <tr key={account.id} className="border-b border-[#222222]">
                    <td className="py-3 font-medium">{account.username}</td>
                    <td className="py-3 text-gray-400">{formatDate(account.created_at)}</td>
                    <td className="py-3 text-gray-400">{formatDate(account.last_used_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-lg p-4 text-gray-400 flex items-center">
            <Link className="mr-2 text-gray-500" size={18} />
            No Reddit accounts connected
          </div>
        )}
      </div>
      
      {/* Frequent Searches Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Search className="mr-2 text-[#D4B675]" size={20} />
          Frequent Searches
        </h2>
        
        {frequentSearches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="pb-2 text-left text-sm font-medium text-gray-400">Search Query</th>
                  <th className="pb-2 text-right text-sm font-medium text-gray-400">Count</th>
                  <th className="pb-2 text-right text-sm font-medium text-gray-400">Last Searched</th>
                </tr>
              </thead>
              <tbody>
                {frequentSearches.map(search => (
                  <tr key={search.id} className="border-b border-[#222222]">
                    <td className="py-3 font-medium truncate max-w-[300px]">{search.username}</td>
                    <td className="py-3 text-right">{search.search_count}</td>
                    <td className="py-3 text-right text-gray-400">{formatDate(search.last_searched_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-lg p-4 text-gray-400 flex items-center">
            <Search className="mr-2 text-gray-500" size={18} />
            No frequent searches recorded
          </div>
        )}
      </div>
      
      {/* Projects Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Folder className="mr-2 text-[#D4B675]" size={20} />
          Projects
        </h2>
        
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => (
              <div key={project.id} className="bg-[#0a0a0a] rounded-lg p-4">
                <div className="font-medium mb-1">{project.name}</div>
                {project.description && (
                  <div className="text-gray-400 text-sm mb-2 truncate">{project.description}</div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <div>Created: {formatDate(project.created_at)}</div>
                  <div>Updated: {formatDate(project.updated_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-lg p-4 text-gray-400 flex items-center">
            <Folder className="mr-2 text-gray-500" size={18} />
            No projects created
          </div>
        )}
      </div>
      
      {/* Saved Subreddits Section */}
      <div className="bg-[#111111] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Bookmark className="mr-2 text-[#D4B675]" size={20} />
          Saved Subreddits
        </h2>
        
        {savedSubreddits.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedSubreddits.map(subreddit => (
              <div key={subreddit.id} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#222222] flex-shrink-0 mr-3">
                  {subreddit.icon_img || subreddit.community_icon ? (
                    <img
                      src={(subreddit.community_icon || subreddit.icon_img) as string}
                      alt={subreddit.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                      r/
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <div className="font-medium truncate">r/{subreddit.name}</div>
                  <div className="text-xs text-gray-500">Saved: {formatDate(subreddit.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0a0a0a] rounded-lg p-4 text-gray-400 flex items-center">
            <Bookmark className="mr-2 text-gray-500" size={18} />
            No saved subreddits
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDetails; 