-- Add the reddit_accounts feature to the subscription_features table
INSERT INTO subscription_features (
  id, 
  feature_key, 
  name, 
  description, 
  created_at, 
  updated_at
) 
VALUES (
  uuid_generate_v4(), 
  'reddit_accounts', 
  'Reddit Accounts', 
  'Connect multiple Reddit accounts to access expanded API limits and post scheduling', 
  NOW(), 
  NOW()
);

-- Output the newly created feature to verify
SELECT * FROM subscription_features WHERE feature_key = 'reddit_accounts'; 