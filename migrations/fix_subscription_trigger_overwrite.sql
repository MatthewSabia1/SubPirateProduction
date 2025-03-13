-- Migration to overwrite the special_role_subscription_trigger function with improved error handling and SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.handle_special_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        -- If a user's role is changed to 'admin'
        IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
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
                'admin_subscription_' || NEW.id, -- unique subscription id
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
                'gift_subscription_' || NEW.id, -- unique subscription id
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
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating subscription for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS special_role_subscription_trigger ON public.profiles;
CREATE TRIGGER special_role_subscription_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_special_subscription_status(); 