-- Create profiles table if it doesn't exist already
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NULL,
  email text NULL,
  image_url text NULL,
  stripe_customer_id text NULL,
  full_name text NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Create trigger function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  
-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user IS 'Creates a public.profiles record when a new user signs up';

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant all privileges on all tables in the public schema to specific roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;

-- Grant all privileges on all functions in the public schema
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Grant all privileges on all sequences in the public schema
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Alter default privileges for users to create tables
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, service_role IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;

-- Alter default privileges for users to create functions
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, service_role IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;

-- Alter default privileges for users to create sequences
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, service_role IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role; 