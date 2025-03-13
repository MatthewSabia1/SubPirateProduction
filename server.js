import express from 'express';
import { createServer as createViteServer } from 'vite';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the appropriate webhook secret based on environment
const isProduction = process.env.NODE_ENV === 'production';
const stripeSecretKey = process.env.VITE_STRIPE_SECRET_KEY || '';
// Use the appropriate webhook secret based on environment
const webhookSecret = isProduction 
  ? process.env.VITE_STRIPE_PROD_WEBHOOK_SECRET
  : process.env.VITE_STRIPE_WEBHOOK_SECRET || '';

console.log('Webhook secret configured:', webhookSecret ? 'Yes' : 'No');
if (webhookSecret) {
  console.log('Webhook secret starts with:', webhookSecret.substring(0, 10) + '...');
}

const stripe = new Stripe(stripeSecretKey);

// Create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    // If we don't have a user_id, try to find it from the customer
    if (!subscriptionData.user_id) {
      try {
        // First try to find by customer ID in profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .maybeSingle();
          
        if (!profileError && profileData) {
          subscriptionData.user_id = profileData.id;
          console.log(`Found user_id ${profileData.id} from profiles table`);
        } else {
          // Then try to find by customer ID in existing subscriptions
          const { data: existingSubData, error: existingSubError } = await supabase
            .from('customer_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .maybeSingle();
            
          if (!existingSubError && existingSubData) {
            subscriptionData.user_id = existingSubData.user_id;
            console.log(`Found user_id ${existingSubData.user_id} from existing subscription`);
          } else {
            // For test events from Stripe CLI, use a default user_id
            if (process.env.NODE_ENV !== 'production' && subscription.id.startsWith('sub_')) {
              // Use the first user in the database as the default user for testing
              const { data: firstUser, error: firstUserError } = await supabase
                .from('profiles')
                .select('id')
                .limit(1)
                .maybeSingle();
                
              if (!firstUserError && firstUser) {
                subscriptionData.user_id = firstUser.id;
                console.log(`Using default user_id ${firstUser.id} for test subscription`);
              } else {
                // Fallback to a hardcoded user_id if we can't find any users
                subscriptionData.user_id = 'bc14941b-4cd0-4bc6-878a-da4006051880'; // Use the user_id we found earlier
                console.log(`Using hardcoded user_id for test subscription`);
              }
            } else {
              console.warn('Could not determine user_id for subscription:', subscription.id);
              return false;
            }
          }
        }
      } catch (userIdError) {
        console.error('Error finding user_id:', userIdError);
        return false;
      }
    }

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
      // Make sure we use the raw buffer, not a string or parsed JSON
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
            console.log('Retrieved subscription details:', JSON.stringify(subscription, null, 2));
            
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
        const updateResult = await upsertSubscription(subscription);
        console.log('Subscription update result:', updateResult);
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

      case 'product.created':
      case 'product.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        // TODO: Implement product sync
        break;

      case 'price.created':
      case 'price.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        // TODO: Implement price sync
        break;

      case 'payment_intent.succeeded':
        console.log('Processing payment_intent.succeeded event');
        // TODO: Implement payment intent succeeded handling
        break;

      case 'payment_intent.payment_failed':
        console.log('Processing payment_intent.payment_failed event');
        // TODO: Implement payment intent failed handling
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

async function createServer() {
  const app = express();
  
  // Stripe webhook endpoint needs raw body for signature verification
  // IMPORTANT: This must be defined BEFORE the Vite middleware
  app.post('/api/stripe/webhook', 
    express.raw({ type: 'application/json' }), 
    async (req, res) => {
      try {
        console.log('------------------------------');
        console.log('Stripe webhook request received');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        
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
        
        if (!req.body || (req.body instanceof Buffer && req.body.length === 0)) {
          console.error('Empty or missing request body');
          return res.status(400).json({ error: 'No body found' });
        }
        
        try {
          // Always use the raw Buffer directly for signature verification
          const payload = req.body;
          
          console.log('Webhook payload type:', typeof payload);
          console.log('Webhook payload size:', 
            typeof payload === 'string' ? payload.length : Buffer.isBuffer(payload) ? payload.length : 'unknown');
          console.log('Webhook payload preview:', typeof payload === 'string' 
            ? payload.substring(0, 100) + '...' 
            : Buffer.isBuffer(payload) 
              ? payload.toString('utf8').substring(0, 100) + '...'
              : JSON.stringify(payload).substring(0, 100) + '...'
          );
          
          // Log the first part of the webhook secret being used
          console.log('Using webhook secret starting with:', webhookSecret.substring(0, 10) + '...');
          
          await handleWebhookEvent(payload, signature, webhookSecret);
          console.log('Webhook processed successfully');
          console.log('------------------------------');
          return res.status(200).json({ success: true });
        } catch (webhookError) {
          console.error('Error processing webhook:', webhookError);
          console.error('Webhook error message:', webhookError.message);
          console.error('Webhook error stack:', webhookError.stack);
          console.log('------------------------------');
          return res.status(400).json({ 
            error: 'Webhook handler failed', 
            message: webhookError.message 
          });
        }
      } catch (error) {
        console.error('Unexpected webhook error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.log('------------------------------');
        return res.status(500).json({ 
          error: 'Webhook handler failed', 
          message: error.message 
        });
      }
    }
  );
  
  // Setup for API endpoints that need JSON parsing
  app.use('/api', (req, res, next) => {
    // Skip JSON parsing for the webhook route
    if (req.originalUrl === '/api/stripe/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  // Add a test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ status: 'API routes are working' });
  });
  
  // Simple path test to verify routing is working
  app.get('/api/stripe-test', (req, res) => {
    res.json({ 
      status: 'Stripe API route is working',
      webhook_secret_configured: Boolean(webhookSecret),
      environment: isProduction ? 'production' : 'development' 
    });
  });
  
  // Start server
  const port = process.env.PORT || 5173;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Webhook endpoint available at http://localhost:${port}/api/stripe/webhook`);
    console.log(`Using ${isProduction ? 'production' : 'test'} webhook secret: ${webhookSecret ? 'Configured ✓' : 'MISSING ✗'}`);
  });
}

createServer(); 