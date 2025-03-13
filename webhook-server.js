import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role key for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

// FORCE TEST MODE during development
// const isProduction = process.env.NODE_ENV === 'production';
const isProduction = false; // Force test mode
console.log('Running in TEST MODE - using test webhook secret and API keys');

// Get the appropriate webhook secret based on environment
const stripeSecretKey = isProduction 
  ? process.env.VITE_STRIPE_SECRET_KEY 
  : process.env.VITE_STRIPE_TEST_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '';

// Use the VITE_STRIPE_WEBHOOK_SECRET directly since that's what the Stripe CLI is using
const webhookSecret = process.env.VITE_STRIPE_WEBHOOK_SECRET || '';

console.log('Using webhook secret:', webhookSecret ? webhookSecret.substring(0, 8) + '...' : 'No webhook secret found!');
console.log('Using Stripe API key:', stripeSecretKey ? stripeSecretKey.substring(0, 8) + '...' : 'No API key found!');
console.log('Supabase connected:', supabaseUrl ? '✓' : '✗');

const stripe = new Stripe(stripeSecretKey);

// Helper function to update or create a subscription record
async function upsertSubscription(subscription, userId = null) {
  try {
    // Extract the essential subscription details
    const subscriptionData = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      user_id: userId || subscription.metadata?.user_id, // Use provided userId or from metadata
      status: subscription.status,
      stripe_price_id: subscription.items.data[0]?.price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Upserting subscription data:', subscriptionData);

    // Look for any existing subscription with this ID
    const { data: existingSubscription, error: lookupError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (lookupError) {
      console.error('Error looking up existing subscription:', lookupError);
      return false;
    }

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('customer_subscriptions')
        .update({
          ...subscriptionData,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return false;
      }
      console.log('Subscription updated successfully:', subscription.id);
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('customer_subscriptions')
        .insert([subscriptionData]);

      if (insertError) {
        console.error('Error inserting subscription:', insertError);
        return false;
      }
      console.log('Subscription created successfully:', subscription.id);
    }

    return true;
  } catch (error) {
    console.error('Error in upsertSubscription:', error);
    return false;
  }
}

// Create a simple handler for webhook events
async function handleWebhookEvent(rawBody, signature, webhookSecret) {
  try {
    console.log('Constructing Stripe event from webhook payload');
    
    // Verify webhook signature
    let stripeEvent;
    try {
      // No need to modify rawBody - it's already the correct format from express.raw()
      stripeEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`✓ Webhook verified! Event type: ${stripeEvent.type}`);
    
    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed event');
        const session = stripeEvent.data.object;
        console.log('Checkout session metadata:', session.metadata);
        console.log('Customer:', session.customer);
        
        // If this is a subscription checkout, get the subscription info
        if (session.mode === 'subscription' && session.subscription) {
          try {
            // Fetch the subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            
            // Update our database with the subscription info
            await upsertSubscription(subscription, session.metadata?.user_id);
            
            // Also update the profile with the stripe_customer_id if needed
            if (session.metadata?.user_id && session.customer) {
              const { error: profileError } = await supabase
                .from('profiles')
                .update({ stripe_customer_id: session.customer })
                .eq('id', session.metadata.user_id);
                
              if (profileError) {
                console.error('Error updating profile with stripe_customer_id:', profileError);
              } else {
                console.log(`Profile updated with stripe_customer_id for user ${session.metadata.user_id}`);
              }
            }
          } catch (error) {
            console.error('Error fetching subscription details:', error);
          }
        }
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        const subscription = stripeEvent.data.object;
        console.log('Subscription status:', subscription.status);
        console.log('Subscription ID:', subscription.id);
        console.log('Customer ID:', subscription.customer);
        
        // Update our database with the subscription info
        await upsertSubscription(subscription);
        break;
        
      case 'customer.subscription.deleted':
        console.log(`Processing ${stripeEvent.type} event`);
        const deletedSubscription = stripeEvent.data.object;
        
        // Update our database to mark the subscription as cancelled
        const result = await upsertSubscription(deletedSubscription);
        console.log('Subscription marked as cancelled:', result);
        break;
        
      case 'invoice.payment_succeeded':
        console.log('Processing invoice.payment_succeeded event');
        const successfulInvoice = stripeEvent.data.object;
        console.log('Invoice ID:', successfulInvoice.id);
        console.log('Customer ID:', successfulInvoice.customer);
        
        // If this invoice is for a subscription, update our records
        if (successfulInvoice.subscription) {
          try {
            const invoiceSubscription = await stripe.subscriptions.retrieve(successfulInvoice.subscription);
            await upsertSubscription(invoiceSubscription);
          } catch (error) {
            console.error('Error updating subscription after invoice payment:', error);
          }
        }
        break;

      case 'invoice.payment_failed':
        console.log('Processing invoice.payment_failed event');
        const failedInvoice = stripeEvent.data.object;
        console.log('Invoice ID:', failedInvoice.id);
        console.log('Customer ID:', failedInvoice.customer);
        
        // If this invoice is for a subscription, update our records
        if (failedInvoice.subscription) {
          try {
            const failedSubscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
            await upsertSubscription(failedSubscription);
          } catch (error) {
            console.error('Error updating subscription after invoice payment failure:', error);
          }
        }
        break;

      case 'invoice.finalized':
        console.log('Processing invoice.finalized event');
        const finalizedInvoice = stripeEvent.data.object;
        console.log('Invoice ID:', finalizedInvoice.id);
        // Here you would handle finalized invoices
        break;

      case 'product.created':
      case 'product.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        const product = stripeEvent.data.object;
        console.log('Product ID:', product.id);
        console.log('Product name:', product.name);
        // Here you would update your database with product information
        break;

      case 'price.created':
      case 'price.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        const price = stripeEvent.data.object;
        console.log('Price ID:', price.id);
        console.log('Price amount:', price.unit_amount);
        // Here you would update your database with price information
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }
    
    // Log the event data for debugging
    console.log('Event data:', JSON.stringify(stripeEvent.data.object, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    throw error;
  }
}

// Create Express app
const app = express();

// Important: This route must use express.raw() BEFORE any other middleware
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }), // Important: Use express.raw() to get the raw body
  async (req, res) => {
    try {
      console.log('Stripe webhook request received');
      
      if (!webhookSecret) {
        console.error('No webhook secret found in environment variables');
        return res.status(500).json({ error: 'Webhook secret is not configured' });
      }
      
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        console.error('No Stripe signature found in headers');
        return res.status(400).json({ error: 'No signature found' });
      }

      console.log('Signature received:', signature.substring(0, 20) + '...');
      
      try {
        // The request body is already a Buffer when using express.raw()
        const payload = req.body;
        
        // Log the first few characters of the payload for debugging
        console.log('Payload type:', typeof payload);
        console.log('Payload preview:', Buffer.isBuffer(payload) 
          ? payload.toString('utf8').substring(0, 50) + '...' 
          : String(payload).substring(0, 50) + '...'
        );
        
        // Don't modify the payload - pass it directly to constructEvent
        await handleWebhookEvent(payload, signature, webhookSecret);
        console.log('Webhook processed successfully');
        return res.status(200).json({ success: true });
      } catch (webhookError) {
        console.error('Error processing webhook:', webhookError.message);
        return res.status(400).json({ 
          error: 'Webhook handler failed', 
          message: webhookError.message 
        });
      }
    } catch (error) {
      console.error('Unexpected webhook error:', error);
      return res.status(500).json({ 
        error: 'Webhook handler failed', 
        message: error.message 
      });
    }
  }
);

// For routes other than the webhook endpoint, parse JSON normally
app.use(bodyParser.json());

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'API routes are working' });
});

// Start server on a different port to avoid conflicts with Vite
const port = 4242;
app.listen(port, () => {
  console.log(`Webhook server running at http://localhost:${port}`);
  console.log(`Webhook endpoint available at http://localhost:${port}/api/stripe/webhook`);
  console.log(`Using ${isProduction ? 'production' : 'test'} webhook secret: ${webhookSecret ? 'Configured ✓' : 'MISSING ✗'}`);
}); 