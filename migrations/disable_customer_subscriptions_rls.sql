-- Migration to temporarily disable row-level security on the customer_subscriptions table

ALTER TABLE public.customer_subscriptions DISABLE ROW LEVEL SECURITY; 