// Script to fix test mode customer IDs in production
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Initialize Stripe with production key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateTestCustomer() {
  try {
    console.log('Starting test customer migration...');

    // 1. Get all customer subscriptions with test mode customer IDs
    const { data: subscriptions, error } = await supabase
      .from('customer_subscriptions')
      .select('*');

    if (error) {
      throw new Error(`Error fetching subscriptions: ${error.message}`);
    }

    console.log(`Found ${subscriptions.length} subscription(s) to check`);

    for (const subscription of subscriptions) {
      const testCustomerId = subscription.stripe_customer_id;
      
      // Try to find the customer in production mode
      try {
        console.log(`Checking if customer ${testCustomerId} exists in production...`);
        
        // This will throw an error if the customer doesn't exist in production
        await stripe.customers.retrieve(testCustomerId);
        console.log(`Customer ${testCustomerId} exists in production. No action needed.`);
        continue; // Skip to next subscription
      } catch (error) {
        // Customer doesn't exist in production
        console.log(`Customer ${testCustomerId} doesn't exist in production. Creating new customer...`);
        
        // Get the user details from the database
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', subscription.user_id)
          .single();
        
        if (userError) {
          console.error(`Error fetching user data for ${subscription.user_id}: ${userError.message}`);
          continue;
        }
        
        // Get user email from auth schema (correct way to access auth.users)
        const { data: authUser, error: authError } = await supabase
          .rpc('get_user_email', { user_id: subscription.user_id });
        
        // If RPC doesn't work, try direct query as fallback
        let userEmail = 'unknown@example.com';
        if (authError || !authUser) {
          console.log('Attempting alternate method to get user email...');
          
          // Try to access auth schema directly with service role
          const { data: directAuthUser, error: directAuthError } = await supabase.auth.admin.getUserById(
            subscription.user_id
          );
          
          if (directAuthError || !directAuthUser) {
            console.error(`Could not retrieve user email for ${subscription.user_id}. Using fallback.`);
          } else {
            userEmail = directAuthUser.user?.email || 'unknown@example.com';
          }
        } else {
          userEmail = authUser.email || 'unknown@example.com';
        }
        
        // Create a new customer in production
        const newCustomer = await stripe.customers.create({
          email: userEmail,
          name: userData?.display_name || 'Unknown User',
          metadata: {
            user_id: subscription.user_id
          }
        });
        
        console.log(`Created new production customer: ${newCustomer.id}`);
        
        // Update the subscription record with the new customer ID
        const { error: updateError } = await supabase
          .from('customer_subscriptions')
          .update({ 
            stripe_customer_id: newCustomer.id,
            // We need to nullify the subscription and price IDs since they're test mode
            stripe_subscription_id: null,
            stripe_price_id: null,
            // Mark as inactive until they resubscribe
            status: 'inactive'
          })
          .eq('id', subscription.id);
        
        if (updateError) {
          console.error(`Error updating subscription: ${updateError.message}`);
        } else {
          console.log(`Updated subscription record for user ${subscription.user_id}`);
        }
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Create a simpler solution - just update the customer ID 
// if we know which customer needs to be fixed
async function fixSpecificCustomer() {
  try {
    console.log('Fixing specific customer...');
    const userId = 'bc14941b-4cd0-4bc6-878a-da4006051880'; // Your user ID
    const testCustomerId = 'cus_Rpr5CFs6G0FIyG'; // The test mode customer ID

    // Get the subscription
    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError) {
      throw new Error(`Error fetching subscription: ${subError.message}`);
    }

    if (!subscription) {
      throw new Error(`No subscription found for user ${userId}`);
    }

    console.log('Current subscription status:', subscription.status);

    // Get user profile for name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(`Error fetching profile: ${profileError.message}`);
    }

    // Create a new customer in production
    const newCustomer = await stripe.customers.create({
      email: 'matt@example.com', // Replace with your actual email
      name: profile?.display_name || 'Matthew Sabia',
      metadata: {
        user_id: userId
      }
    });

    console.log(`Created new production customer: ${newCustomer.id}`);

    // Update the database record with a valid status
    // Use one of: active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid
    const { error: updateError } = await supabase
      .from('customer_subscriptions')
      .update({ 
        stripe_customer_id: newCustomer.id,
        // We need to nullify the subscription and price IDs since they're test mode
        stripe_subscription_id: null,
        stripe_price_id: null,
        status: 'canceled'  // Use a valid status from your enum
      })
      .eq('id', subscription.id);

    if (updateError) {
      throw new Error(`Error updating subscription: ${updateError.message}`);
    }

    console.log(`Successfully updated customer record for user ${userId}`);

    // Alternatively, just delete the subscription record entirely and let the user resubscribe
    if (false) { // Change to true if you prefer to delete instead of update
      const { error: deleteError } = await supabase
        .from('customer_subscriptions')
        .delete()
        .eq('id', subscription.id);
        
      if (deleteError) {
        console.error(`Error deleting subscription: ${deleteError.message}`);
      } else {
        console.log(`Deleted subscription record for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Failed to fix specific customer:', error);
  }
}

// Run the direct fix function
fixSpecificCustomer(); 