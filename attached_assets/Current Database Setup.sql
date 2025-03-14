-- Database Setup

-- Create tables
CREATE TABLE public.customer_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NULL,
  stripe_price_id text NULL,
  status public.subscription_status NOT NULL,
  trial_start timestamp with time zone NULL,
  trial_end timestamp with time zone NULL,
  current_period_start timestamp with time zone NULL,
  current_period_end timestamp with time zone NULL,
  cancel_at_period_end boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT customer_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT customer_subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id),
  CONSTRAINT customer_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT customer_subscriptions_user_id_subscription_id_key UNIQUE (user_id, stripe_subscription_id),
  CONSTRAINT customer_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.frequent_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL,
  search_count integer NULL DEFAULT 1,
  last_searched_at timestamp with time zone NULL DEFAULT now(),
  avatar_url text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NULL,
  CONSTRAINT frequent_searches_pkey PRIMARY KEY (id),
  CONSTRAINT unique_username_per_user UNIQUE (username, user_id),
  CONSTRAINT frequent_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_frequent_searches_count ON public.frequent_searches USING btree (search_count DESC);
CREATE INDEX IF NOT EXISTS idx_frequent_searches_username ON public.frequent_searches USING btree (username);

CREATE TABLE public.product_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL,
  feature_key text NOT NULL,
  enabled boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT product_features_pkey PRIMARY KEY (id),
  CONSTRAINT unique_product_feature UNIQUE (stripe_product_id, feature_key),
  CONSTRAINT fk_feature FOREIGN KEY (feature_key) REFERENCES subscription_features(feature_key) ON DELETE CASCADE,
  CONSTRAINT fk_stripe_product FOREIGN KEY (stripe_product_id) REFERENCES stripe_products(stripe_product_id) ON DELETE CASCADE
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  email text NULL,
  image_url text NULL,
  stripe_customer_id text NULL,
  full_name text NULL,
  role text NOT NULL DEFAULT 'user'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles USING btree (stripe_customer_id);

CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.project_role NOT NULL DEFAULT 'read'::project_role,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.project_subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  last_post_at timestamp with time zone NULL,
  CONSTRAINT project_subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT project_subreddits_project_id_subreddit_id_key UNIQUE (project_id, subreddit_id),
  CONSTRAINT project_subreddits_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT project_subreddits_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  image_url text NULL,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.reddit_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  last_post_check timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  karma_score integer NULL DEFAULT 0,
  avatar_url text NULL,
  total_posts integer NULL DEFAULT 0,
  posts_today integer NULL DEFAULT 0,
  last_karma_check timestamp with time zone NULL DEFAULT now(),
  total_posts_24h integer NULL DEFAULT 0,
  last_post_sync timestamp with time zone NULL DEFAULT now(),
  access_token text NULL,
  refresh_token text NULL,
  token_expiry timestamp with time zone NULL,
  client_id text NULL,
  client_secret text NULL,
  scope text[] NULL DEFAULT '{identity,read,submit,subscribe,history,mysubreddits,privatemessages,save,vote,edit,flair,report}'::text[],
  is_active boolean NULL DEFAULT true,
  last_used_at timestamp with time zone NULL DEFAULT now(),
  link_karma integer NULL DEFAULT 0,
  comment_karma integer NULL DEFAULT 0,
  awardee_karma integer NULL DEFAULT 0,
  awarder_karma integer NULL DEFAULT 0,
  total_karma integer NULL DEFAULT 0,
  is_gold boolean NULL DEFAULT false,
  is_mod boolean NULL DEFAULT false,
  verified boolean NULL DEFAULT false,
  has_verified_email boolean NULL DEFAULT false,
  created_utc timestamp with time zone NULL,
  rate_limit_remaining integer NULL DEFAULT 60,
  rate_limit_reset timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT reddit_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT reddit_accounts_user_id_username_key UNIQUE (user_id, username),
  CONSTRAINT reddit_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_is_active ON public.reddit_accounts USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_rate_limit ON public.reddit_accounts USING btree (rate_limit_remaining, rate_limit_reset)  TABLESPACE pg_default WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_token_expiry ON public.reddit_accounts USING btree (token_expiry);

CREATE TABLE public.reddit_api_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reddit_account_id uuid NOT NULL,
  endpoint text NOT NULL,
  requests_count integer NULL DEFAULT 0,
  window_start timestamp with time zone NULL DEFAULT now(),
  reset_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  endpoint_hash character varying(32) NOT NULL,
  CONSTRAINT reddit_api_usage_pkey PRIMARY KEY (id),
  CONSTRAINT reddit_api_usage_account_endpoint_hash_key UNIQUE (reddit_account_id, endpoint_hash),
  CONSTRAINT reddit_api_usage_reddit_account_id_fkey FOREIGN KEY (reddit_account_id) REFERENCES reddit_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reddit_api_usage_account_endpoint ON public.reddit_api_usage USING btree (reddit_account_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_reddit_api_usage_lookup ON public.reddit_api_usage USING btree (reddit_account_id, endpoint_hash, window_start);
CREATE INDEX IF NOT EXISTS idx_reddit_api_usage_window ON public.reddit_api_usage USING btree (window_start, reset_at);

CREATE TABLE public.reddit_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reddit_account_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  post_id text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  title text NULL,
  url text NULL,
  selftext text NULL,
  score integer NULL DEFAULT 0,
  num_comments integer NULL DEFAULT 0,
  thumbnail text NULL,
  preview_url text NULL,
  CONSTRAINT reddit_posts_pkey PRIMARY KEY (id),
  CONSTRAINT reddit_posts_reddit_account_id_post_id_key UNIQUE (reddit_account_id, post_id),
  CONSTRAINT reddit_posts_reddit_account_id_fkey FOREIGN KEY (reddit_account_id) REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  CONSTRAINT reddit_posts_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE
);

CREATE TABLE public.saved_subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  last_post_at timestamp with time zone NULL,
  CONSTRAINT saved_subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT saved_subreddits_user_id_subreddit_id_key UNIQUE (user_id, subreddit_id),
  CONSTRAINT saved_subreddits_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE,
  CONSTRAINT saved_subreddits_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_saved_subreddits_subreddit_id ON public.saved_subreddits USING btree (subreddit_id);
CREATE INDEX IF NOT EXISTS idx_saved_subreddits_user_id ON public.saved_subreddits USING btree (user_id);

CREATE VIEW public.saved_subreddits_with_icons AS 
SELECT ss.id,
    ss.user_id,
    ss.subreddit_id,
    ss.created_at,
    ss.last_post_at,
    s.name,
    s.subscriber_count,
    s.active_users,
    s.marketing_friendly_score,
    s.allowed_content,
    s.icon_img,
    s.community_icon,
    s.analysis_data
FROM saved_subreddits ss
JOIN subreddits s ON ss.subreddit_id = s.id
WHERE ss.user_id = auth.uid();

CREATE TABLE public.stripe_prices (
  id text NOT NULL,
  active boolean NULL DEFAULT true,
  currency text NULL DEFAULT 'usd'::text,
  unit_amount integer NULL,
  type text NULL DEFAULT 'recurring'::text,
  recurring_interval text NULL DEFAULT 'month'::text,
  stripe_product_id text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT stripe_prices_pkey PRIMARY KEY (id),
  CONSTRAINT fk_stripe_product FOREIGN KEY (stripe_product_id) REFERENCES stripe_products(stripe_product_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_product_id ON public.stripe_prices USING btree (stripe_product_id);

CREATE TABLE public.stripe_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL,
  name text NOT NULL,
  description text NULL,
  active boolean NULL DEFAULT true,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT stripe_products_pkey PRIMARY KEY (id),
  CONSTRAINT stripe_products_stripe_product_id_key UNIQUE (stripe_product_id)
);

CREATE TABLE public.subreddit_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reddit_account_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  posted_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subreddit_posts_pkey PRIMARY KEY (id),
  CONSTRAINT subreddit_posts_reddit_account_id_fkey FOREIGN KEY (reddit_account_id) REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  CONSTRAINT subreddit_posts_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE
);

CREATE TABLE public.subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscriber_count integer NULL DEFAULT 0,
  active_users integer NULL DEFAULT 0,
  marketing_friendly_score integer NULL DEFAULT 0,
  posting_requirements jsonb NULL DEFAULT '{}'::jsonb,
  posting_frequency jsonb NULL DEFAULT '{}'::jsonb,
  allowed_content text[] NULL DEFAULT '{}'::text[],
  best_practices text[] NULL DEFAULT '{}'::text[],
  rules_summary text NULL,
  title_template text NULL,
  last_analyzed_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  icon_img text NULL,
  community_icon text NULL,
  total_posts_24h integer NULL DEFAULT 0,
  last_post_sync timestamp with time zone NULL DEFAULT now(),
  analysis_data jsonb NULL,
  CONSTRAINT subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT subreddits_name_key UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_subreddits_name ON public.subreddits USING btree (name);

CREATE TABLE public.subscription_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subscription_features_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_features_feature_key_key UNIQUE (feature_key)
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  status public.subscription_status NOT NULL,
  price_id text NULL,
  quantity integer NULL DEFAULT 1,
  cancel_at_period_end boolean NULL DEFAULT false,
  cancel_at timestamp with time zone NULL,
  canceled_at timestamp with time zone NULL,
  current_period_start timestamp with time zone NULL,
  current_period_end timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  ended_at timestamp with time zone NULL,
  trial_start timestamp with time zone NULL,
  trial_end timestamp with time zone NULL,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_price_id_fkey FOREIGN KEY (price_id) REFERENCES stripe_prices(id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_usage_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subreddit_analysis_count integer NULL DEFAULT 0,
  month_start timestamp with time zone NOT NULL,
  month_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  reddit_accounts_count integer NULL DEFAULT 0,
  CONSTRAINT user_usage_stats_pkey PRIMARY KEY (id),
  CONSTRAINT user_usage_stats_user_id_month_start_key UNIQUE (user_id, month_start),
  CONSTRAINT user_usage_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_month ON public.user_usage_stats USING btree (month_start, month_end);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON public.user_usage_stats USING btree (user_id);

-- RLS Policies
CREATE POLICY "Allow authenticated insert" ON public.customer_subscriptions FOR INSERT TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.customer_subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access" ON public.customer_subscriptions FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert" ON public.frequent_searches FOR INSERT TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.frequent_searches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access" ON public.frequent_searches FOR SELECT TO public USING (true);

-- Add similar policies for other tables as needed...

-- Note: Ensure to create RLS policies for all tables before being able to read or write to the table over Supabase APIs.