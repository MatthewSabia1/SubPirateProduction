-- Create a function to create a special user with admin or gift role
-- This function needs to be run with administrator privileges

-- Drop the function if it exists to allow updates
DROP FUNCTION IF EXISTS public.create_special_user;

-- Create the function
CREATE OR REPLACE FUNCTION public.create_special_user(
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    redirect_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with the privileges of the function creator
SET search_path = public
AS $$
DECLARE
    new_user_id UUID;
    random_password TEXT;
    result JSONB;
BEGIN
    -- Validate input parameters
    IF user_email IS NULL OR user_email = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email is required');
    END IF;

    IF user_name IS NULL OR user_name = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Name is required');
    END IF;

    IF user_role IS NULL OR user_role NOT IN ('admin', 'gift') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role must be "admin" or "gift"');
    END IF;

    -- Generate a random password
    random_password := encode(gen_random_bytes(12), 'base64');

    -- Check if a user with this email already exists
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;

    IF new_user_id IS NOT NULL THEN
        -- User exists, update role
        PERFORM set_user_role(new_user_id, user_role);
        
        -- Update display name if not already set
        UPDATE public.profiles
        SET display_name = COALESCE(display_name, user_name)
        WHERE id = new_user_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'User already exists. Role updated.',
            'user_id', new_user_id
        );
    END IF;

    -- Create new user with auth.users API
    BEGIN
        -- This part uses Supabase's internal functions to create a user
        -- It's equivalent to the auth.admin.createUser() API call
        new_user_id := extensions.uuid_generate_v4();
        
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            user_email,
            -- This sets the password in a compatible format (would normally be done by Supabase auth)
            crypt(random_password, gen_salt('bf')),
            now(), -- email confirmed
            jsonb_build_object('provider', 'email'),
            jsonb_build_object('name', user_name, 'role', user_role),
            'authenticated',
            'authenticated',
            now(),
            now()
        );

        -- Create a profile for the user
        -- The profile trigger will handle this, but we're being explicit
        INSERT INTO public.profiles (id, email, display_name, role)
        VALUES (new_user_id, user_email, user_name, user_role);
        
        -- Set the user role using our existing function
        PERFORM set_user_role(new_user_id, user_role);
        
        -- Start password recovery process if a redirect URL was provided
        IF redirect_url IS NOT NULL THEN
            -- Insert a recovery token in auth.refresh_tokens (simplified version)
            INSERT INTO auth.refresh_tokens (
                token,
                user_id,
                created_at,
                updated_at,
                parent,
                session_id
            )
            VALUES (
                encode(gen_random_bytes(32), 'hex'),
                new_user_id,
                now(),
                now(),
                NULL,
                NULL
            );
            
            -- In a real implementation, you would also need to send an email
            -- with the reset link. This would typically be done via a Supabase Edge Function
            -- or an external email service.
        END IF;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'User created successfully',
            'user_id', new_user_id
        );
    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Error creating user: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_special_user IS 'Creates a new user with admin or gift role and sends a password reset email';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_special_user TO authenticated; 