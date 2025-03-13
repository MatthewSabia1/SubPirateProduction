import { stripe, isValidStripeWebhookEvent } from './client';
import { Database } from '../database.types';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to update subscription status in database
export async function updateSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
  try {
    const customer = subscription.customer as string;
    
    if (!customer) {
      console.error('No customer ID found in subscription data', JSON.stringify(subscription));
      return;
    }
    
    console.log(`Updating subscription status for customer: ${customer}`);
    console.log(`Subscription data:`, JSON.stringify({
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    }, null, 2));

    // Attempt to get customer details to find user_id
    let userId: string | undefined;
    
    try {
      const stripeCustomer = await stripe.customers.retrieve(customer);
      if ('metadata' in stripeCustomer && stripeCustomer.metadata?.user_id) {
        userId = stripeCustomer.metadata.user_id;
        console.log(`Found user_id in customer metadata: ${userId}`);
      } else {
        console.log('No user_id found in customer metadata');
      }
    } catch (customerErr) {
      console.error(`Error retrieving customer ${customer}:`, customerErr);
    }

    // Find existing subscription in our database
    let existingSubscription;
    
    try {
      // First try to find by stripe_subscription_id
      const { data: subData, error: subError } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();
      
      if (!subError && subData) {
        existingSubscription = subData;
        console.log(`Found existing subscription by ID: ${subscription.id}`);
        
        // Use user_id from existing subscription if we couldn't get it from customer metadata
        if (!userId && existingSubscription.user_id) {
          userId = existingSubscription.user_id;
          console.log(`Using user_id from existing subscription: ${userId}`);
        }
      } else if (!userId) {
        // If we still don't have a user_id, try to find by customer ID
        const { data: customerSubData, error: customerSubError } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('stripe_customer_id', customer)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!customerSubError && customerSubData) {
          existingSubscription = customerSubData;
          console.log(`Found existing subscription by customer ID: ${customer}`);
          
          if (customerSubData.user_id) {
            userId = customerSubData.user_id;
            console.log(`Using user_id from customer's subscription: ${userId}`);
          }
        }
      }
    } catch (findErr) {
      console.error('Error finding existing subscription:', findErr);
    }

    if (!userId) {
      console.error('Unable to determine user_id for subscription', subscription.id);
      return;
    }

    // Prepare subscription data
    const subscriptionData = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customer,
      user_id: userId,
      status: subscription.status, // This will include 'trialing' status
      stripe_price_id: subscription.items.data[0]?.price.id,
      quantity: subscription.items.data[0]?.quantity || 1,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      created_at: new Date(subscription.created * 1000).toISOString(),
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
    };

    // Update existing or create new subscription record
    if (existingSubscription) {
      const { error: updateError } = await supabase
        .from('customer_subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
      } else {
        console.log(`Updated subscription for user ${userId}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('customer_subscriptions')
        .insert([subscriptionData]);

      if (insertError) {
        console.error('Error creating subscription:', insertError);
      } else {
        console.log(`Created new subscription for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error in updateSubscriptionStatus:', error);
  }
}

// Helper function to handle invoice payment success
async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await updateSubscriptionStatus(subscription);
    }
  } catch (error) {
    console.error('Error handling invoice payment success:', error);
    throw error;
  }
}

// Helper function to handle invoice payment failure
async function handleInvoicePaymentFailed(invoice: any) {
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await updateSubscriptionStatus(subscription);
      
      // TODO: Implement notification system for failed payments
      console.log(`Payment failed for subscription: ${invoice.subscription}`);
    }
  } catch (error) {
    console.error('Error handling invoice payment failure:', error);
    throw error;
  }
}

// New helper function to extract features from product metadata
function extractFeaturesFromMetadata(metadata: Record<string, any>): Array<{key: string, enabled: boolean, limit?: number | null}> {
  if (!metadata) return [];
  
  // First look for feature_* keys that indicate enabled features
  const featureKeys = Object.keys(metadata)
    .filter(key => key.startsWith('feature_'))
    .map(key => ({
      key: key.replace('feature_', ''),
      enabled: metadata[key] === 'true' || metadata[key] === true,
      limit: null as number | null
    }));
  
  // Then look for feature_limit_* keys that indicate feature limits
  Object.keys(metadata)
    .filter(key => key.startsWith('feature_limit_'))
    .forEach(key => {
      const featureKey = key.replace('feature_limit_', '');
      const limit = parseInt(metadata[key], 10);
      
      // Find if we already have this feature from the enabled flags
      const existingFeature = featureKeys.find(f => f.key === featureKey);
      if (existingFeature) {
        existingFeature.limit = isNaN(limit) ? null : limit;
      } else {
        // If not found, add it as a new feature with default enabled=true
        featureKeys.push({
          key: featureKey,
          enabled: true,
          limit: isNaN(limit) ? null : limit
        });
      }
    });
  
  return featureKeys;
}

// Helper function to sync product data
async function syncProductData(product: any) {
  try {
    console.log(`Syncing product data for product ${product.id}`);
    
    const { data: existingProduct } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('stripe_product_id', product.id)
      .single();

    // Extract features from metadata
    const featureKeys = extractFeaturesFromMetadata(product.metadata || {});

    if (existingProduct) {
      await supabase
        .from('stripe_products')
        .update({
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_product_id', product.id);
    } else {
      await supabase.from('stripe_products').insert({
        stripe_product_id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // Update product features if metadata contains feature information
    if (featureKeys.length > 0) {
      await syncProductFeatures(product.id, featureKeys);
    } else {
      console.log(`No features found in metadata for product ${product.id}`);
    }
    
    console.log(`Successfully synced product ${product.id}`);
  } catch (error) {
    console.error('Error syncing product data:', error);
    throw error;
  }
}

// Update helper function to sync product features with limit support
async function syncProductFeatures(
  productId: string, 
  features: Array<{key: string, enabled: boolean, limit?: number | null}>
) {
  try {
    console.log(`Syncing features for product ${productId}: ${features.map(f => f.key).join(', ')}`);
    
    // Get existing features for this product
    const { data: existingFeatures } = await supabase
      .from('product_features')
      .select('*')
      .eq('stripe_product_id', productId);
    
    // Create a lookup map of existing features for quick access
    const existingFeatureMap = new Map();
    if (existingFeatures) {
      existingFeatures.forEach(feature => {
        existingFeatureMap.set(feature.feature_key, feature);
      });
    }
    
    // Process each feature from metadata
    for (const feature of features) {
      // Store limit in metadata if provided
      const featureMetadata = feature.limit !== undefined && feature.limit !== null
        ? { limit: feature.limit }
        : null;
        
      if (existingFeatureMap.has(feature.key)) {
        // Update existing feature
        await supabase
          .from('product_features')
          .update({
            enabled: feature.enabled,
            metadata: featureMetadata
          })
          .eq('stripe_product_id', productId)
          .eq('feature_key', feature.key);
      } else {
        // Check if the feature exists in the subscription_features table
        const { data: featureExists } = await supabase
          .from('subscription_features')
          .select('feature_key')
          .eq('feature_key', feature.key)
          .single();
        
        // If the feature doesn't exist in the subscription_features table, create it
        if (!featureExists) {
          // Create a formatted name and description from the key
          const featureName = feature.key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          await supabase
            .from('subscription_features')
            .insert({
              feature_key: feature.key,
              name: featureName,
              description: feature.limit !== undefined && feature.limit !== null
                ? `${featureName} (Limit: ${feature.limit})`
                : featureName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
        
        // Create new product feature mapping
        await supabase
          .from('product_features')
          .insert({
            stripe_product_id: productId,
            feature_key: feature.key,
            enabled: feature.enabled,
            metadata: featureMetadata,
            created_at: new Date().toISOString()
          });
      }
    }
    
    console.log(`Successfully synced features for product ${productId}`);
  } catch (error) {
    console.error('Error syncing product features:', error);
    throw error;
  }
}

// Helper function to sync price data
async function syncPriceData(price: any) {
  try {
    const { data: existingPrice } = await supabase
      .from('stripe_prices')
      .select('*')
      .eq('id', price.id)
      .single();

    // Make sure we have the stripe_product_id field set correctly
    const productParams = {
      id: price.id,
      currency: price.currency,
      unit_amount: price.unit_amount,
      recurring_interval: price.recurring?.interval,
      type: price.type,
      active: price.active,
      stripe_product_id: price.product, // Use consistent field name
      updated_at: new Date().toISOString(),
    };

    if (existingPrice) {
      await supabase
        .from('stripe_prices')
        .update(productParams)
        .eq('id', price.id);
    } else {
      await supabase.from('stripe_prices').insert({
        ...productParams,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error syncing price data:', error);
    throw error;
  }
}

// Helper function to handle checkout session completed
async function handleCheckoutSessionCompleted(session: any) {
  try {
    console.log('Processing checkout.session.completed event', session.id);
    console.log('Session metadata:', JSON.stringify(session.metadata || {}, null, 2));
    console.log('Client reference ID:', session.client_reference_id);
    
    if (session.subscription) {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      console.log('DEBUG - Checkout session completed webhook data:');
      console.log('Subscription details:', JSON.stringify(subscription, null, 2));
      console.log('Subscription metadata:', JSON.stringify(subscription.metadata || {}, null, 2));
      console.log('Subscription status:', subscription.status);
      console.log('Subscription cancel_at_period_end:', subscription.cancel_at_period_end);
      console.log('Subscription cancel_at:', subscription.cancel_at);
      console.log('Subscription canceled_at:', subscription.canceled_at);
      
      // Get price details
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      
      // Get customer details
      const customerId = session.customer;
      const customer = await stripe.customers.retrieve(customerId) as any;
      
      console.log('Customer details:', JSON.stringify({
        id: customer.id,
        email: customer.email,
        metadata: customer.metadata || {}
      }, null, 2));
      
      // First try to get user_id from customer metadata (most reliable)
      let userId = customer.metadata?.user_id;
      
      if (userId) {
        console.log(`Found user_id ${userId} in customer metadata - this is the preferred source`);
      } else {
        console.log('No user_id found in customer metadata, checking alternate sources');
      }
      
      // If not found, try session metadata
      if (!userId && session.metadata?.user_id) {
        userId = session.metadata.user_id;
        console.log(`Found user_id ${userId} in session metadata`);
      }
      
      // If still not found, try client_reference_id
      if (!userId && session.client_reference_id) {
        userId = session.client_reference_id;
        console.log(`Using client_reference_id ${userId} as user_id`);
      }
      
      // Final check - do we have a userId?
      if (!userId) {
        console.error('CRITICAL: No user_id could be determined from any source');
        console.error('Session data:', JSON.stringify(session, null, 2));
        throw new Error('Cannot create subscription: No user_id found');
      } else {
        console.log(`Proceeding with user_id: ${userId}`);
      }
      
      // Check if subscription record already exists
      const { data: existingSubscription, error: userSubError } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      if (userSubError) {
        console.error('Error looking up existing subscription by user_id:', userSubError);
      } else {
        console.log(`Existing subscription lookup by user_id result: ${existingSubscription ? 'Found' : 'Not found'}`);
      }
      
      // Also check if there's an existing subscription with the same customer ID
      const { data: existingCustomerSubscription, error: custSubError } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      
      if (custSubError) {
        console.error('Error looking up existing subscription by customer_id:', custSubError);
      } else {
        console.log(`Existing subscription lookup by customer_id result: ${existingCustomerSubscription ? 'Found' : 'Not found'}`);
      }
      
      // Check if price exists in our database
      const { data: existingPrice, error: priceError } = await supabase
        .from('stripe_prices')
        .select('*')
        .eq('id', priceId)
        .maybeSingle();
      
      if (priceError) {
        console.error('Error looking up price:', priceError);
      }
      
      // If price doesn't exist, create it
      if (!existingPrice) {
        console.log(`Creating new price record for ${priceId}`);
        try {
          await syncPriceData(price);
          console.log(`Successfully created price record for ${priceId}`);
        } catch (syncError) {
          console.error(`Failed to create price record for ${priceId}:`, syncError);
          // Continue execution - subscription can still be created even if price sync fails
        }
      }
      
      // Prepare subscription data
      const subscriptionData = {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (existingCustomerSubscription) {
        console.log(`Updating existing customer subscription for ${customerId}`);
        // Update existing subscription by customer ID
        const { error: updateError } = await supabase
          .from('customer_subscriptions')
          .update(subscriptionData)
          .eq('stripe_customer_id', customerId);
          
        if (updateError) {
          console.error('Error updating existing customer subscription:', updateError);
        } else {
          console.log('Successfully updated existing customer subscription');
        }
      } else if (existingSubscription) {
        console.log(`Updating existing user subscription for user ${userId}`);
        // Update existing subscription by user ID
        const { error: updateError } = await supabase
          .from('customer_subscriptions')
          .update(subscriptionData)
          .eq('id', existingSubscription.id);
          
        if (updateError) {
          console.error('Error updating existing user subscription:', updateError);
        } else {
          console.log('Successfully updated existing user subscription');
        }
      } else {
        console.log(`Creating new subscription for customer ${customerId} and user ${userId}`);
        
        // Create new subscription
        const { data, error } = await supabase.from('customer_subscriptions').insert({
          ...subscriptionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        if (error) {
          console.error('Error creating new subscription:', error);
          throw error;
        } else {
          console.log('Successfully created new subscription in Supabase');
        }
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

// Helper function to handle product deletion
async function handleProductDeleted(product: any) {
  try {
    const { data, error } = await supabase
      .from('stripe_products')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('stripe_product_id', product.id);

    if (error) {
      console.error(`Error marking product ${product.id} as inactive:`, error);
      throw error;
    }

    console.log(`Successfully marked product ${product.id} as inactive`);
  } catch (error) {
    console.error('Error handling product deletion:', error);
    throw error;
  }
}

// Helper function to handle price deletion
async function handlePriceDeleted(price: any) {
  try {
    const { data, error } = await supabase
      .from('stripe_prices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', price.id);

    if (error) {
      console.error(`Error marking price ${price.id} as inactive:`, error);
      throw error;
    }

    console.log(`Successfully marked price ${price.id} as inactive`);
  } catch (error) {
    console.error('Error handling price deletion:', error);
    throw error;
  }
}

// Main webhook handler
export async function handleWebhookEvent(
  rawBody: string,
  signature: string,
  webhookSecret: string
) {
  try {
    console.log('Constructing Stripe event from webhook payload');
    
    // Verify webhook signature
    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`✓ Webhook verified! Event type: ${stripeEvent.type}`);

    // Handle different event types
    try {
      switch (stripeEvent.type) {
        case 'checkout.session.completed':
          console.log('Processing checkout.session.completed event');
          await handleCheckoutSessionCompleted(stripeEvent.data.object);
          break;
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          console.log(`Processing ${stripeEvent.type} event`);
          await updateSubscriptionStatus(stripeEvent.data.object);
          break;
          
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(stripeEvent.data.object);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(stripeEvent.data.object);
          break;

        case 'product.created':
        case 'product.updated':
          console.log(`Processing ${stripeEvent.type} event`);
          // Check if this is a metadata update
          if (stripeEvent.data.previous_attributes && 
              stripeEvent.data.previous_attributes.metadata) {
            console.log('Detected metadata changes, syncing product features');
          }
          await syncProductData(stripeEvent.data.object);
          break;
          
        case 'product.deleted':
          console.log(`Processing ${stripeEvent.type} event`);
          await handleProductDeleted(stripeEvent.data.object);
          break;

        case 'price.created':
        case 'price.updated':
          console.log(`Processing ${stripeEvent.type} event`);
          await syncPriceData(stripeEvent.data.object);
          break;
          
        case 'price.deleted':
          console.log(`Processing ${stripeEvent.type} event`);
          await handlePriceDeleted(stripeEvent.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${stripeEvent.type}`);
      }
    } catch (handlerError: any) {
      console.error(`Error processing ${stripeEvent.type} event:`, handlerError);
      console.error('Event data:', JSON.stringify(stripeEvent.data.object, null, 2));
      
      // Report the error but don't throw, so Stripe won't retry
      // This avoids duplicated or stuck webhooks
      return { 
        success: false, 
        error: `Error processing ${stripeEvent.type} event: ${handlerError.message}` 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error handling webhook:', error);
    throw error;
  }
}