-- MIGRATION: Update existing views to be compatible with Row-Level Security

-- Add user_id filter to any existing views
-- This ensures that existing application code still works, but now enforces data isolation

-- Update saved_subreddits_with_icons view (already handled in the previous migration)

-- Create RLS-compliant views for any other views that might be missing user filtering
-- For example, if you have a project_details view:

-- Create a function to check if a user has access to a project
CREATE OR REPLACE FUNCTION public.user_has_project_access(project_uuid UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_uuid AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = project_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the get_project_role function to respect RLS
CREATE OR REPLACE FUNCTION public.get_project_role(project_uuid UUID)
RETURNS text AS $$
DECLARE
  role_name text;
BEGIN
  -- Check if user is owner
  SELECT 'owner' INTO role_name 
  FROM public.projects 
  WHERE id = project_uuid AND user_id = auth.uid();
  
  -- If not owner, check if member
  IF role_name IS NULL THEN
    SELECT role::text INTO role_name 
    FROM public.project_members 
    WHERE project_id = project_uuid AND user_id = auth.uid();
  END IF;
  
  RETURN role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all projects a user has access to
CREATE OR REPLACE FUNCTION public.get_accessible_projects()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for these functions to be executed by authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_project_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_projects TO authenticated; 