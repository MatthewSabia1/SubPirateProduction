-- Migration: Create subscription trigger on profiles table
-- This migration creates a trigger to automatically handle special subscription statuses for admin/gift users.

DROP TRIGGER IF EXISTS special_role_subscription_trigger ON public.profiles;

CREATE TRIGGER special_role_subscription_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_special_subscription_status(); 