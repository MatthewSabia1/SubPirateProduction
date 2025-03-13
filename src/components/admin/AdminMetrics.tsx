import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  BarChart3, 
  Calendar, 
  ClipboardList, 
  UserPlus,
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminMetricsData {
  totalUsers: number;
  revenue: {
    monthly: number;
    currency: string;
  };
  activeSubscriptions: number;
  totalAnalyses: number;
  totalPosts: number;
  newUsersThisMonth: number;
  subscriptionsByTier: {
    tier: string;
    count: number;
  }[];
}

function AdminMetrics() {
  const [metricsData, setMetricsData] = useState<AdminMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchMetrics();
  }, []);
  
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get total user count
      const { data: totalUsersData, error: userError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact' });
      
      if (userError) throw userError;
      
      // Get active subscriptions
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('customer_subscriptions')
        .select('count', { count: 'exact' })
        .eq('status', 'active');
      
      if (subsError) throw subsError;
      
      // Get total analyses
      const { data: analysesData, error: analysesError } = await supabase
        .from('user_usage_stats')
        .select('subreddit_analysis_count')
        .gt('subreddit_analysis_count', 0);
      
      if (analysesError) throw analysesError;
      
      // Calculate total analyses
      const totalAnalyses = analysesData
        ? analysesData.reduce((sum, item) => sum + (item.subreddit_analysis_count || 0), 0)
        : 0;
      
      // Get total posts
      const { data: postsData, error: postsError } = await supabase
        .from('reddit_posts')
        .select('count', { count: 'exact' });
      
      if (postsError) throw postsError;
      
      // Get new users created this month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      
      const { data: newUsersData, error: newUsersError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact' })
        .gte('created_at', firstDayOfMonth);
      
      if (newUsersError) throw newUsersError;
      
      // Get subscription data for revenue calculation
      const { data: subscriptionsForRevenue, error: revenueSubsError } = await supabase
        .from('customer_subscriptions')
        .select(`
          stripe_subscription_id,
          stripe_price_id,
          status
        `)
        .eq('status', 'active');
      
      if (revenueSubsError) throw revenueSubsError;
      
      // Get price data for revenue calculation
      const { data: pricesData, error: pricesError } = await supabase
        .from('stripe_prices')
        .select(`
          id,
          unit_amount,
          currency,
          stripe_product_id
        `);
      
      if (pricesError) throw pricesError;
      
      // Get product data for tier information
      const { data: productsData, error: productsError } = await supabase
        .from('stripe_products')
        .select(`
          stripe_product_id,
          name,
          metadata
        `);
      
      if (productsError) throw productsError;
      
      // Calculate monthly revenue and subscriptions by tier
      let monthlyRevenue = 0;
      let currency = 'usd';
      const tierCounts: Record<string, number> = {};
      
      if (subscriptionsForRevenue && pricesData && productsData) {
        subscriptionsForRevenue.forEach(sub => {
          const price = pricesData.find(p => p.id === sub.stripe_price_id);
          if (price) {
            monthlyRevenue += price.unit_amount || 0;
            currency = price.currency || 'usd';
            
            // Find associated product to get tier info
            const product = productsData.find(p => p.stripe_product_id === price.stripe_product_id);
            // Get tier from product name or default to product name if metadata not available
            let tier = 'unknown';
            if (product) {
              // Try to get tier from metadata or use product name as fallback
              tier = (product.metadata && product.metadata.tier) || product.name || 'unknown';
            }
            
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
          }
        });
      }
      
      // Transform tier counts to array
      const subscriptionsByTier = Object.entries(tierCounts).map(([tier, count]) => ({
        tier,
        count
      }));
      
      // Set the metrics data
      setMetricsData({
        totalUsers: totalUsersData?.[0]?.count || 0,
        revenue: {
          monthly: monthlyRevenue,
          currency: currency
        },
        activeSubscriptions: subscriptionsData?.[0]?.count || 0,
        totalAnalyses,
        totalPosts: postsData?.[0]?.count || 0,
        newUsersThisMonth: newUsersData?.[0]?.count || 0,
        subscriptionsByTier
      });
      
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    });
    
    return formatter.format(amount / 100); // Convert cents to dollars
  };
  
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
  
  if (!metricsData) {
    return (
      <div className="text-gray-400">No metrics data available</div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-6">Dashboard Metrics</h2>
      
      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users Card */}
        <div className="bg-gradient-to-br from-[#111111] to-[#1a1a1a] rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#D4B675]/10 flex items-center justify-center mr-4">
              <Users size={24} className="text-[#D4B675]" />
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Total Users</h3>
              <p className="text-2xl font-bold">{metricsData.totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <UserPlus size={14} className="mr-1 text-green-400" />
            <span className="text-green-400">{metricsData.newUsersThisMonth}</span>
            <span className="ml-1 text-gray-400">new this month</span>
          </div>
        </div>
        
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-[#111111] to-[#1a1a1a] rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mr-4">
              <DollarSign size={24} className="text-green-500" />
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Monthly Revenue</h3>
              <p className="text-2xl font-bold">
                {formatCurrency(metricsData.revenue.monthly, metricsData.revenue.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <Users size={14} className="mr-1 text-[#D4B675CC]" />
            <span className="text-[#D4B675CC]">{metricsData.activeSubscriptions}</span>
            <span className="ml-1 text-gray-400">active subscriptions</span>
          </div>
        </div>
        
        {/* Analyses Card */}
        <div className="bg-gradient-to-br from-[#111111] to-[#1a1a1a] rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mr-4">
              <BarChart3 size={24} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-gray-400 text-sm">Total Analyses</h3>
              <p className="text-2xl font-bold">{metricsData.totalAnalyses.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <ClipboardList size={14} className="mr-1 text-blue-400" />
            <span className="text-blue-400">{metricsData.totalPosts.toLocaleString()}</span>
            <span className="ml-1 text-gray-400">posts analyzed</span>
          </div>
        </div>
      </div>
      
      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscriptions by Tier */}
        <div className="bg-[#111111] rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Users className="mr-2 text-[#D4B675]" size={18} />
            Subscriptions by Tier
          </h3>
          
          {metricsData.subscriptionsByTier.length > 0 ? (
            <div className="space-y-4">
              {metricsData.subscriptionsByTier.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)} Tier
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-24 ml-4">
                    <div className="h-2 bg-[#222222] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D4B675] rounded-full"
                        style={{ 
                          width: `${Math.min(100, (item.count / metricsData.activeSubscriptions) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No subscription data available</div>
          )}
        </div>
        
        {/* User Growth */}
        <div className="bg-[#111111] rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Calendar className="mr-2 text-[#D4B675]" size={18} />
            Recent Activity
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">New Users (this month)</div>
              <div className="font-semibold">{metricsData.newUsersThisMonth}</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Active Subscriptions</div>
              <div className="font-semibold">{metricsData.activeSubscriptions}</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Total Posts Analyzed</div>
              <div className="font-semibold">{metricsData.totalPosts.toLocaleString()}</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Monthly Revenue</div>
              <div className="font-semibold">
                {formatCurrency(metricsData.revenue.monthly, metricsData.revenue.currency)}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={fetchMetrics}
              className="text-sm text-[#D4B675CC] hover:text-[#D4B675]"
            >
              Refresh Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminMetrics; 