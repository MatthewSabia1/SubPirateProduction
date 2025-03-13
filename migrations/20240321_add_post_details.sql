-- Add post details columns to reddit_posts table
ALTER TABLE reddit_posts
ADD COLUMN title text,
ADD COLUMN url text,
ADD COLUMN selftext text,
ADD COLUMN score integer DEFAULT 0,
ADD COLUMN num_comments integer DEFAULT 0,
ADD COLUMN thumbnail text,
ADD COLUMN preview_url text; 