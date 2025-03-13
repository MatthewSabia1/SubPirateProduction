-- Create a function to update the reddit_accounts_count in user_usage_stats
CREATE OR REPLACE FUNCTION update_reddit_accounts_count()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
BEGIN
  -- Handle both insert and delete operations
  IF TG_OP = 'INSERT' THEN
    user_id_val := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    user_id_val := OLD.user_id;
  END IF;

  -- Update the user_usage_stats table with the current count
  UPDATE user_usage_stats
  SET 
    reddit_accounts_count = (
      SELECT COUNT(*) 
      FROM reddit_accounts 
      WHERE user_id = user_id_val
    ),
    updated_at = NOW()
  WHERE user_id = user_id_val;
  
  -- Insert a record if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_usage_stats (
      id,
      user_id,
      reddit_accounts_count,
      subreddit_analysis_count,
      created_at,
      updated_at
    )
    VALUES (
      uuid_generate_v4(),
      user_id_val,
      (SELECT COUNT(*) FROM reddit_accounts WHERE user_id = user_id_val),
      0,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_reddit_accounts_count_on_insert ON reddit_accounts;
DROP TRIGGER IF EXISTS update_reddit_accounts_count_on_delete ON reddit_accounts;

-- Create triggers for insert and delete operations
CREATE TRIGGER update_reddit_accounts_count_on_insert
AFTER INSERT ON reddit_accounts
FOR EACH ROW
EXECUTE FUNCTION update_reddit_accounts_count();

CREATE TRIGGER update_reddit_accounts_count_on_delete
AFTER DELETE ON reddit_accounts
FOR EACH ROW
EXECUTE FUNCTION update_reddit_accounts_count();

-- Output a message to confirm trigger creation
SELECT 'Reddit accounts triggers created successfully' AS message; 