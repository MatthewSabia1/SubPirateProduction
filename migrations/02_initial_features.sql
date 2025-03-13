-- Insert core features
INSERT INTO subscription_features (feature_key, name, description) VALUES
  (
    'analyze_subreddit',
    'Subreddit Analysis',
    'Access to detailed subreddit analysis including marketing friendliness scores, posting requirements, and best practices'
  ),
  (
    'create_project',
    'Project Creation',
    'Create and manage marketing projects to organize your subreddit targets'
  ),
  (
    'advanced_analytics',
    'Advanced Analytics',
    'Access to advanced analytics including engagement metrics, trend analysis, and detailed reporting'
  ),
  (
    'export_data',
    'Data Export',
    'Export analysis data and reports in various formats'
  ),
  (
    'team_collaboration',
    'Team Collaboration',
    'Invite team members and collaborate on projects'
  ),
  (
    'custom_tracking',
    'Custom Tracking',
    'Set up custom tracking metrics and alerts for your subreddits'
  );

-- Create initial Stripe products
INSERT INTO stripe_products (stripe_product_id, name, description, active) VALUES
  (
    'prod_starter',
    'Starter',
    'Essential features for getting started with Reddit marketing',
    true
  ),
  (
    'prod_creator',
    'Creator',
    'Perfect for content creators and growing brands',
    true
  ),
  (
    'prod_pro',
    'Pro',
    'Advanced features for professional marketers',
    true
  ),
  (
    'prod_agency',
    'Agency',
    'Full platform access for marketing teams and agencies',
    true
  );

-- Create initial prices (monthly billing)
INSERT INTO stripe_prices (
  stripe_price_id,
  stripe_product_id,
  currency,
  unit_amount,
  recurring_interval,
  recurring_interval_count,
  active
) VALUES
  (
    'price_starter_monthly',
    'prod_starter',
    'usd',
    1900, -- $19/month
    'month',
    1,
    true
  ),
  (
    'price_creator_monthly',
    'prod_creator',
    'usd',
    3400, -- $34/month
    'month',
    1,
    true
  ),
  (
    'price_pro_monthly',
    'prod_pro',
    'usd',
    4900, -- $49/month
    'month',
    1,
    true
  ),
  (
    'price_agency_monthly',
    'prod_agency',
    'usd',
    9700, -- $97/month
    'month',
    1,
    true
  );

-- Map features to products (all features enabled for all tiers)
-- Starter tier features
INSERT INTO product_features (stripe_product_id, feature_key, enabled) VALUES
  ('prod_starter', 'analyze_subreddit', true),
  ('prod_starter', 'create_project', true),
  ('prod_starter', 'advanced_analytics', true),
  ('prod_starter', 'export_data', true),
  ('prod_starter', 'team_collaboration', true),
  ('prod_starter', 'custom_tracking', true);

-- Creator tier features
INSERT INTO product_features (stripe_product_id, feature_key, enabled) VALUES
  ('prod_creator', 'analyze_subreddit', true),
  ('prod_creator', 'create_project', true),
  ('prod_creator', 'advanced_analytics', true),
  ('prod_creator', 'export_data', true),
  ('prod_creator', 'team_collaboration', true),
  ('prod_creator', 'custom_tracking', true);

-- Pro tier features
INSERT INTO product_features (stripe_product_id, feature_key, enabled) VALUES
  ('prod_pro', 'analyze_subreddit', true),
  ('prod_pro', 'create_project', true),
  ('prod_pro', 'advanced_analytics', true),
  ('prod_pro', 'export_data', true),
  ('prod_pro', 'team_collaboration', true),
  ('prod_pro', 'custom_tracking', true);

-- Agency tier features
INSERT INTO product_features (stripe_product_id, feature_key, enabled) VALUES
  ('prod_agency', 'analyze_subreddit', true),
  ('prod_agency', 'create_project', true),
  ('prod_agency', 'advanced_analytics', true),
  ('prod_agency', 'export_data', true),
  ('prod_agency', 'team_collaboration', true),
  ('prod_agency', 'custom_tracking', true); 