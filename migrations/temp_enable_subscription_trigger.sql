-- Temporary Migration: Re-enable subscription trigger on profiles table
-- This migration re-enables the trigger that creates subscriptions for admin/gift users, so we can observe debug logs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'special_role_subscription_trigger'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ENABLE TRIGGER special_role_subscription_trigger;
  END IF;
END $$;

-- After debugging, you can disable this again by running:
-- ALTER TABLE public.profiles DISABLE TRIGGER special_role_subscription_trigger; 