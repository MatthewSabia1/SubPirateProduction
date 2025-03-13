-- Migration to disable the special_role_subscription_trigger temporarily

SET ROLE postgres;
DROP TRIGGER IF EXISTS special_role_subscription_trigger ON public.profiles;
RESET ROLE; 