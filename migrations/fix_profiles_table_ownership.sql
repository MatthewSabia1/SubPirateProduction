-- Migration to fix ownership of profiles table
-- This migration ensures that the profiles table is owned by postgres,
-- which is required for proper privilege granting during user signup.

ALTER TABLE public.profiles OWNER TO postgres; 