import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  LineChart, 
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Users,
  MessageCircle,
  Award,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Star,
  Loader2,
  Search,
  Globe,
  FolderKanban
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Insert custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface FilterState {
  subreddits: string[];
  accounts: string[];
  projects: string[];
}

interface FilterOption {
  id: string;
  name: string;
  image?: string;
}

interface AnalyticsData {
  posts: {
    total: number;
    byDate: Record<string, number>;
    byType: Record<string, number>;
    engagement: {
      upvotes: number;
      comments: number;
      awards: number;
    };
  };
  accounts: {
    total: number;
    totalKarma: number;
    karmaGrowth: number;
    postsByAccount: Record<string, number>;
  };
  subreddits: {
    total: number;
    totalSubscribers: number;
    subscriberGrowth: number;
    postsBySubreddit: Record<string, number>;
  };
}

function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  
  const [filters, setFilters] = useState<FilterState>({
    subreddits: [],
    accounts: [],
    projects: []
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{
    accounts: FilterOption[];
    subreddits: FilterOption[];
    projects: FilterOption[];
  }>({
    accounts: [],
    subreddits: [],
    projects: []
  });
  const [filterSearch, setFilterSearch] = useState('');
  const debouncedFilterSearch = useDebounce(filterSearch, 300);

  // Fetch filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const [accountsData, subredditsData, projectsData] = await Promise.all([
          supabase
            .from('reddit_accounts')
            .select('id, username, avatar_url'),
          supabase
            .from('subreddits')
            .select('id, name, icon_img, community_icon'),
          supabase
            .from('projects')
            .select('id, name, image_url')
        ]);

        setFilterOptions({
          accounts: (accountsData.data || []).map(acc => ({
            id: acc.id,
            name: acc.username,
            image: acc.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${acc.username}&backgroundColor=111111`
          })),
          subreddits: (subredditsData.data || []).map(sub => ({
            id: sub.id,
            name: sub.name,
            image: sub.community_icon || sub.icon_img || `https://api.dicebear.com/7.x/shapes/svg?seed=${sub.name}&backgroundColor=111111`
          })),
          projects: (projectsData.data || []).map(proj => ({
            id: proj.id,
            name: proj.name,
            image: proj.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${proj.name}&backgroundColor=111111`
          }))
        });
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    }

    fetchFilterOptions();
  }, []);

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value) 
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', dateRange, filters],
    queryFn: async () => {
      const start = startOfDay(dateRange.startDate).toISOString();
      const end = endOfDay(dateRange.endDate).toISOString();

      // Fetch posts data
      const { data: posts, error: postsError } = await supabase
        .from('reddit_posts')
        .select(`
          id,
          post_id,
          created_at,
          reddit_accounts (username, karma_score),
          subreddits (name, subscriber_count)
        `)
        .gte('created_at', start)
        .lte('created_at', end);

      if (postsError) throw postsError;

      // Fetch account data
      const { data: accounts, error: accountsError } = await supabase
        .from('reddit_accounts')
        .select('*');

      if (accountsError) throw accountsError;

      // Fetch subreddit data
      const { data: subreddits, error: subredditsError } = await supabase
        .from('subreddits')
        .select('*');

      if (subredditsError) throw subredditsError;

      // Process and aggregate data
      const postsByDate: Record<string, number> = {};
      const postsByType: Record<string, number> = {};
      const postsBySubreddit: Record<string, number> = {};
      const postsByAccount: Record<string, number> = {};

      (posts || []).forEach(post => {
        const date = format(new Date(post.created_at), 'yyyy-MM-dd');
        postsByDate[date] = (postsByDate[date] || 0) + 1;

        if (post.subreddits) {
          const subreddit = Array.isArray(post.subreddits) ? post.subreddits[0] : post.subreddits;
          const subredditName = subreddit?.name;
          if (subredditName) {
            postsBySubreddit[subredditName] = (postsBySubreddit[subredditName] || 0) + 1;
          }
        }

        if (post.reddit_accounts) {
          const account = Array.isArray(post.reddit_accounts) ? post.reddit_accounts[0] : post.reddit_accounts;
          const username = account?.username;
          if (username) {
            postsByAccount[username] = (postsByAccount[username] || 0) + 1;
          }
        }
      });

      return {
        posts: {
          total: posts?.length || 0,
          byDate: postsByDate,
          byType: postsByType,
          engagement: {
            upvotes: 0, // To be implemented with Reddit API
            comments: 0,
            awards: 0
          }
        },
        accounts: {
          total: accounts?.length || 0,
          totalKarma: accounts?.reduce((sum, acc) => sum + (acc.karma_score || 0), 0) || 0,
          karmaGrowth: 0, // Calculate from historical data
          postsByAccount
        },
        subreddits: {
          total: subreddits?.length || 0,
          totalSubscribers: subreddits?.reduce((sum, sub) => sum + (sub.subscriber_count || 0), 0) || 0,
          subscriberGrowth: 0, // Calculate from historical data
          postsBySubreddit
        }
      };
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExport = () => {
    if (!analyticsData) return;

    // Create CSV content
    const csvContent = [
      ['Date', 'Posts', 'Upvotes', 'Comments', 'Awards'].join(','),
      ...Object.entries(analyticsData.posts.byDate).map(([date, count]) => 
        [date, count, 0, 0, 0].join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reddit-analytics-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`;
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); }, 100);
  };

  // Chart data preparation
  const lineChartData = useMemo(() => ({
    labels: Object.keys(analyticsData?.posts.byDate || {}),
    datasets: [
      {
        label: 'Posts',
        data: Object.values(analyticsData?.posts.byDate || {}),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }), [analyticsData]);

  const pieChartData = useMemo(() => ({
    labels: Object.keys(analyticsData?.subreddits.postsBySubreddit || {}),
    datasets: [
      {
        data: Object.values(analyticsData?.subreddits.postsBySubreddit || {}),
        backgroundColor: [
          '#4CAF50',
          '#2196F3',
          '#FFC107',
          '#9C27B0',
          '#F44336',
          '#795548'
        ]
      }
    ]
  }), [analyticsData]);

  const barChartData = useMemo(() => ({
    labels: Object.keys(analyticsData?.accounts.postsByAccount || {}),
    datasets: [
      {
        label: 'Posts by Account',
        data: Object.values(analyticsData?.accounts.postsByAccount || {}),
        backgroundColor: '#2196F3'
      }
    ]
  }), [analyticsData]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 mb-4">Error loading analytics data: {String(error)}</div>
        <button onClick={() => refetch()} className="secondary px-4 py-2 rounded">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">Performance <span className="text-[#C69B7B]">Analytics</span></h1>
        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Gain valuable insights into your Reddit marketing campaigns with comprehensive data and visualizations.
        </p>
      </div>

      <div className="flex justify-end items-center gap-2 mb-4">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`secondary flex items-center gap-2 ${isFilterOpen ? 'bg-[#1A1A1A]' : ''}`}
        >
          <Filter size={20} />
          <span className="hidden md:inline">Filters</span>
          {(filters.accounts.length > 0 || filters.subreddits.length > 0 || filters.projects.length > 0) && (
            <span className="bg-[#C69B7B] text-white text-xs px-2 py-0.5 rounded-full">
              {filters.accounts.length + filters.subreddits.length + filters.projects.length}
            </span>
          )}
        </button>
        <button
          onClick={handleRefresh}
          className="secondary flex items-center gap-2"
          disabled={refreshing}
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden md:inline">Refresh</span>
        </button>
        <button
          onClick={handleExport}
          className="secondary flex items-center gap-2"
        >
          <Download size={20} />
          <span className="hidden md:inline">Export</span>
        </button>
      </div>

      {/* Filters Panel */}
      {isFilterOpen && (
        <div className="bg-[#111111] p-4 rounded-lg mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search filters..."
                className="search-input w-full h-10 rounded-md"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Reddit Accounts */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-gray-400" />
                <h3 className="font-medium">Reddit Accounts</h3>
              </div>
              <div className="space-y-2">
                {filterOptions.accounts
                  .filter(acc => acc.name.toLowerCase().includes(debouncedFilterSearch.toLowerCase()))
                  .map(account => (
                    <button
                      key={account.id}
                      onClick={() => toggleFilter('accounts', account.id)}
                      className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                        filters.accounts.includes(account.id) 
                          ? 'bg-[#1A1A1A] border border-[#C69B7B] text-[#C69B7B]' 
                          : 'border border-transparent'
                      }`}
                    >
                      <img src={account.image} alt={account.name} className="w-6 h-6 rounded-full" />
                      <span className="text-sm truncate">u/{account.name}</span>
                      {filters.accounts.includes(account.id) && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Subreddits */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe size={20} className="text-gray-400" />
                <h3 className="font-medium">Subreddits</h3>
              </div>
              <div className="space-y-2">
                {filterOptions.subreddits
                  .filter(sub => sub.name.toLowerCase().includes(debouncedFilterSearch.toLowerCase()))
                  .map(subreddit => (
                    <button
                      key={subreddit.id}
                      onClick={() => toggleFilter('subreddits', subreddit.id)}
                      className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                        filters.subreddits.includes(subreddit.id)
                          ? 'bg-[#1A1A1A] border border-[#C69B7B] text-[#C69B7B]'
                          : 'border border-transparent'
                      }`}
                    >
                      <img src={subreddit.image} alt={subreddit.name} className="w-6 h-6 rounded-md" />
                      <span className="text-sm truncate">r/{subreddit.name}</span>
                      {filters.subreddits.includes(subreddit.id) && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FolderKanban size={20} className="text-gray-400" />
                <h3 className="font-medium">Projects</h3>
              </div>
              <div className="space-y-2">
                {filterOptions.projects
                  .filter(proj => proj.name.toLowerCase().includes(debouncedFilterSearch.toLowerCase()))
                  .map(project => (
                    <button
                      key={project.id}
                      onClick={() => toggleFilter('projects', project.id)}
                      className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                        filters.projects.includes(project.id)
                          ? 'bg-[#1A1A1A] border border-[#C69B7B] text-[#C69B7B]'
                          : 'border border-transparent'
                      }`}
                    >
                      <img src={project.image} alt={project.name} className="w-6 h-6 rounded-lg" />
                      <span className="text-sm truncate">{project.name}</span>
                      {filters.projects.includes(project.id) && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="bg-[#111111] p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar size={20} />
          <span>Date Range:</span>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            selected={dateRange.startDate}
            onChange={date => date && setDateRange(prev => ({ ...prev, startDate: date }))}
            className="bg-[#0A0A0A] border-none rounded-md px-4 h-10 text-white"
            dateFormat="MMM d, yyyy"
            maxDate={dateRange.endDate}
            aria-label="Select start date"
          />
          <span className="text-gray-400">to</span>
          <DatePicker
            selected={dateRange.endDate}
            onChange={date => date && setDateRange(prev => ({ ...prev, endDate: date }))}
            className="bg-[#0A0A0A] border-none rounded-md px-4 h-10 text-white"
            dateFormat="MMM d, yyyy"
            minDate={dateRange.startDate}
            aria-label="Select end date"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="bg-[#2B543A]/20 p-3 rounded-lg">
              <Activity size={24} className="text-[#C69B7B]" />
            </div>
            <span className="text-sm text-gray-400">Total Posts</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold">
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                analyticsData?.posts.total || 0
              )}
            </h3>
            <p className="text-sm text-emerald-400 mt-1">
              +{analyticsData?.posts.total || 0} this period
            </p>
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="bg-[#8B6D3F]/20 p-3 rounded-lg">
              <MessageCircle size={24} className="text-[#C69B7B]" />
            </div>
            <span className="text-sm text-gray-400">Total Comments</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold">
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                analyticsData?.posts.engagement.comments || 0
              )}
            </h3>
            <p className="text-sm text-amber-400 mt-1">
              +{analyticsData?.posts.engagement.comments || 0} this period
            </p>
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="bg-[#4A3B69]/20 p-3 rounded-lg">
              <Star size={24} className="text-[#C69B7B]" />
            </div>
            <span className="text-sm text-gray-400">Total Karma</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold">
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                analyticsData?.accounts.totalKarma || 0
              )}
            </h3>
            <p className="text-sm text-purple-400 mt-1">
              +{analyticsData?.accounts.karmaGrowth || 0} this period
            </p>
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="bg-[#1E3A5F]/20 p-3 rounded-lg">
              <Users size={24} className="text-[#C69B7B]" />
            </div>
            <span className="text-sm text-gray-400">Total Subscribers</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold">
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                analyticsData?.subreddits.totalSubscribers || 0
              )}
            </h3>
            <p className="text-sm text-blue-400 mt-1">
              +{analyticsData?.subreddits.subscriberGrowth || 0} this period
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Posts Over Time */}
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Posts Over Time</h3>
            <button className="text-gray-400 hover:text-white">
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <Line
                data={lineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    y: {
                      beginAtZero: true,
                      border: { display: false },
                      grid: { color: 'rgba(51, 51, 51, 0.5)' },
                      ticks: { color: '#999999', font: { size: 11 } }
                    },
                    x: {
                      border: { display: false },
                      grid: { color: 'rgba(51, 51, 51, 0.5)' },
                      ticks: { color: '#999999', font: { size: 11 } }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#111111',
                      borderColor: '#333333',
                      borderWidth: 1,
                      titleColor: '#ffffff',
                      bodyColor: '#C69B7B',
                      padding: 12,
                      cornerRadius: 8,
                      bodyFont: { family: 'inherit' },
                      titleFont: { family: 'inherit' }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Posts by Subreddit */}
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Posts by Subreddit</h3>
            <button className="text-gray-400 hover:text-white">
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <Pie
                data={pieChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      align: 'center',
                      labels: {
                        color: '#C69B7B',
                        usePointStyle: true,
                        padding: 16,
                        font: {
                          size: 12,
                          family: 'inherit'
                        }
                      },
                      title: {
                        display: false
                      }
                    },
                    tooltip: {
                      backgroundColor: '#111111',
                      borderColor: '#333333',
                      borderWidth: 1,
                      titleColor: '#ffffff',
                      bodyColor: '#C69B7B',
                      padding: 12,
                      cornerRadius: 8,
                      bodyFont: {
                        family: 'inherit'
                      },
                      titleFont: {
                        family: 'inherit'
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Posts by Account */}
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Posts by Account</h3>
            <button className="text-gray-400 hover:text-white">
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <Bar
                data={barChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    y: {
                      beginAtZero: true,
                      border: { display: false },
                      grid: { color: 'rgba(51, 51, 51, 0.5)' },
                      ticks: { color: '#999999', font: { size: 11 } }
                    },
                    x: {
                      border: { display: false },
                      grid: { color: 'rgba(51, 51, 51, 0.5)' },
                      ticks: { color: '#999999', font: { size: 11 } }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#111111',
                      borderColor: '#333333',
                      borderWidth: 1,
                      titleColor: '#ffffff',
                      bodyColor: '#C69B7B',
                      padding: 12,
                      cornerRadius: 8,
                      bodyFont: { family: 'inherit' },
                      titleFont: { family: 'inherit' }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Engagement Metrics</h3>
            <button className="text-gray-400 hover:text-white">
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-[#C69B7B]" />
                <span>Upvotes</span>
              </div>
              <span className="font-medium">{analyticsData?.posts.engagement.upvotes || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-[#C69B7B]" />
                <span>Comments</span>
              </div>
              <span className="font-medium">{analyticsData?.posts.engagement.comments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-[#C69B7B]" />
                <span className="text-gray-400">Awards</span>
              </div>
              <span className="font-medium">{analyticsData?.posts.engagement.awards || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default Analytics;