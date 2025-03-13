# Technical Context

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Local State
- **Router**: React Router
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Charts**: Chart.js + React Chart.js 2
- **Portals**: React Portal for tooltips
- **AI Integration**: OpenRouter API

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL
  - Custom database migrations
    - User-specific search tracking migration (20230930000000_add_user_id_to_frequent_searches.sql)
    - Added user_id column to frequent_searches table to track per-user search history
    - Modified increment_search_count function to associate searches with specific users
- **Authentication**: 
  - Supabase Auth
  - Email/Password authentication
  - Google OAuth authentication
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **AI**: OpenRouter
- **Payments**: Stripe API
  - Environment detection for test/production modes
  - Test mode for development and preview environments
  - Production mode for the live site
  - Verification tools for production readiness
- **Usage Tracking**: Custom Supabase RPC functions and tables

### External APIs
- **Reddit API**: Direct REST integration with batching
- **OpenRouter API**: AI analysis
- **DiceBear**: Avatar generation
- **Google OAuth**: User authentication
- **Stripe API**: Subscription and payment processing
  - Environment-aware configuration:
    - Test keys for development and preview environments
    - Production keys for the live site
    - Automatic detection based on domain and build mode
  - Feature-complete webhook handling
  - Comprehensive verification tools
  - Detailed setup documentation

## Application Routes

### Page Routes
```typescript
routes: [
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/projects', element: <Projects /> },
      { path: '/projects/:id', element: <ProjectDetails /> },
      { path: '/saved', element: <SavedSubreddits /> },
      { path: '/analysis/:subreddit', element: <SubredditAnalysis /> },
      { path: '/settings', element: <Settings /> },
      { path: '/profile', element: <Profile /> },
      { path: '/pricing', element: <Pricing /> }
    ]
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/reddit/callback', element: <RedditOAuthCallback /> }
]
```

### API Routes

#### Subreddit Analysis
```typescript
// Analysis endpoints
POST /api/analyze-subreddit
GET /api/analysis/:subredditName
PUT /api/analysis/:subredditName
DELETE /api/analysis/:subredditName

// Subreddit management
GET /api/subreddits/saved
POST /api/subreddits/save
DELETE /api/subreddits/save/:id

// Project management
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id
```

#### Stripe Webhooks (Separate Express Server)
```typescript
// Webhook endpoints
POST /api/stripe/webhook
GET /api/test
```

## Development Environment

### Required Tools
- Node.js 18+
- npm/yarn
- Git
- VS Code (recommended)
- Stripe CLI (for webhook testing)

### VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript support

### Environment Variables
```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_JWT_SECRET=
VITE_SUPABASE_CONNECTION_STRING=
VITE_SUPABASE_ACCESS_TOKEN=

# Reddit API Configuration
VITE_REDDIT_APP_ID=your_reddit_app_id
VITE_REDDIT_APP_SECRET=your_reddit_app_secret

# Google OAuth Configuration
# Configure in Supabase Dashboard under Authentication > Providers > Google
# No additional environment variables needed for client-side implementation

# Stripe Configuration
# Test API keys (used in development and preview environments)
VITE_STRIPE_TEST_SECRET_KEY=sk_test_...
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_TEST_WEBHOOK_SECRET=whsec_...

# Production API keys (used in production environment)
VITE_STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PROD_WEBHOOK_SECRET=
VITE_STRIPE_BASE_URL=

# OpenRouter API
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "stripe:sync": "node src/lib/stripe/sync-products.js",
    "stripe:verify": "node scripts/verify-stripe-production.js",
    "stripe:prod-setup": "npm run stripe:sync && npm run stripe:verify",
    "stripe:webhook": "ts-node scripts/setup-stripe-webhook.ts",
    "dev:webhook": "cross-env NODE_ENV=development STRIPE_TEST_MODE=true concurrently \"npm run dev\" \"npm run webhook\" \"stripe listen --forward-to http://localhost:4242/api/stripe/webhook\"",
    "server": "node server.js"
  }
}
```

## Stripe Integration

### Test Mode Configuration
- Forced test mode in client.ts with `useTestMode = true`
- Webhook server running on port 4242 (separate from Vite)
- Test price IDs for each subscription tier as fallbacks
- Visual indicators in the UI to show test mode
- Enhanced error logging for debugging

### Webhook Setup
- Express server with raw JSON body parsing
- Proper signature verification using Stripe webhooks.constructEvent
- Event handling for checkout.session.completed, customer.subscription.created, etc.
- Testing with Stripe CLI forwarding to localhost

### Subscription Flow
1. User selects plan on Pricing page
2. createCheckoutSession called with plan ID and user info
3. Redirect to Stripe Checkout
4. On success, redirect back to app
5. Webhook events update user subscription status

## Authentication

### Authentication Methods
- **Email/Password**: Standard email and password login
- **Google OAuth**: "Continue with Google" social login
- **Reddit OAuth**: OAuth for Reddit API access (not for authentication)

### Authentication Flow
1. **Email/Password**:
   - User enters email and password in Login form
   - Credentials are validated by Supabase
   - Session is created and stored in local storage
   - User is redirected to the Dashboard

2. **Google OAuth**:
   - User clicks "Continue with Google" button
   - Redirected to Google consent screen
   - After approval, redirected to `/auth/callback`
   - AuthCallback component processes the session
   - User redirected to Dashboard on success

3. **Session Management**:
   - Sessions stored in local storage
   - Sessions automatically refreshed
   - Logged out when session expires

### Authentication Configuration
```typescript
// src/contexts/AuthContext.tsx
const signInWithGoogle = async () => {
  setLoading(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    setError('An error occurred during Google sign-in. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

```typescript
// src/pages/AuthCallback.tsx
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLoading(false);
        navigate('/');
      } else if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    }
  );

  return () => {
    authListener?.subscription.unsubscribe();
  };
}, [navigate]);
```

### Required Supabase Configuration
- Google OAuth provider must be enabled in Supabase dashboard
- Google Cloud Platform OAuth credentials required:
  - Client ID and Client Secret
  - Authorized redirect URI: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
  - Additional redirect URI for local development: `http://localhost:5173/auth/callback`
  - Additional production redirect URI: `https://yourdomain.com/auth/callback`

## Dependencies

### Core Dependencies
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0",
  "typescript": "^5.0.0",
  "@tanstack/react-query": "^4.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "tailwindcss": "^3.0.0",
  "lucide-react": "^0.300.0",
  "chart.js": "^4.4.1",
  "react-chartjs-2": "^5.2.0",
  "stripe": "^14.0.0"
}
```

### Development Dependencies
```json
{
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "vite": "^5.0.0"
}
```

## Database Schema

### Core Tables

#### profiles
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  role TEXT DEFAULT 'user' NOT NULL
);
```

#### projects
```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text not null,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### subreddits
```sql
create table subreddits (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  subscriber_count integer default 0,
  active_users integer default 0,
  marketing_friendly_score integer default 0,
  posting_requirements jsonb default '{}',
  posting_frequency jsonb default '{}',
  allowed_content text[] default '{}',
  best_practices text[] default '{}',
  rules_summary text,
  title_template text,
  icon_img text,
  community_icon text,
  total_posts_24h integer default 0,
  analysis_data jsonb,
  last_analyzed_at timestamptz default now(),
  last_post_sync timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- New fields for enhanced analysis
  content_types text[] default '{}',
  best_posting_times text[] default '{}',
  engagement_metrics jsonb default '{}',
  moderation_level text default 'moderate',
  community_type text default 'general',
  growth_rate numeric default 0.0,
  constraint valid_moderation_level check (moderation_level in ('low', 'moderate', 'high', 'strict')),
  constraint valid_community_type check (community_type in ('general', 'niche', 'professional', 'entertainment', 'educational'))
);

-- Indexes for performance
create index idx_subreddits_name on subreddits(name);
create index idx_subreddits_marketing_score on subreddits(marketing_friendly_score);
create index idx_subreddits_last_analyzed on subreddits(last_analyzed_at);
```

#### analysis_results
```sql
create table analysis_results (
  id uuid primary key default gen_random_uuid(),
  subreddit_id uuid references subreddits(id) on delete cascade,
  analysis_version integer not null default 1,
  raw_data jsonb not null default '{}',
  processed_data jsonb not null default '{}',
  metrics jsonb not null default '{}',
  recommendations text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure we keep track of analysis versions
  unique(subreddit_id, analysis_version)
);

-- Index for quick lookups
create index idx_analysis_results_subreddit on analysis_results(subreddit_id);
```

#### reddit_accounts
```sql
create table reddit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  username text not null,
  karma_score integer default 0,
  avatar_url text,
  total_posts integer default 0,
  posts_today integer default 0,
  total_posts_24h integer default 0,
  last_post_check timestamptz default now(),
  last_karma_check timestamptz default now(),
  last_post_sync timestamptz default now(),
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  client_id text,
  client_secret text,
  scope text[] default '{identity,read,submit,subscribe,history,mysubreddits,privatemessages,save,vote,edit,flair,report}'::text[],
  is_active boolean default true,
  last_used_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, username)
);
```

#### reddit_api_usage
```sql
create table reddit_api_usage (
  id uuid primary key default gen_random_uuid(),
  reddit_account_id uuid references reddit_accounts(id) on delete cascade,
  endpoint text not null,
  endpoint_hash varchar(32) not null,
  requests_count integer default 1,
  window_start timestamptz default now(),
  reset_at timestamptz default now() + interval '1 hour',
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(reddit_account_id, endpoint_hash)
);

-- Automatic endpoint hashing trigger
create function set_endpoint_hash()
returns trigger as $$
begin
  new.endpoint_hash := encode(digest(new.endpoint, 'md5'), 'hex');
  return new;
end;
$$ language plpgsql;

create trigger auto_set_endpoint_hash
  before insert or update of endpoint on reddit_api_usage
  for each row
  execute function set_endpoint_hash();

-- Atomic increment function
create function increment_requests_count(row_id uuid, amount int)
returns void as $$
begin
  update reddit_api_usage
  set requests_count = requests_count + amount
  where id = row_id;
end;
$$ language plpgsql;
```

#### subscriptions
```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  customer_id text not null,
  subscription_id text not null unique,
  status text not null,
  price_id text,
  product_id text,
  current_period_end timestamptz,
  current_period_start timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure we only store one subscription per customer
  unique(user_id, customer_id)
);

-- Indexes for quick lookups
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_subscription_id on subscriptions(subscription_id);
create index idx_subscriptions_status on subscriptions(status);
```

#### prices
```sql
create table prices (
  id text primary key,  -- price_id from Stripe
  product_id text not null,
  active boolean default true,
  currency text not null,
  description text,
  type text not null,
  unit_amount integer not null,
  interval text,
  interval_count integer,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### products
```sql
create table products (
  id text primary key,  -- product_id from Stripe
  active boolean default true,
  name text not null,
  description text,
  image text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Relationship Tables

#### project_subreddits
```sql
create table project_subreddits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  created_at timestamptz default now(),
  last_post_at timestamptz,
  unique(project_id, subreddit_id)
);
```

#### saved_subreddits
```sql
create table saved_subreddits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  created_at timestamptz default now(),
  last_post_at timestamptz,
  unique(user_id, subreddit_id)
);
```

#### reddit_posts
```sql
create table reddit_posts (
  id uuid primary key default gen_random_uuid(),
  reddit_account_id uuid references reddit_accounts(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  post_id text not null,
  created_at timestamptz default now(),
  unique(reddit_account_id, post_id)
);
```

### Views

#### saved_subreddits_with_icons
```sql
create or replace view saved_subreddits_with_icons as
select 
  ss.id,
  ss.user_id,
  ss.created_at,
  s.id as subreddit_id,
  s.name,
  s.subscriber_count,
  s.active_users,
  s.marketing_friendly_score,
  s.allowed_content,
  s.icon_img,
  s.community_icon,
  s.total_posts_24h,
  s.last_post_sync,
  s.analysis_data
from saved_subreddits ss
join subreddits s on ss.subreddit_id = s.id;
```

### Security Policies

The database implements Row Level Security (RLS) with the following key policies:

1. **Profiles**
   - Users can only view and update their own profile

2. **Projects**
   - Users can only view, create, update, and delete their own projects

3. **Reddit Accounts**
   - Users can only view, create, update, and delete their own reddit accounts

4. **Subreddits**
   - All authenticated users can view, create, and update subreddits
   - No deletion allowed to maintain data integrity

5. **Project Subreddits**
   - Users can only view, create, and delete project subreddits for their own projects

## API Integration

### Reddit API
- OAuth2 Authentication Flow
  - Initial app-level authentication for basic functions
  - User-specific OAuth for core features
  - Multiple account support with load balancing
- Rate Limiting
  - Per-account tracking and monitoring
  - Automatic rotation between user's accounts
  - Window-based request counting
- Error Handling
  - 429 (Rate Limit) handling with account rotation
  - 503 Service Unavailable recovery
  - Token refresh and expiry management
- Security
  - Secure credential storage
  - Scoped access per account
  - Active session management

### API Usage Management
- Request Tracking
  - Per-endpoint monitoring
  - Rolling window calculations
  - Account-specific limits
- Load Balancing
  - Round-robin between active accounts
  - Rate limit avoidance
  - Automatic failover
- Session Management
  - Token refresh automation
  - Account status monitoring
  - Usage optimization

### OpenRouter API
- Grok model for analysis
- Strict JSON schema
- Error handling for timeouts
- Retry logic for failures

### Supabase
- Real-time subscriptions
- Row Level Security
- Optimistic updates
- Error handling

## Performance Considerations

### Frontend
- Code splitting
- Image optimization
- Lazy loading
- Debounced API calls

### API
- Request caching
- Rate limiting
- Batch operations
- Error recovery

### Database
- Indexed queries
- Efficient joins
- Connection pooling
- Query optimization 

## Type Definitions

### Analysis Types
```typescript
interface SubredditAnalysis {
  marketingFriendliness: number;
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };
  contentStrategy: {
    recommendedTypes: string[];
    guidelines: string[];
    topics: string[];
  };
  titleTemplates: string[];
  strategicAnalysis: {
    strengths: string[];
    opportunities: string[];
    considerations: string[];
  };
  gamePlan: {
    steps: string[];
    timeline: string;
    metrics: string[];
  };
}

interface AnalysisResult {
  info: {
    name: string;
    subscriberCount: number;
    activeUsers: number;
    totalPosts24h: number;
  };
  analysis: SubredditAnalysis;
  posts: SubredditPost[];
}
```

### Database Types
```typescript
interface SubredditDBRecord {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  posting_requirements: Record<string, unknown>;
  posting_frequency: Record<string, unknown>;
  allowed_content: string[];
  best_practices: string[];
  rules_summary: string | null;
  title_template: string | null;
  icon_img: string | null;
  community_icon: string | null;
  total_posts_24h: number;
  analysis_data: SubredditAnalysis | null;
  last_analyzed_at: string;
  last_post_sync: string;
  created_at: string;
  updated_at: string;
  
  // New fields
  content_types: string[];
  best_posting_times: string[];
  engagement_metrics: Record<string, number>;
  moderation_level: 'low' | 'moderate' | 'high' | 'strict';
  community_type: 'general' | 'niche' | 'professional' | 'entertainment' | 'educational';
  growth_rate: number;
}
```

## Error Handling

### API Error Structure
```typescript
interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status: number;
}

const errorCodes = {
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  SUBREDDIT_NOT_FOUND: 'SUBREDDIT_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  DATABASE_ERROR: 'DATABASE_ERROR'
} as const;
```

### Error Recovery Patterns
```typescript
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await delay(calculateBackoff(retries));
      return withErrorHandling(operation, retries - 1);
    }
    throw error;
  }
}
```

## UI Architecture

### Layout System
The application implements a consistent layout system using Tailwind CSS classes:

#### Page Container Pattern
```tsx
// Standard page container
<div className="max-w-[1200px] mx-auto px-4 md:px-8">
  {/* Page content */}
</div>
```

Technical specifications:
1. Width constraints:
   - Max width: 1200px
   - Viewport width: 100% (implicit)
2. Horizontal centering:
   - Using `mx-auto` for automatic margins
3. Responsive padding:
   - Mobile: 1rem (16px) via `px-4`
   - Desktop: 2rem (32px) via `md:px-8`
4. Implementation:
   - Used in list views and major pages
   - No wrapper components yet (potential future improvement)

#### List Container Pattern
```tsx
// Standard list container
<div className="bg-[#111111] rounded-lg overflow-hidden">
  <div className="divide-y divide-[#222222]">
    {/* List items */}
  </div>
</div>
```

Technical specifications:
1. Colors:
   - Background: #111111
   - Dividers: #222222
2. Border radius: lg (0.5rem)
3. Overflow handling:
   - Hidden overflow for rounded corners
   - Prevents content from breaking layout

### Current Implementation Status
- ✅ SavedList component
- ✅ Projects page
- ⏳ Other main pages pending review

### Future Considerations
1. Create a shared layout component
2. Implement layout composition patterns
3. Consider CSS Grid for complex layouts
4. Add layout documentation to Storybook 

## Key Components

### HeatmapChart
```typescript
interface Post {
  title: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface HeatmapProps {
  posts: Post[];
}

// Features:
- Interactive post activity visualization
- Portal-based tooltips
- Neighbor cell highlighting
- Smooth transitions
- Performance optimization
```

### Analysis System
```typescript
interface AnalysisResult {
  info: SubredditInfo;
  posts: Post[];
  analysis: {
    marketingFriendliness: {
      score: number;
      reasons: string[];
      recommendations: string[];
    };
    postingLimits: {
      frequency: number;
      bestTimeToPost: string[];
      contentRestrictions: string[];
    };
    contentStrategy: {
      recommendedTypes: string[];
      topics: string[];
      style: string;
      dos: string[];
      donts: string[];
    };
    // ... other analysis properties
  };
}
```

## Database Schema Updates

### subreddits
```sql
alter table subreddits
add column analysis_data jsonb default null,
add column last_analyzed_at timestamptz default now(),
add column total_posts_24h integer default 0;

-- New indexes
create index idx_subreddits_last_analyzed on subreddits(last_analyzed_at);
create index idx_subreddits_total_posts on subreddits(total_posts_24h);
```

### saved_subreddits_with_icons
```sql
create or replace view saved_subreddits_with_icons as
select 
  ss.id,
  ss.user_id,
  ss.created_at,
  s.id as subreddit_id,
  s.name,
  s.subscriber_count,
  s.active_users,
  s.marketing_friendly_score,
  s.allowed_content,
  s.icon_img,
  s.community_icon,
  s.total_posts_24h,
  s.last_post_sync,
  s.analysis_data
from saved_subreddits ss
join subreddits s on ss.subreddit_id = s.id;
```

## API Endpoints

### Analysis
```typescript
// Analysis endpoints
POST /api/analyze-subreddit
  body: {
    name: string;
    postCount?: number; // defaults to 500
  }

GET /api/analysis/:subredditName
PUT /api/analysis/:subredditName
  body: {
    analysis_data: AnalysisResult;
  }

// Re-analysis endpoint
POST /api/reanalyze-subreddit
  body: {
    subreddit_id: string;
  }
```

## Development Guidelines

### Performance Optimization
1. Use React.memo for pure components
2. Implement proper dependency arrays in useEffect
3. Batch Reddit API calls when possible
4. Use efficient data structures for lookups
5. Implement proper caching strategies

### Error Handling
1. Implement specific error types
2. Use proper error boundaries
3. Provide meaningful error messages
4. Handle edge cases gracefully

### State Management
1. Use local state for UI-specific state
2. Implement proper caching with React Query
3. Use context for shared state
4. Maintain consistent state updates

### Styling
1. Use Tailwind utility classes
2. Implement responsive design
3. Follow accessibility guidelines
4. Maintain consistent theming

## User Usage Tracking

### Core Tables
```sql
-- User profiles
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  role TEXT DEFAULT 'user' NOT NULL
)

-- Projects
projects (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  user_id UUID REFERENCES profiles,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Subscription management
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Usage tracking
user_usage_stats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  subreddit_analysis_count INTEGER,
  month_start TIMESTAMPTZ,
  month_end TIMESTAMPTZ, 
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, month_start)
)
```

### Stored Procedures/Functions
```sql
-- Increment usage statistics
increment_usage_stat(
  user_id_param UUID,
  stat_name TEXT,
  increment_by INTEGER
) RETURNS VOID

-- Get user usage statistics
get_user_usage_stats(
  user_id_param UUID
) RETURNS JSON
```

### User Role Management System
The application implements a comprehensive role management system with three primary user roles:

1. **Regular User** (default)
   - Access determined by subscription tier
   - Feature access varies by subscription level
   - Usage limits based on tier

2. **Admin**
   - Complete access to all features
   - No usage limits
   - Access to admin-only features
   - Managed via CLI tools
   - Special subscription handling

3. **Gift**
   - Pro-level feature access
   - No direct payment required
   - Granted by administrators
   - Managed via CLI tools
   - Special subscription handling

**Database Implementation:**
```sql
-- In profiles table
role TEXT DEFAULT 'user' NOT NULL

-- Role checking functions
is_admin(user_id UUID) RETURNS BOOLEAN
is_gift_user(user_id UUID) RETURNS BOOLEAN
set_user_role(user_id UUID, new_role TEXT) RETURNS VOID
```

**Subscription Tier Extension:**
```sql
-- Add values to subscription_tier enum
ALTER TYPE subscription_tier ADD VALUE 'admin' AFTER 'agency';
ALTER TYPE subscription_tier ADD VALUE 'gift' AFTER 'admin';

-- Trigger function for subscription management
handle_special_subscription_status()
```

**CLI Management Tools:**
```bash
# Set a user as admin
npm run admin:set user@example.com

# Remove admin role
npm run admin:remove user@example.com

# Set a user as gift
npm run gift:set user@example.com

# Remove gift role
npm run gift:remove user@example.com
```
