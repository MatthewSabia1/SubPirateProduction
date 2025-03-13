# SubPirate Subscription System Robustness

## Executive Summary

This document outlines critical recommendations for improving the robustness and reliability of the SubPirate subscription system before production launch. The primary focus is on handling external API dependencies, particularly Stripe, to ensure service continuity even during API outages or failures.

## Table of Contents
1. [Stripe Integration Improvements](#stripe-integration-improvements)
2. [Subscription Status Verification](#subscription-status-verification)
3. [Feature Access Control](#feature-access-control)
4. [Supabase-Specific Considerations](#supabase-specific-considerations)
5. [Reddit API Fallback Strategy](#reddit-api-fallback-strategy)
6. [Implementation Plan](#implementation-plan)
7. [Testing Strategy](#testing-strategy)
8. [Monitoring and Alerting](#monitoring-and-alerting)

## Stripe Integration Improvements

### Checkout Session Creation

The current checkout session creation lacks robust error handling and retry mechanisms. Implement the following improvements:

```typescript
export async function createCheckoutSession({ 
  priceId, 
  successUrl, 
  cancelUrl, 
  userId 
}: CheckoutOptions) {
  // Implement retry mechanism with exponential backoff
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      // Validate inputs
      if (!priceId) throw new Error('Price ID is required');
      if (!successUrl || !cancelUrl) throw new Error('URLs are required');
      
      // Create session parameters
      const sessionParams: any = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: 14,
          metadata: { user_id: userId }
        },
        metadata: { user_id: userId }
      };

      // Add customer if user ID provided
      if (userId) {
        try {
          sessionParams.customer = await getOrCreateCustomerForUser(userId);
        } catch (customerError) {
          console.error('Customer creation failed, proceeding without customer ID', customerError);
          // Continue without customer ID rather than failing completely
        }
      }

      // Create and return the session
      const session = await stripe.checkout.sessions.create(sessionParams);
      
      // Cache the session data
      await cacheCheckoutSession(userId, session.id, session);
      
      return session;
    } catch (error) {
      retries++;
      console.error(`Checkout session creation failed (attempt ${retries}/${maxRetries}):`, error);
      
      if (retries >= maxRetries) {
        // Log detailed error for monitoring
        logStripeError('checkout_session_creation_failed', error, { userId, priceId });
        throw new Error('Unable to create checkout session. Please try again later.');
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
    }
  }
}
```

### Webhook Processing

Webhook processing is a critical component that needs to be highly reliable:

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }
  
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    console.error('No Stripe signature found');
    return res.status(400).json({ error: 'Missing signature header' });
  }
  
  let event;
  
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  
  // Track webhook processing with timeout protection
  const webhookTimeoutMs = 9000; // 9 seconds (to avoid 10s serverless timeout)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Webhook processing timeout')), webhookTimeoutMs);
  });
  
  try {
    // Process with timeout protection
    await Promise.race([
      processWebhookEvent(event),
      timeoutPromise
    ]);
    
    // Record successful processing for monitoring
    await recordWebhookSuccess(event.type, event.id);
    
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error}`);
    
    // Record the failed event for retry
    await storeFailedWebhookEvent(event);
    
    // Always return 200 to Stripe (we'll handle retry logic ourselves)
    return res.status(200).json({ received: true, processing: 'queued' });
  }
}

async function processWebhookEvent(event: Stripe.Event) {
  // Implement idempotency check first
  const isProcessed = await checkIfEventProcessed(event.id);
  if (isProcessed) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;
    // Handle other event types...
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  // Mark event as processed
  await markEventProcessed(event.id);
}
```

#### Additional Webhook Improvements

1. **Create a Failed Event Recovery System**:
   ```typescript
   // Create this function to be called by a scheduled job
   export async function reprocessFailedWebhookEvents() {
     // Get failed events
     const { data: failedEvents, error } = await supabase
       .from('failed_webhook_events')
       .select('*')
       .order('created_at', { ascending: true })
       .limit(50);
     
     if (error || !failedEvents?.length) return;
     
     for (const failedEvent of failedEvents) {
       try {
         // Attempt to reprocess
         await processWebhookEvent(JSON.parse(failedEvent.event_data));
         
         // If successful, delete from failed events
         await supabase
           .from('failed_webhook_events')
           .delete()
           .eq('id', failedEvent.id);
       } catch (error) {
         console.error(`Failed to reprocess event ${failedEvent.id}:`, error);
         
         // Update retry count and last attempt
         await supabase
           .from('failed_webhook_events')
           .update({
             retry_count: failedEvent.retry_count + 1,
             last_retry: new Date().toISOString()
           })
           .eq('id', failedEvent.id);
       }
     }
   }
   ```

2. **Implement Event Storage Table**:
   ```sql
   -- Create this table to store failed webhook events
   CREATE TABLE failed_webhook_events (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     event_id TEXT NOT NULL,
     event_type TEXT NOT NULL,
     event_data JSONB NOT NULL,
     error_message TEXT,
     retry_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     last_retry TIMESTAMPTZ,
     UNIQUE(event_id)
   );
   
   -- Create this table to track processed events for idempotency
   CREATE TABLE processed_webhook_events (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     event_id TEXT NOT NULL,
     event_type TEXT NOT NULL,
     processed_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(event_id)
   );
   ```

## Subscription Status Verification

Create a robust subscription verification service with caching and fallbacks:

```typescript
export class SubscriptionService {
  private cache: Map<string, {data: any, timestamp: number}> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Get subscription status with caching and fallbacks
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      // Check cache first
      const cached = this.getFromCache(`subscription:${userId}`);
      if (cached) return cached;
      
      // Try to get from database
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Verify with Stripe if we're concerned data might be stale
        const isStale = this.isSubscriptionDataStale(data);
        
        if (isStale) {
          try {
            // Try to refresh from Stripe
            const freshData = await this.verifyWithStripe(data.stripe_subscription_id);
            await this.updateSubscriptionInDb(freshData);
            
            const status = this.mapSubscriptionStatus(freshData);
            this.saveToCache(`subscription:${userId}`, status);
            return status;
          } catch (stripeError) {
            console.warn('Failed to verify with Stripe, using database data', stripeError);
            // Fall back to database data even if stale
            const status = this.mapSubscriptionStatus(data);
            this.saveToCache(`subscription:${userId}`, status);
            return status;
          }
        } else {
          // Data is fresh enough, use it
          const status = this.mapSubscriptionStatus(data);
          this.saveToCache(`subscription:${userId}`, status);
          return status;
        }
      }
      
      // No subscription found
      return { active: false, tier: 'free', features: getFreeTierFeatures() };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      
      // Critical path - return cached data even if expired
      const cachedData = this.getFromCacheIgnoringExpiry(`subscription:${userId}`);
      if (cachedData) {
        return cachedData;
      }
      
      // Last resort fallback - assume user has basic access to avoid locking them out
      return { 
        active: true, 
        tier: 'basic', 
        features: getBasicTierFeatures(),
        temporary: true, // Flag indicating this is a temporary fallback
        validUntil: Date.now() + 30 * 60 * 1000 // 30 minutes temporary access
      };
    }
  }
  
  // Cache methods
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private getFromCacheIgnoringExpiry(key: string): any | null {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }
  
  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  // Helper methods
  private isSubscriptionDataStale(data: any): boolean {
    // Consider data stale if older than 1 hour or near period boundaries
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const updatedAt = new Date(data.updated_at).getTime();
    
    if (updatedAt < oneHourAgo) return true;
    
    // Also check if we're near the current period end (within 1 day)
    const periodEnd = new Date(data.current_period_end).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return Date.now() > periodEnd - oneDayMs;
  }
  
  private async verifyWithStripe(subscriptionId: string): Promise<any> {
    // Implement retries here as well
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries - 1)));
      }
    }
  }
  
  private async updateSubscriptionInDb(stripeData: any): Promise<void> {
    // Update database with fresh data from Stripe
    const { error } = await supabase
      .from('customer_subscriptions')
      .update({
        status: stripeData.status,
        current_period_start: new Date(stripeData.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeData.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeData.cancel_at_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', stripeData.id);
    
    if (error) console.error('Failed to update subscription in DB:', error);
  }
  
  private mapSubscriptionStatus(data: any): SubscriptionStatus {
    // Map database/Stripe data to application subscription status
    const isActive = data.status === 'active' || data.status === 'trialing';
    
    // Map price ID to tier
    let tier = 'free';
    if (data.stripe_price_id) {
      if (data.stripe_price_id.includes('pro')) tier = 'pro';
      else if (data.stripe_price_id.includes('premium')) tier = 'premium';
      else tier = 'basic';
    }
    
    return {
      active: isActive,
      tier,
      expiresAt: new Date(data.current_period_end).getTime(),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      features: getTierFeatures(tier)
    };
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
```

### Subscription Synchronization Job

Create a scheduled job to ensure subscription data stays in sync:

```typescript
// This should run as a scheduled job every 12 hours
export async function syncSubscriptions() {
  // Get all active subscriptions
  const { data: subscriptions, error } = await supabase
    .from('customer_subscriptions')
    .select('*')
    .in('status', ['active', 'trialing']);
  
  if (error || !subscriptions) {
    console.error('Failed to fetch subscriptions for sync:', error);
    return;
  }
  
  for (const subscription of subscriptions) {
    try {
      // Get latest from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      
      // Update local database
      await supabase
        .from('customer_subscriptions')
        .update({
          status: stripeSubscription.status,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    } catch (error) {
      console.error(`Failed to sync subscription ${subscription.id}:`, error);
      // Log for manual review but continue with others
    }
  }
}
```

## Feature Access Control

Implement a robust feature access system that can function during API outages:

```typescript
import { useEffect, useState } from 'react';
import { subscriptionService } from '@/lib/stripe/subscriptionService';
import { useAuth } from './useAuth';

interface FeatureAccess {
  canAccess: boolean;
  isLoading: boolean;
  isReducedFunctionality: boolean;
  remainingUsage: number | null;
  showUpgradeModal: () => void;
}

// Feature access hook with degraded functionality support
export function useFeatureAccess(featureName: string): FeatureAccess {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [isReducedFunctionality, setIsReducedFunctionality] = useState(false);
  const [remainingUsage, setRemainingUsage] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    async function checkAccess() {
      if (!user) {
        if (mounted) {
          setCanAccess(false);
          setIsLoading(false);
        }
        return;
      }
      
      try {
        // Get subscription status with fallbacks built in
        const subscription = await subscriptionService.getUserSubscriptionStatus(user.id);
        
        // Check if this is temporary fallback access
        const isTemporary = subscription.temporary === true;
        
        // Check feature access based on subscription
        if (subscription.features && subscription.features[featureName]) {
          const featureAccess = subscription.features[featureName];
          
          if (mounted) {
            setCanAccess(true);
            setIsReducedFunctionality(isTemporary);
            
            // Set remaining usage if applicable
            if (typeof featureAccess === 'object' && featureAccess.limit) {
              const usageCount = await getFeatureUsageCount(user.id, featureName);
              setRemainingUsage(Math.max(0, featureAccess.limit - usageCount));
            } else {
              setRemainingUsage(null); // Unlimited
            }
          }
        } else {
          if (mounted) {
            // No access to this feature
            setCanAccess(false);
            setRemainingUsage(0);
          }
        }
      } catch (error) {
        console.error('Error checking feature access:', error);
        if (mounted) {
          setIsError(true);
          // For critical features, provide emergency access
          if (isCriticalFeature(featureName)) {
            setCanAccess(true);
            setIsReducedFunctionality(true);
            setRemainingUsage(3); // Limited emergency usage
          } else {
            setCanAccess(false);
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    checkAccess();
    
    return () => {
      mounted = false;
    };
  }, [user, featureName]);
  
  // Modal to show upgrade options
  const showUpgradeModal = () => {
    // Implementation of upgrade modal
  };
  
  return {
    canAccess,
    isLoading,
    isReducedFunctionality,
    remainingUsage,
    showUpgradeModal
  };
}

// Helper to determine critical features that should have emergency access
function isCriticalFeature(featureName: string): boolean {
  const criticalFeatures = [
    'dashboardAccess',
    'savedSubreddits',
    'viewProjects'
    // Add other critical features
  ];
  
  return criticalFeatures.includes(featureName);
}

// Get feature usage count from database
async function getFeatureUsageCount(userId: string, featureName: string): Promise<number> {
  try {
    // Try to get from database
    const { data, error } = await supabase
      .from('user_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    // Map feature name to database column
    const columnMap: Record<string, string> = {
      'subredditAnalysis': 'subreddit_analysis_count',
      'spyglassSearch': 'spyglass_searches_count',
      'calendarPost': 'calendar_posts_count',
      // Add other mappings
    };
    
    const column = columnMap[featureName];
    if (!column || !data) return 0;
    
    return data[column] || 0;
  } catch (error) {
    console.error('Error getting feature usage:', error);
    return 0; // Default to 0 to allow some usage in case of errors
  }
}
```

### Feature-Specific Components

Create UI components that gracefully handle reduced functionality:

```typescript
// Example of a component with degraded functionality support
export function SubredditAnalysisFeature() {
  const {
    canAccess,
    isLoading,
    isReducedFunctionality,
    remainingUsage,
    showUpgradeModal
  } = useFeatureAccess('subredditAnalysis');
  
  if (isLoading) {
    return <LoadingState />;
  }
  
  if (!canAccess) {
    return <UpgradeRequiredState onUpgradeClick={showUpgradeModal} />;
  }
  
  return (
    <div>
      {isReducedFunctionality && (
        <DegradedFunctionalityBanner
          message="You're currently using limited functionality due to connectivity issues with our subscription service. Some features may be restricted."
        />
      )}
      
      {remainingUsage !== null && (
        <UsageCounter
          current={remainingUsage}
          message={`You have ${remainingUsage} subreddit analyses remaining this month.`}
        />
      )}
      
      <SubredditAnalysisForm
        disabled={remainingUsage === 0}
        isLimitedMode={isReducedFunctionality}
      />
    </div>
  );
}
```

## Supabase-Specific Considerations

Since SubPirate relies heavily on Supabase for both database and authentication, there are specific considerations to ensure subscription robustness:

### Local Storage Backup for Subscription Data

Implement a localStorage backup system for critical subscription information:

```typescript
// src/lib/stripe/localStorageBackup.ts
import { SubscriptionStatus } from '@/types/subscription';

const STORAGE_PREFIX = 'subpirate_';
const SUBSCRIPTION_KEY = `${STORAGE_PREFIX}subscription`;
const EXPIRY_SUFFIX = '_expiry';
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Save subscription data to localStorage with expiration
export function backupSubscriptionToLocalStorage(
  userId: string, 
  subscriptionData: SubscriptionStatus,
  expiryMs: number = DEFAULT_EXPIRY
): void {
  try {
    const storageKey = `${SUBSCRIPTION_KEY}_${userId}`;
    const expiryKey = `${storageKey}${EXPIRY_SUFFIX}`;
    const expiryTime = Date.now() + expiryMs;
    
    // Store data
    localStorage.setItem(storageKey, JSON.stringify(subscriptionData));
    localStorage.setItem(expiryKey, expiryTime.toString());
    
    // Also store user ID for reconstruction on reload
    const activeUserKey = `${STORAGE_PREFIX}active_user`;
    localStorage.setItem(activeUserKey, userId);
  } catch (error) {
    console.warn('Failed to backup subscription to localStorage:', error);
  }
}

// Retrieve subscription data from localStorage
export function getSubscriptionFromLocalStorage(userId: string): SubscriptionStatus | null {
  try {
    const storageKey = `${SUBSCRIPTION_KEY}_${userId}`;
    const expiryKey = `${storageKey}${EXPIRY_SUFFIX}`;
    
    const subscriptionJson = localStorage.getItem(storageKey);
    const expiryTimeStr = localStorage.getItem(expiryKey);
    
    if (!subscriptionJson || !expiryTimeStr) return null;
    
    const expiryTime = parseInt(expiryTimeStr, 10);
    
    // Check if data is expired
    if (Date.now() > expiryTime) {
      // Clean up expired data
      localStorage.removeItem(storageKey);
      localStorage.removeItem(expiryKey);
      return null;
    }
    
    return JSON.parse(subscriptionJson) as SubscriptionStatus;
  } catch (error) {
    console.warn('Failed to retrieve subscription from localStorage:', error);
    return null;
  }
}

// Clear subscription data from localStorage on logout
export function clearSubscriptionFromLocalStorage(userId: string): void {
  try {
    const storageKey = `${SUBSCRIPTION_KEY}_${userId}`;
    const expiryKey = `${storageKey}${EXPIRY_SUFFIX}`;
    
    localStorage.removeItem(storageKey);
    localStorage.removeItem(expiryKey);
    localStorage.removeItem(`${STORAGE_PREFIX}active_user`);
  } catch (error) {
    console.warn('Failed to clear subscription from localStorage:', error);
  }
}
```

### Supabase Authentication Integration

Update the Subscription Service to handle Supabase authentication state changes:

```typescript
// Add this to the SubscriptionService class

// Initialize subscription tracking on auth state change
initializeAuthStateTracking(): void {
  // Listen for auth state changes
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      // Clear cache on sign out
      if (event === 'SIGNED_OUT') {
        this.cache.clear();
        if (session?.user?.id) {
          clearSubscriptionFromLocalStorage(session.user.id);
        }
        return;
      }
      
      // Initialize subscription data on sign in
      if (event === 'SIGNED_IN' && session?.user?.id) {
        try {
          // Fetch subscription status and cache it
          const subscription = await this.getUserSubscriptionStatus(session.user.id);
          
          // Backup to localStorage
          backupSubscriptionToLocalStorage(session.user.id, subscription);
        } catch (error) {
          console.error('Failed to initialize subscription data on sign in:', error);
        }
      }
    }
  );
  
  // Store the listener for cleanup if needed
  this.authListener = authListener;
}
```

### Row-Level Security (RLS) Considerations

Ensure proper RLS policies are in place for subscription data:

```sql
-- Add to your Supabase migrations for subscription tables

-- Only allow users to view their own subscription data
CREATE POLICY "Users can view only their own subscriptions"
ON customer_subscriptions
FOR SELECT
USING (user_id = auth.uid());

-- Allow service role to update subscription data via webhooks
CREATE POLICY "Service role can update any subscription"
ON customer_subscriptions
FOR UPDATE
USING (auth.role() = 'service_role');

-- Add a table for temporary fallback access tokens
CREATE TABLE subscription_fallback_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Only allow users to view their own fallback tokens
CREATE POLICY "Users can view only their own fallback tokens"
ON subscription_fallback_tokens
FOR SELECT
USING (user_id = auth.uid());
```

## Reddit API Fallback Strategy

Since SubPirate relies on both subscription status and Reddit API access, we need a strategy for handling cases where subscription verification fails but Reddit API access is still needed:

### Feature-Specific Degradation

```typescript
// src/hooks/useRedditApiWithSubscriptionFallback.ts
import { useFeatureAccess } from './useFeatureAccess';
import { useRedditApi } from './useRedditApi';

export function useRedditApiWithSubscriptionFallback() {
  const { 
    canAccess, 
    isReducedFunctionality, 
    remainingUsage 
  } = useFeatureAccess('redditApiAccess');
  
  const redditApi = useRedditApi();
  
  // Modified API methods with fallback behavior
  const getSubredditInfo = async (subredditName: string) => {
    try {
      // Check if user has access to this feature
      if (!canAccess) {
        throw new Error('Subscription required for this feature');
      }
      
      // Apply reduced functionality if needed
      if (isReducedFunctionality) {
        // For degraded mode, use a more aggressive cache strategy
        const cachedData = getFromAggressiveCache(`subreddit:${subredditName}`);
        if (cachedData) return cachedData;
        
        // Limit requests in degraded mode
        if (remainingUsage !== null && remainingUsage <= 0) {
          throw new Error('API usage limit reached in reduced functionality mode');
        }
      }
      
      // Make the actual API call
      return await redditApi.getSubredditInfo(subredditName);
    } catch (error) {
      console.error('Error in getSubredditInfo with fallback:', error);
      
      // Try to return cached data even if expired
      const staleData = getStaleCache(`subreddit:${subredditName}`);
      if (staleData) {
        // Mark data as stale
        return {
          ...staleData,
          isStaleData: true,
          lastUpdated: getLastCacheUpdate(`subreddit:${subredditName}`)
        };
      }
      
      // If no cached data, throw the original error
      throw error;
    }
  };
  
  // Similar pattern for other Reddit API methods
  // ...
  
  return {
    ...redditApi,
    getSubredditInfo,
    // Override other methods as needed
    isReducedFunctionality
  };
}

// Helper functions for aggressive caching
function getFromAggressiveCache(key: string) {
  // Implementation to get from cache with longer TTL
}

function getStaleCache(key: string) {
  // Implementation to get cached data even if expired
}

function getLastCacheUpdate(key: string) {
  // Get timestamp of when cache was last updated
}
```

### Offline Usage Mode for Reddit Data

For critical Reddit data that should be available even during service disruptions:

```typescript
// src/lib/offlineDataManager.ts
export class OfflineDataManager {
  // Initialize IndexedDB for offline storage
  private async initDb() {
    // Implementation to create/open IndexedDB
  }
  
  // Save subreddit data for offline access
  public async saveSubredditForOffline(subredditData: SubredditInfo): Promise<void> {
    // Store in IndexedDB for offline access
  }
  
  // Get saved subreddits that are available offline
  public async getOfflineAvailableSubreddits(): Promise<string[]> {
    // Return list of subreddits available offline
  }
  
  // Retrieve offline subreddit data
  public async getOfflineSubredditData(subredditName: string): Promise<SubredditInfo | null> {
    // Get data from IndexedDB
  }
  
  // Sync offline changes when back online
  public async syncOfflineChanges(): Promise<void> {
    // Sync any offline changes with server
  }
}

// Export singleton
export const offlineDataManager = new OfflineDataManager();
```

## Implementation Plan

We recommend the following implementation plan to improve subscription robustness:

### Phase 1: Emergency Protection (High Priority)

1. **Implement Subscription Service with Caching**
   - Create the `SubscriptionService` class as described above
   - Implement basic caching for subscription status
   - Add fallback tiers for emergency access

2. **Improve Webhook Processing**
   - Create tables for failed webhook events and processed events
   - Update webhook handler to store failed events
   - Implement idempotency checks

3. **Add Retry Logic to Checkout**
   - Update checkout session creation with retry logic
   - Implement error handling and logging

4. **Add Supabase-Specific Fallbacks**
   - Implement localStorage backup system
   - Add RLS policies for subscription tables
   - Create fallback token system for subscription verification

5. **Create Reddit API Degradation Strategy**
   - Implement aggressive caching for Reddit API data
   - Create feature-specific fallback behaviors
   - Add offline storage for critical subreddit data

### Phase 2: Robustness Improvements (Medium Priority)

1. **Implement Degraded Functionality**
   - Create the `useFeatureAccess` hook
   - Update UI components to handle reduced functionality
   - Define critical vs. non-critical features

2. **Create Offline Support**
   - Add localStorage backup for subscription info
   - Implement offline detection and handling
   - Create sync mechanism for when connection is restored

3. **Develop Background Jobs**
   - Create subscription sync job
   - Implement failed webhook retry job
   - Add monitoring for job execution

### Phase 3: User Experience & Monitoring (Lower Priority)

1. **User Communication**
   - Implement status messages for subscription issues
   - Create clear error messages for checkout failures
   - Add notification system for subscription status changes

2. **Monitoring & Alerting**
   - Set up logging for subscription-related errors
   - Create dashboard for Stripe integration health
   - Implement alerting for critical failures

3. **Support Tools**
   - Build admin interface for subscription management
   - Create tools for manual intervention
   - Develop customer support troubleshooting guide

## Testing Strategy

Before production launch, implement these critical tests:

### 1. Disconnect Testing

Test the application's behavior when external APIs are unavailable:

- **Stripe API Outage**: 
  - Mock Stripe API to return errors or timeouts
  - Verify checkout process shows appropriate error messages
  - Confirm subscription status falls back to cached data
  - Test user access to features during outage

- **Database Connectivity Issues**:
  - Simulate database connection failures
  - Verify fallback to localStorage works properly
  - Test recovery when database connection is restored

### 2. Webhook Testing

Ensure webhook processing is robust:

- **Webhook Delivery Failures**:
  - Simulate webhook delivery errors
  - Verify events are stored for retry
  - Test the retry mechanism functions correctly

- **Concurrent Webhook Processing**:
  - Send multiple webhooks simultaneously
  - Verify all events are processed correctly
  - Test for race conditions in event processing

### 3. Load Testing

Test system performance under load:

- **High-Volume Subscription Changes**:
  - Simulate many subscription updates simultaneously
  - Verify database performance remains acceptable
  - Test caching effectiveness under load

- **Large-Scale Webhook Processing**:
  - Send high volume of webhook events
  - Verify processing queue handles backlog correctly
  - Test recovery from processing delays

### 4. Data Integrity Testing

Ensure subscription data remains accurate:

- **Subscription Synchronization**:
  - Modify subscription data in Stripe directly
  - Verify sync job correctly updates local database
  - Test handling of subscription state transitions

- **Error Recovery**:
  - Corrupt local subscription data
  - Verify system can heal and recover accuracy
  - Test manual intervention processes

### 5. UI Testing

Verify user experience remains acceptable:

- **Degraded Functionality Mode**:
  - Force system into degraded mode
  - Verify limited functionality works as expected
  - Test user notification and messaging

- **Subscription Upgrade Flow**:
  - Test complete subscription upgrade process
  - Verify handling of checkout failures
  - Test successful upgrade updates UI immediately

### 6. Reddit API Integration Testing

- **API Degradation Testing**:
  - Test Reddit API access during subscription service outages
  - Verify degraded functionality provides useful experience
  - Test offline access to previously cached subreddit data

- **Cache Resilience**:
  - Test aggressive caching strategies during API limitations
  - Verify stale data handling and UI indicators
  - Test synchronization when services come back online

## Monitoring and Alerting

Implement comprehensive monitoring to detect issues quickly:

### 1. Error Logging

Create detailed logging for subscription-related errors:

```typescript
// Create this utility for consistent error logging
export function logSubscriptionError(
  errorType: string,
  error: any,
  metadata: Record<string, any> = {}
) {
  const errorInfo = {
    type: errorType,
    timestamp: new Date().toISOString(),
    message: error.message || 'Unknown error',
    stack: error.stack,
    ...metadata
  };
  
  // Log to console
  console.error('Subscription error:', errorInfo);
  
  // Save to database for monitoring
  try {
    supabase
      .from('error_logs')
      .insert([{
        error_type: errorType,
        error_data: errorInfo,
        severity: getSeverityForErrorType(errorType)
      }]);
  } catch (logError) {
    // Fallback if database logging fails
    console.error('Failed to log error to database:', logError);
  }
  
  // For critical errors, trigger alert
  if (isCriticalError(errorType)) {
    try {
      sendAlertNotification(errorType, errorInfo);
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
  }
}

// Helper to determine error severity
function getSeverityForErrorType(errorType: string): string {
  const criticalErrors = [
    'webhook_processing_failed',
    'subscription_sync_failed',
    'customer_creation_failed'
  ];
  
  const warningErrors = [
    'checkout_session_retry',
    'subscription_verification_failed',
    'webhook_processing_delayed'
  ];
  
  if (criticalErrors.includes(errorType)) return 'critical';
  if (warningErrors.includes(errorType)) return 'warning';
  return 'info';
}
```

### 2. Health Checks

Create health check endpoints to monitor system status:

```typescript
// Create this API endpoint to check Stripe integration health
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed');
  }
  
  const checkResults: HealthCheckResult = {
    status: 'healthy',
    checks: {
      stripe_api: { status: 'unknown' },
      webhooks: { status: 'unknown' },
      database: { status: 'unknown' }
    },
    timestamp: new Date().toISOString()
  };
  
  // Check Stripe API
  try {
    // Make simple call to check Stripe availability
    await stripe.products.list({ limit: 1 });
    checkResults.checks.stripe_api = {
      status: 'healthy',
      latency: 'normal'
    };
  } catch (error) {
    checkResults.status = 'degraded';
    checkResults.checks.stripe_api = {
      status: 'unhealthy',
      error: error.message,
      latency: 'high'
    };
  }
  
  // Check webhook processing
  try {
    const { count, error } = await supabase
      .from('failed_webhook_events')
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    
    if (count && count > 10) {
      checkResults.status = 'degraded';
      checkResults.checks.webhooks = {
        status: 'degraded',
        message: `${count} failed webhook events in queue`
      };
    } else {
      checkResults.checks.webhooks = { status: 'healthy' };
    }
  } catch (error) {
    checkResults.status = 'degraded';
    checkResults.checks.webhooks = {
      status: 'unknown',
      error: error.message
    };
  }
  
  // Check database connectivity
  try {
    const startTime = Date.now();
    const { error } = await supabase
      .from('customer_subscriptions')
      .select('id', { count: 'exact', head: true });
    
    const latency = Date.now() - startTime;
    
    if (error) throw error;
    
    checkResults.checks.database = {
      status: 'healthy',
      latency: latency > 500 ? 'high' : 'normal'
    };
  } catch (error) {
    checkResults.status = 'critical';
    checkResults.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }
  
  // Return health check results
  const statusCode = checkResults.status === 'healthy' ? 200 :
                     checkResults.status === 'degraded' ? 200 : 500;
  
  return res.status(statusCode).json(checkResults);
}
```

### 3. Dashboard Metrics

Collect key metrics for monitoring:

- **Subscription Success Rate**: Track successful vs. failed checkout sessions
- **Webhook Processing Rate**: Monitor webhook processing success/failure
- **API Latency**: Track response times for Stripe API calls
- **Customer Acquisition**: Monitor new subscription creation rate
- **Support Issues**: Track subscription-related support tickets

### Conclusion

By implementing these recommendations with specific adaptations for the SubPirate architecture, the subscription system will be significantly more robust and resilient to external API failures. The system will be able to continue functioning with degraded capabilities during outages of Stripe, Supabase, or Reddit APIs, ensuring users maintain access to critical features and minimizing business impact from third-party service disruptions.

These improvements should be prioritized based on the implementation plan outlined above, with the highest priority given to the emergency protection measures that provide immediate robustness against the most common failure scenarios. 