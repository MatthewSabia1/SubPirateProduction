-- Add user_id column to frequent_searches table
ALTER TABLE public.frequent_searches 
  ADD COLUMN user_id UUID REFERENCES auth.users(id) NULL;

-- Drop the unique constraint on username which doesn't make sense anymore
-- since different users can search for the same username
ALTER TABLE public.frequent_searches
  DROP CONSTRAINT IF EXISTS unique_username;

-- Add a new composite unique constraint on username + user_id
ALTER TABLE public.frequent_searches
  ADD CONSTRAINT unique_username_per_user UNIQUE (username, user_id);

-- Create or replace the increment_search_count function to work with user_id
CREATE OR REPLACE FUNCTION public.increment_search_count(
  p_username TEXT,
  p_avatar_url TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insert or update the search record
  INSERT INTO public.frequent_searches (username, avatar_url, user_id, search_count, last_searched_at)
  VALUES (p_username, p_avatar_url, p_user_id, 1, NOW())
  ON CONFLICT (username, user_id) DO UPDATE SET
    search_count = frequent_searches.search_count + 1,
    last_searched_at = NOW(),
    avatar_url = COALESCE(p_avatar_url, frequent_searches.avatar_url);
END;
$$ LANGUAGE plpgsql; 