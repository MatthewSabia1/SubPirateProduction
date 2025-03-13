-- Map the reddit_accounts feature to each subscription tier
WITH products AS (
  SELECT id, name, stripe_product_id 
  FROM stripe_products 
  WHERE name IN ('Starter', 'Creator', 'Pro', 'Agency')
)
INSERT INTO product_features (
  id, 
  stripe_product_id, 
  feature_key, 
  enabled, 
  created_at
)
SELECT 
  uuid_generate_v4(), 
  p.stripe_product_id, 
  'reddit_accounts', 
  TRUE, 
  NOW()
FROM products p;

-- Verify that the mappings were created correctly
SELECT 
  pf.id, 
  sp.name AS product_name, 
  pf.feature_key, 
  pf.enabled 
FROM product_features pf
JOIN stripe_products sp ON pf.stripe_product_id = sp.stripe_product_id
WHERE pf.feature_key = 'reddit_accounts'; 