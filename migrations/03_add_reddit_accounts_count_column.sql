-- Add reddit_accounts_count column to user_usage_stats table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_usage_stats' 
    AND column_name = 'reddit_accounts_count'
  ) THEN
    ALTER TABLE user_usage_stats
    ADD COLUMN reddit_accounts_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update existing rows to set the count based on actual reddit accounts
UPDATE user_usage_stats uus
SET reddit_accounts_count = (
  SELECT COUNT(*) 
  FROM reddit_accounts ra 
  WHERE ra.user_id = uus.user_id
)
WHERE EXISTS (
  SELECT 1 
  FROM reddit_accounts ra 
  WHERE ra.user_id = uus.user_id
);

-- Verify the column was added and data was updated
SELECT 
  u.id, 
  u.reddit_accounts_count, 
  (SELECT COUNT(*) FROM reddit_accounts ra WHERE ra.user_id = u.user_id) AS actual_count
FROM user_usage_stats u
LIMIT 10; 