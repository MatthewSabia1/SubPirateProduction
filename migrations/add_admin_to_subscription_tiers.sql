-- Add the admin and gift tiers to the subscription_tier enumeration if it exists
DO $$
BEGIN
    -- Check if the enum type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        -- Add 'admin' to the enum if it doesn't exist already
        BEGIN
            ALTER TYPE subscription_tier ADD VALUE 'admin' AFTER 'agency';
        EXCEPTION
            WHEN duplicate_object THEN
                -- If it already exists, we can ignore this error
                RAISE NOTICE 'admin value already exists in subscription_tier enum';
        END;

        -- Add 'gift' to the enum if it doesn't exist already
        BEGIN
            ALTER TYPE subscription_tier ADD VALUE 'gift' AFTER 'admin';
        EXCEPTION
            WHEN duplicate_object THEN
                -- If it already exists, we can ignore this error
                RAISE NOTICE 'gift value already exists in subscription_tier enum';
        END;
    END IF;
END
$$;

-- Add a unique constraint on (user_id, stripe_subscription_id) if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'customer_subscriptions_user_id_subscription_id_key' 
          AND conrelid = 'public.customer_subscriptions'::regclass
    ) THEN
        -- Create the constraint
        ALTER TABLE public.customer_subscriptions 
        ADD CONSTRAINT customer_subscriptions_user_id_subscription_id_key 
        UNIQUE (user_id, stripe_subscription_id);
    END IF;
END
$$;

-- Create a trigger function that sets special users' subscription status automatically
CREATE OR REPLACE FUNCTION public.handle_special_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If a user's role is changed to 'admin'
    IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
        -- Insert a system-generated admin "subscription" record if one doesn't exist
        INSERT INTO public.customer_subscriptions (
            user_id, 
            status, 
            stripe_customer_id, 
            stripe_subscription_id, 
            stripe_price_id, 
            current_period_start, 
            current_period_end,
            cancel_at_period_end
        )
        VALUES (
            NEW.id, 
            'active', 
            'admin_' || NEW.id, 
            'admin_subscription', 
            'admin_price', 
            CURRENT_TIMESTAMP, 
            CURRENT_TIMESTAMP + INTERVAL '100 years',
            FALSE
        )
        ON CONFLICT (user_id, stripe_subscription_id) 
        DO UPDATE SET
            status = 'active',
            current_period_end = CURRENT_TIMESTAMP + INTERVAL '100 years',
            cancel_at_period_end = FALSE,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- If a user's role is changed to 'gift'
    IF NEW.role = 'gift' AND (OLD.role IS NULL OR OLD.role != 'gift') THEN
        -- Insert a system-generated gift "subscription" record if one doesn't exist
        INSERT INTO public.customer_subscriptions (
            user_id, 
            status, 
            stripe_customer_id, 
            stripe_subscription_id, 
            stripe_price_id, 
            current_period_start, 
            current_period_end,
            cancel_at_period_end
        )
        VALUES (
            NEW.id, 
            'active', 
            'gift_' || NEW.id, 
            'gift_subscription', 
            'gift_price', 
            CURRENT_TIMESTAMP, 
            CURRENT_TIMESTAMP + INTERVAL '100 years',
            FALSE
        )
        ON CONFLICT (user_id, stripe_subscription_id) 
        DO UPDATE SET
            status = 'active',
            current_period_end = CURRENT_TIMESTAMP + INTERVAL '100 years',
            cancel_at_period_end = FALSE,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS admin_subscription_trigger ON public.profiles;
CREATE TRIGGER special_role_subscription_trigger
AFTER UPDATE OR INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_special_subscription_status();

-- Update existing admin and gift users to ensure they have subscription records
DO $$
DECLARE
    special_user RECORD;
BEGIN
    -- Process admin users
    FOR special_user IN 
        SELECT id, role FROM public.profiles WHERE role IN ('admin', 'gift')
    LOOP
        -- Set variables based on role
        DECLARE
            subscription_id TEXT;
            customer_id TEXT;
            price_id TEXT;
        BEGIN
            IF special_user.role = 'admin' THEN
                subscription_id := 'admin_subscription';
                customer_id := 'admin_' || special_user.id;
                price_id := 'admin_price';
            ELSE -- gift role
                subscription_id := 'gift_subscription';
                customer_id := 'gift_' || special_user.id;
                price_id := 'gift_price';
            END IF;
            
            -- Check if a subscription exists for this user
            IF NOT EXISTS (
                SELECT 1 
                FROM public.customer_subscriptions
                WHERE user_id = special_user.id
                AND stripe_subscription_id = subscription_id
            ) THEN
                -- Insert subscription if it doesn't exist
                INSERT INTO public.customer_subscriptions (
                    user_id, 
                    status, 
                    stripe_customer_id, 
                    stripe_subscription_id, 
                    stripe_price_id, 
                    current_period_start, 
                    current_period_end,
                    cancel_at_period_end
                )
                VALUES (
                    special_user.id, 
                    'active', 
                    customer_id, 
                    subscription_id, 
                    price_id, 
                    CURRENT_TIMESTAMP, 
                    CURRENT_TIMESTAMP + INTERVAL '100 years',
                    FALSE
                );
            ELSE
                -- Update existing subscription
                UPDATE public.customer_subscriptions
                SET 
                    status = 'active',
                    current_period_end = CURRENT_TIMESTAMP + INTERVAL '100 years',
                    cancel_at_period_end = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE 
                    user_id = special_user.id
                    AND stripe_subscription_id = subscription_id;
            END IF;
        END;
    END LOOP;
END;
$$; 