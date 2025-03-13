import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
);

// Replace with the user's ID
const USER_ID = 'bc14941b-4cd0-4bc6-878a-da4006051880';

async function createTestSubscription() {
  try {
    console.log(`Creating test subscription for user ${USER_ID}`);
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', USER_ID)
      .single();
    
    if (userError || !user) {
      console.error('User not found:', userError);
      return;
    }
    
    console.log('User found:', user);
    
    // Create fake subscription
    const subscriptionData = {
      user_id: USER_ID,
      stripe_customer_id: 'cus_testMock' + Date.now(),
      stripe_subscription_id: 'sub_testMock' + Date.now(),
      stripe_price_id: 'price_testMock',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // First check if a subscription already exists
    const { data: existingSubscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', USER_ID)
      .maybeSingle();
    
    if (existingSubscription) {
      console.log('Existing subscription found, updating...');
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .update(subscriptionData)
        .eq('user_id', USER_ID);
      
      if (error) {
        console.error('Error updating subscription:', error);
        return;
      }
      
      console.log('Subscription updated successfully!');
    } else {
      console.log('No existing subscription, creating new one...');
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .insert(subscriptionData);
      
      if (error) {
        console.error('Error creating subscription:', error);
        return;
      }
      
      console.log('Subscription created successfully!');
    }
    
    // Verify the subscription was created
    const { data: newSub, error: verifyError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', USER_ID)
      .single();
    
    if (verifyError) {
      console.error('Error verifying subscription:', verifyError);
      return;
    }
    
    console.log('Final subscription data:', newSub);
    console.log('✅ Test subscription created/updated successfully!');
  } catch (error) {
    console.error('Error in createTestSubscription:', error);
  }
}

// Run the function
createTestSubscription(); 