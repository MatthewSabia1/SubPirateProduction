-- Drop existing subscription-related tables
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS subscription_tiers;
DROP TYPE IF EXISTS subscription_status;

-- Create subscription status type
CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'unpaid',
  'paused'
);

-- Feature definitions
CREATE TABLE subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stripe products sync
CREATE TABLE stripe_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stripe prices sync
CREATE TABLE stripe_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id text NOT NULL UNIQUE,
  stripe_product_id text NOT NULL,
  currency text NOT NULL,
  unit_amount integer NOT NULL,
  recurring_interval text,
  recurring_interval_count integer,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_stripe_product
    FOREIGN KEY (stripe_product_id)
    REFERENCES stripe_products(stripe_product_id)
    ON DELETE CASCADE
);

-- Product feature mapping
CREATE TABLE product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL,
  feature_key text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_stripe_product
    FOREIGN KEY (stripe_product_id)
    REFERENCES stripe_products(stripe_product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_feature
    FOREIGN KEY (feature_key)
    REFERENCES subscription_features(feature_key)
    ON DELETE CASCADE,
  CONSTRAINT unique_product_feature
    UNIQUE (stripe_product_id, feature_key)
);

-- Customer subscriptions
CREATE TABLE customer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status subscription_status NOT NULL,
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_stripe_price
    FOREIGN KEY (stripe_price_id)
    REFERENCES stripe_prices(stripe_price_id)
    ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Subscription features viewable by all authenticated users
CREATE POLICY "Authenticated users can view features" ON subscription_features
  FOR SELECT TO authenticated USING (true);

-- Products viewable by all authenticated users
CREATE POLICY "Authenticated users can view products" ON stripe_products
  FOR SELECT TO authenticated USING (true);

-- Prices viewable by all authenticated users
CREATE POLICY "Authenticated users can view prices" ON stripe_prices
  FOR SELECT TO authenticated USING (true);

-- Product features viewable by all authenticated users
CREATE POLICY "Authenticated users can view product features" ON product_features
  FOR SELECT TO authenticated USING (true);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON customer_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_features_updated_at
    BEFORE UPDATE ON subscription_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_products_updated_at
    BEFORE UPDATE ON stripe_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_prices_updated_at
    BEFORE UPDATE ON stripe_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at
    BEFORE UPDATE ON customer_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 