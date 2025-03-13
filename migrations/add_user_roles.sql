-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;

-- Create an index on the role column for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.role IS 'User role: user (default), admin, or gift. Controls access privileges.';

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin IS 'Checks if a user has admin role';

-- Create a function to check if a user has a gift account
CREATE OR REPLACE FUNCTION public.is_gift_user(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'gift'
  );
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_gift_user IS 'Checks if a user has a gift account';

-- Create helper function to set a user role
CREATE OR REPLACE FUNCTION public.set_user_role(user_id UUID, new_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate the role value
  IF new_role NOT IN ('user', 'admin', 'gift') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be "user", "admin", or "gift"', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = user_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.set_user_role IS 'Sets a user role (user, admin, or gift)';

-- Grant access to these functions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gift_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role TO authenticated;

-- Update RLS policies for admin access
-- (Note: This assumes you're using RLS in your Supabase project) 