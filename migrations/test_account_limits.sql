-- Reddit Account Limits Testing Script
-- This script tests the database changes made for Reddit account limits

-- 1. Verify the reddit_accounts feature exists
SELECT * FROM subscription_features WHERE feature_key = 'reddit_accounts';

-- 2. Verify feature is mapped to all subscription tiers
SELECT 
  sp.name AS product_name,
  sf.name AS feature_name,
  sf.description,
  pf.enabled
FROM product_features pf
JOIN stripe_products sp ON pf.stripe_product_id = sp.stripe_product_id
JOIN subscription_features sf ON pf.feature_key = sf.feature_key
WHERE sf.feature_key = 'reddit_accounts'
ORDER BY sp.name;

-- 3. Verify the reddit_accounts_count column exists
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'user_usage_stats' 
AND column_name = 'reddit_accounts_count';

-- 4. Verify trigger function exists
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name = 'update_reddit_accounts_count'
AND routine_schema = 'public';

-- 5. Verify triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE 'update_reddit_accounts_count%'
AND event_object_table = 'reddit_accounts'
ORDER BY trigger_name;

-- 6. Test trigger functionality with a mock user
-- First create a test UUID to use for our test
DO $$
DECLARE
  test_user_id UUID := '11111111-1111-1111-1111-111111111111';
  test_account_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Clean up any previous test data
  DELETE FROM reddit_accounts WHERE user_id = test_user_id;
  DELETE FROM user_usage_stats WHERE user_id = test_user_id;
  
  -- Insert a test account and verify count increments
  INSERT INTO reddit_accounts (
    id, 
    user_id, 
    username, 
    refresh_token, 
    created_at, 
    updated_at
  ) VALUES (
    test_account_id,
    test_user_id,
    'test_username',
    'test_refresh_token',
    NOW(),
    NOW()
  );
  
  -- Check that user_usage_stats record was created with count=1
  RAISE NOTICE 'After inserting account:';
  SELECT reddit_accounts_count FROM user_usage_stats WHERE user_id = test_user_id;
  
  -- Add another account and verify count increments
  INSERT INTO reddit_accounts (
    id, 
    user_id, 
    username, 
    refresh_token, 
    created_at, 
    updated_at
  ) VALUES (
    uuid_generate_v4(),
    test_user_id,
    'test_username2',
    'test_refresh_token2',
    NOW(),
    NOW()
  );
  
  -- Check that count was updated to 2
  RAISE NOTICE 'After inserting second account:';
  SELECT reddit_accounts_count FROM user_usage_stats WHERE user_id = test_user_id;
  
  -- Delete one account and verify count decrements
  DELETE FROM reddit_accounts WHERE id = test_account_id;
  
  -- Check that count was updated to 1
  RAISE NOTICE 'After deleting first account:';
  SELECT reddit_accounts_count FROM user_usage_stats WHERE user_id = test_user_id;
  
  -- Clean up
  DELETE FROM reddit_accounts WHERE user_id = test_user_id;
  DELETE FROM user_usage_stats WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Test completed, all test data cleaned up';
END $$;

-- 7. Verify account limits for each subscription tier from the code
SELECT 
  s.user_id,
  cs.stripe_price_id,
  sp.name AS subscription_tier,
  (
    SELECT COUNT(*) 
    FROM reddit_accounts ra 
    WHERE ra.user_id = s.user_id
  ) AS current_account_count,
  CASE 
    WHEN sp.name = 'Free' THEN 1
    WHEN sp.name = 'Starter' THEN 3
    WHEN sp.name = 'Creator' THEN 10
    WHEN sp.name = 'Pro' THEN 25
    WHEN sp.name = 'Agency' THEN 100
    WHEN sp.name IN ('Admin', 'Gift') THEN 9999
    ELSE 0
  END AS account_limit,
  CASE 
    WHEN sp.name = 'Free' AND (SELECT COUNT(*) FROM reddit_accounts ra WHERE ra.user_id = s.user_id) >= 1 THEN 'LIMIT REACHED'
    WHEN sp.name = 'Starter' AND (SELECT COUNT(*) FROM reddit_accounts ra WHERE ra.user_id = s.user_id) >= 3 THEN 'LIMIT REACHED'
    WHEN sp.name = 'Creator' AND (SELECT COUNT(*) FROM reddit_accounts ra WHERE ra.user_id = s.user_id) >= 10 THEN 'LIMIT REACHED'
    WHEN sp.name = 'Pro' AND (SELECT COUNT(*) FROM reddit_accounts ra WHERE ra.user_id = s.user_id) >= 25 THEN 'LIMIT REACHED'
    WHEN sp.name = 'Agency' AND (SELECT COUNT(*) FROM reddit_accounts ra WHERE ra.user_id = s.user_id) >= 100 THEN 'LIMIT REACHED'
    ELSE 'CAN ADD MORE'
  END AS limit_status
FROM user_usage_stats s
JOIN customer_subscriptions cs ON s.user_id = cs.user_id
JOIN stripe_prices sp_price ON cs.stripe_price_id = sp_price.stripe_price_id
JOIN stripe_products sp ON sp_price.stripe_product_id = sp.stripe_product_id
WHERE cs.status = 'active'
LIMIT 20; 