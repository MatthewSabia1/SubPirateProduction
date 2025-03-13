-- MIGRATION: Apply Row-Level Security policies to ensure users can only access their own data

-- First, we need to enable RLS on all relevant tables
ALTER TABLE public.saved_subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_subreddits
-- Users can only view, insert, update, or delete their own saved subreddits
CREATE POLICY "Users can view their own saved subreddits" 
ON public.saved_subreddits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved subreddits" 
ON public.saved_subreddits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved subreddits" 
ON public.saved_subreddits FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved subreddits" 
ON public.saved_subreddits FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for projects
-- Users can only view, insert, update, or delete their own projects
CREATE POLICY "Users can view their own projects" 
ON public.projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view projects they are a member of" 
ON public.projects FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.project_members WHERE project_id = id
  )
);

CREATE POLICY "Users can insert their own projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for project_members
-- Project owners can manage members
CREATE POLICY "Project members can view their project memberships" 
ON public.project_members FOR SELECT 
USING (
  auth.uid() = user_id OR 
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = NEW.project_id AND role = 'owner'
  )
);

CREATE POLICY "Project owners can insert new project members" 
ON public.project_members FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = NEW.project_id AND role = 'owner'
  )
);

CREATE POLICY "Project owners can update project members" 
ON public.project_members FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = NEW.project_id AND role = 'owner'
  )
);

CREATE POLICY "Project owners can delete project members" 
ON public.project_members FOR DELETE 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = OLD.project_id AND role = 'owner'
  )
);

-- Create policies for project_subreddits
-- Project owners and editors can manage the project's subreddits
CREATE POLICY "Project members can view their project subreddits" 
ON public.project_subreddits FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = project_id
  )
);

CREATE POLICY "Project owners and editors can insert project subreddits" 
ON public.project_subreddits FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = project_id AND role IN ('owner', 'edit')
  )
);

CREATE POLICY "Project owners and editors can update project subreddits" 
ON public.project_subreddits FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = project_id AND role IN ('owner', 'edit')
  )
);

CREATE POLICY "Project owners and editors can delete project subreddits" 
ON public.project_subreddits FOR DELETE 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.project_members 
    WHERE project_id = project_id AND role IN ('owner', 'edit')
  )
);

-- Create policies for reddit_accounts
-- Users can only view, insert, update, or delete their own reddit accounts
CREATE POLICY "Users can view their own reddit accounts" 
ON public.reddit_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reddit accounts" 
ON public.reddit_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reddit accounts" 
ON public.reddit_accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reddit accounts" 
ON public.reddit_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for reddit_posts
-- Users can only view reddit posts from their own reddit accounts
CREATE POLICY "Users can view reddit posts from their accounts" 
ON public.reddit_posts FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.reddit_accounts 
    WHERE id = reddit_account_id
  )
);

-- For saved_subreddits_with_icons view, we need to create a security definer function
-- that respects the RLS policies of saved_subreddits

-- Create a view for saved subreddits that respects RLS
CREATE OR REPLACE VIEW public.saved_subreddits_with_icons_rls AS
SELECT 
  ss.id,
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
FROM 
  saved_subreddits ss
JOIN 
  subreddits s ON ss.subreddit_id = s.id
WHERE 
  ss.user_id = auth.uid();

-- Drop the old view if it exists and replace with the new RLS-compliant one
DROP VIEW IF EXISTS public.saved_subreddits_with_icons;
ALTER VIEW public.saved_subreddits_with_icons_rls RENAME TO saved_subreddits_with_icons;