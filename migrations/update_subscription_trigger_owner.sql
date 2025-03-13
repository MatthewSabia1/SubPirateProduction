-- Migration to update owner for trigger function and customer_subscriptions table

-- Change the owner of the trigger function to service_role
ALTER FUNCTION public.handle_special_subscription_status() OWNER TO service_role;

-- Optionally, also change the owner of the customer_subscriptions table to service_role to ensure consistency with RLS policies
ALTER TABLE public.customer_subscriptions OWNER TO service_role; 