-- Migration: Add INSTEAD OF DELETE trigger for saved_subreddits_with_icons view
-- This allows deleting from the view by properly directing the deletion to the saved_subreddits table

-- Add an INSTEAD OF DELETE trigger to the saved_subreddits_with_icons view
CREATE OR REPLACE FUNCTION delete_from_saved_subreddits_with_icons()
RETURNS TRIGGER AS $$
BEGIN
  -- Only delete from the saved_subreddits table
  -- This maintains referential integrity while allowing view deletions
  DELETE FROM saved_subreddits 
  WHERE id = OLD.id AND user_id = auth.uid();
  
  -- Return OLD as per trigger function requirements
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists (for idempotency)
DROP TRIGGER IF EXISTS delete_from_saved_subreddits_with_icons_trigger 
ON saved_subreddits_with_icons;

-- Create the INSTEAD OF DELETE trigger
CREATE TRIGGER delete_from_saved_subreddits_with_icons_trigger
INSTEAD OF DELETE ON saved_subreddits_with_icons
FOR EACH ROW
EXECUTE FUNCTION delete_from_saved_subreddits_with_icons();

-- Add a helpful comment
COMMENT ON TRIGGER delete_from_saved_subreddits_with_icons_trigger 
ON saved_subreddits_with_icons 
IS 'Redirects DELETE operations on the view to the saved_subreddits table while respecting RLS'; 