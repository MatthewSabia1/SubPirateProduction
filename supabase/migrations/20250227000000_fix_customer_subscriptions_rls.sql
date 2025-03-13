-- Fix Customer Subscriptions Access
-- This migration adds proper Row Level Security policies to customer_subscriptions and profiles tables

-- Enable RLS on customer_subscriptions table if not already enabled
ALTER TABLE IF EXISTS "public"."customer_subscriptions" ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own subscription data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'customer_subscriptions' 
        AND policyname = 'Users can view their own subscriptions'
    ) THEN
        CREATE POLICY "Users can view their own subscriptions" 
        ON "public"."customer_subscriptions"
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create policy for users to insert their own subscription data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'customer_subscriptions' 
        AND policyname = 'Users can insert their own subscriptions'
    ) THEN
        CREATE POLICY "Users can insert their own subscriptions" 
        ON "public"."customer_subscriptions"
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Create policy for users to update their own subscription data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'customer_subscriptions' 
        AND policyname = 'Users can update their own subscriptions'
    ) THEN
        CREATE POLICY "Users can update their own subscriptions" 
        ON "public"."customer_subscriptions"
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Create policy for users to delete their own subscription data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'customer_subscriptions' 
        AND policyname = 'Users can delete their own subscriptions'
    ) THEN
        CREATE POLICY "Users can delete their own subscriptions" 
        ON "public"."customer_subscriptions"
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Enable RLS on profiles table if not already enabled
ALTER TABLE IF EXISTS "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" 
        ON "public"."profiles"
        FOR SELECT
        TO authenticated
        USING (auth.uid() = id);
    END IF;
END
$$;

-- Create policy for users to update their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON "public"."profiles"
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

-- Service role access for webhooks and background processes
-- Allow service role (used by webhooks) to bypass RLS 
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'customer_subscriptions' 
        AND policyname = 'Service role full access to subscriptions'
    ) THEN
        CREATE POLICY "Service role full access to subscriptions" 
        ON "public"."customer_subscriptions"
        FOR ALL
        TO service_role
        USING (true);
    END IF;
END
$$;

-- Allow service role full access to profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Service role full access to profiles'
    ) THEN
        CREATE POLICY "Service role full access to profiles" 
        ON "public"."profiles"
        FOR ALL
        TO service_role
        USING (true);
    END IF;
END
$$;

-- Enable RLS on stripe_prices table if not already enabled
ALTER TABLE IF EXISTS "public"."stripe_prices" ENABLE ROW LEVEL SECURITY;

-- Create policy for all users to view stripe_prices (pricing is public information)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'stripe_prices' 
        AND policyname = 'Everyone can view prices'
    ) THEN
        CREATE POLICY "Everyone can view prices" 
        ON "public"."stripe_prices"
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;

-- Enable RLS on stripe_products table if not already enabled
ALTER TABLE IF EXISTS "public"."stripe_products" ENABLE ROW LEVEL SECURITY;

-- Create policy for all users to view stripe_products (product info is public)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'stripe_products' 
        AND policyname = 'Everyone can view products'
    ) THEN
        CREATE POLICY "Everyone can view products" 
        ON "public"."stripe_products"
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;

-- Allow service role full access to stripe_prices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'stripe_prices' 
        AND policyname = 'Service role full access to prices'
    ) THEN
        CREATE POLICY "Service role full access to prices" 
        ON "public"."stripe_prices"
        FOR ALL
        TO service_role
        USING (true);
    END IF;
END
$$;

-- Allow service role full access to stripe_products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'stripe_products' 
        AND policyname = 'Service role full access to products'
    ) THEN
        CREATE POLICY "Service role full access to products" 
        ON "public"."stripe_products"
        FOR ALL
        TO service_role
        USING (true);
    END IF;
END
$$; 