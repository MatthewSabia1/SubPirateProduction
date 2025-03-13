-- Fix for "Database error granting user" issue
-- This migration improves error handling in the special subscription trigger function

-- Update the handle_special_subscription_status function to handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_special_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'In handle_special_subscription_status: TG_OP=%; current_user=%; NEW.id=%', TG_OP, current_user, NEW.id;
    BEGIN
        IF TG_OP = 'UPDATE' THEN
            IF NEW.role = 'admin' AND (OLD.role IS DISTINCT FROM 'admin') THEN
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
                    'admin_subscription_' || NEW.id,
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
            ELSIF NEW.role = 'gift' AND (OLD.role IS DISTINCT FROM 'gift') THEN
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
                    'gift_subscription_' || NEW.id,
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
        ELSIF TG_OP = 'INSERT' THEN
            IF NEW.role = 'admin' THEN
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
                    'admin_subscription_' || NEW.id,
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
            ELSIF NEW.role = 'gift' THEN
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
                    'gift_subscription_' || NEW.id,
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
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating subscription for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Unexpected error in handle_special_subscription_status: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS policy exists for the service role to access customer_subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'customer_subscriptions' 
        AND policyname = 'Service role full access to subscriptions'
    ) THEN
        CREATE POLICY "Service role full access to subscriptions" 
        ON public.customer_subscriptions
        FOR ALL
        TO service_role
        USING (true);
    END IF;
END
$$;

-- Fix any broken subscriptions from previous attempts
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find admin users without subscriptions
    FOR user_record IN 
        SELECT p.id 
        FROM profiles p
        LEFT JOIN customer_subscriptions cs ON p.id = cs.user_id
        WHERE p.role = 'admin' AND cs.id IS NULL
    LOOP
        -- Create missing admin subscription
        BEGIN
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
                user_record.id, 
                'active', 
                'admin_' || user_record.id, 
                'admin_subscription_' || user_record.id,
                'admin_price', 
                CURRENT_TIMESTAMP, 
                CURRENT_TIMESTAMP + INTERVAL '100 years',
                FALSE
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error fixing admin subscription for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Find gift users without subscriptions
    FOR user_record IN 
        SELECT p.id 
        FROM profiles p
        LEFT JOIN customer_subscriptions cs ON p.id = cs.user_id
        WHERE p.role = 'gift' AND cs.id IS NULL
    LOOP
        -- Create missing gift subscription
        BEGIN
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
                user_record.id, 
                'active', 
                'gift_' || user_record.id, 
                'gift_subscription_' || user_record.id,
                'gift_price', 
                CURRENT_TIMESTAMP, 
                CURRENT_TIMESTAMP + INTERVAL '100 years',
                FALSE
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error fixing gift subscription for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
END
$$; 