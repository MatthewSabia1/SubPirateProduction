-- Temporary Migration: Disable subscription trigger on profiles table
-- This migration disables the trigger that creates subscriptions for admin/gift users.

ALTER TABLE public.profiles DISABLE TRIGGER special_role_subscription_trigger;

-- To re-enable the trigger later, run:
-- ALTER TABLE public.profiles ENABLE TRIGGER special_role_subscription_trigger; 