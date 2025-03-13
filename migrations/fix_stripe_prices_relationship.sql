-- Fix the relationship between stripe_prices and stripe_products tables

-- First, rename the product_id column to stripe_product_id to match the schema definition
ALTER TABLE IF EXISTS stripe_prices 
RENAME COLUMN product_id TO stripe_product_id;

-- Ensure the stripe_product_id column is properly typed
ALTER TABLE IF EXISTS stripe_prices 
ALTER COLUMN stripe_product_id TYPE text;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_stripe_product' AND table_name = 'stripe_prices'
  ) THEN
    ALTER TABLE stripe_prices
    ADD CONSTRAINT fk_stripe_product
    FOREIGN KEY (stripe_product_id)
    REFERENCES stripe_products(stripe_product_id)
    ON DELETE CASCADE;
  END IF;
END
$$;

-- Ensure there's an index on stripe_product_id for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_prices_product_id ON stripe_prices(stripe_product_id); 