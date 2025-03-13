import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function TestWebhook() {
  const { user } = useAuth();
  const [testMode, setTestMode] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState<string>('');
  const [formData, setFormData] = useState({
    subscriptionId: 'sub_test_' + Date.now(),
    priceId: 'price_test',
    status: 'active',
    cancelAt: '',
    canceledAt: '',
    cancelAtPeriodEnd: false
  });
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Check if we're in a test environment
  useEffect(() => {
    const isTestEnvironment = window.location.hostname === 'localhost';
    setTestMode(isTestEnvironment);
    
    if (!isTestEnvironment) {
      alert('This page is only available in test mode!');
    }
  }, []);

  // Fetch the user's Stripe customer ID if they have one
  useEffect(() => {
    if (!user) return;

    async function getCustomerId() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', user?.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data?.stripe_customer_id) {
          setStripeCustomerId(data.stripe_customer_id);
        }
      } catch (err) {
        console.error('Error fetching customer ID:', err);
      }
    }
    
    getCustomerId();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const simulateWebhook = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!testMode) {
      alert('This feature is only available in test mode!');
      return;
    }
    
    if (!user) {
      alert('You must be logged in to use this feature!');
      return;
    }
    
    if (!stripeCustomerId) {
      alert('No Stripe customer ID found. Please create a customer first.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare a mock subscription object similar to what Stripe would send
      const mockSubscription = {
        id: formData.subscriptionId,
        customer: stripeCustomerId,
        status: formData.status,
        items: {
          data: [
            {
              price: {
                id: formData.priceId
              }
            }
          ]
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        cancel_at_period_end: formData.cancelAtPeriodEnd,
        canceled_at: formData.canceledAt ? Math.floor(new Date(formData.canceledAt).getTime() / 1000) : null,
        cancel_at: formData.cancelAt ? Math.floor(new Date(formData.cancelAt).getTime() / 1000) : null
      };
      
      // Call the webhook test endpoint directly or simulate the updateSubscriptionStatus function
      try {
        // First, let's try to directly update the database using the same logic as the webhook
        const { data: existingSubscription, error: fetchError } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', mockSubscription.id)
          .maybeSingle();
            
        if (fetchError) throw fetchError;
        
        if (existingSubscription) {
          // Update existing subscription
          const { data: updatedSubscription, error: updateError } = await supabase
            .from('customer_subscriptions')
            .update({
              status: mockSubscription.status,
              current_period_start: new Date(mockSubscription.current_period_start * 1000),
              current_period_end: new Date(mockSubscription.current_period_end * 1000),
              cancel_at_period_end: mockSubscription.cancel_at_period_end,
              canceled_at: mockSubscription.canceled_at ? new Date(mockSubscription.canceled_at * 1000) : null,
              cancel_at: mockSubscription.cancel_at ? new Date(mockSubscription.cancel_at * 1000) : null,
              updated_at: new Date()
            })
            .eq('id', existingSubscription.id)
            .select();
              
          if (updateError) throw updateError;
          setResults({ action: 'updated', subscription: updatedSubscription });
        } else {
          // Create new subscription
          const { data: newSubscription, error: insertError } = await supabase
            .from('customer_subscriptions')
            .insert({
              user_id: user.id,
              stripe_customer_id: mockSubscription.customer,
              stripe_subscription_id: mockSubscription.id,
              stripe_price_id: mockSubscription.items.data[0].price.id,
              status: mockSubscription.status,
              current_period_start: new Date(mockSubscription.current_period_start * 1000),
              current_period_end: new Date(mockSubscription.current_period_end * 1000),
              cancel_at_period_end: mockSubscription.cancel_at_period_end,
              canceled_at: mockSubscription.canceled_at ? new Date(mockSubscription.canceled_at * 1000) : null,
              cancel_at: mockSubscription.cancel_at ? new Date(mockSubscription.cancel_at * 1000) : null,
              created_at: new Date(),
              updated_at: new Date()
            })
            .select();
                
          if (insertError) throw insertError;
          setResults({ action: 'created', subscription: newSubscription });
        }
        
        alert('Test webhook simulation completed successfully!');
      } catch (dbError: any) {
        console.error('Database error during simulation:', dbError);
        setResults({ error: true, message: dbError.message });
        alert(`Error during simulation: ${dbError.message}`);
      }
    } catch (err: any) {
      console.error('Error simulating webhook:', err);
      setResults({ error: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const createStripeCustomer = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if user already has a customer ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profileError) throw profileError;
      
      if (profile?.stripe_customer_id) {
        setStripeCustomerId(profile.stripe_customer_id);
        alert(`User already has a Stripe customer ID: ${profile.stripe_customer_id}`);
        return;
      }
      
      // For test environments, we'll create a mock customer ID
      const mockCustomerId = `cus_test_${Date.now()}`;
      
      // Update the profile with the mock customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: mockCustomerId })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setStripeCustomerId(mockCustomerId);
      alert(`Created mock Stripe customer ID: ${mockCustomerId}`);
    } catch (err: any) {
      console.error('Error creating customer:', err);
      alert(`Error creating customer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!testMode) {
    return (
      <div className="w-full text-white bg-gray-900">
        <h1 className="text-2xl font-bold mb-6">Test Webhook Page</h1>
        <div className="bg-red-800 text-white p-4 rounded">
          This page is only available in test mode (localhost).
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-white">
      <h1 className="text-2xl font-bold mb-6">Test Webhook</h1>
      
      <div className="bg-amber-100 border border-amber-300 rounded-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-amber-800 mb-2">Test Mode Active</h2>
        <p className="text-amber-700 mb-2">
          This page allows you to simulate Stripe webhook events for testing purposes.
        </p>
        <p className="text-amber-700">
          Current user ID: <code className="bg-amber-200 px-1 rounded">{user?.id}</code>
        </p>
        <p className="text-amber-700">
          Stripe customer ID: {stripeCustomerId ? (
            <code className="bg-amber-200 px-1 rounded">{stripeCustomerId}</code>
          ) : (
            <button 
              onClick={createStripeCustomer}
              className="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs ml-2"
              disabled={loading}
            >
              Create Test Customer
            </button>
          )}
        </p>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Simulate Webhook Event</h2>
        
        <form onSubmit={simulateWebhook}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Subscription ID</label>
              <input
                type="text"
                name="subscriptionId"
                value={formData.subscriptionId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Price ID</label>
              <input
                type="text"
                name="priceId"
                value={formData.priceId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                required
              >
                <option value="active">active</option>
                <option value="trialing">trialing</option>
                <option value="canceled">canceled</option>
                <option value="incomplete">incomplete</option>
                <option value="incomplete_expired">incomplete_expired</option>
                <option value="past_due">past_due</option>
                <option value="unpaid">unpaid</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Cancel At Period End</label>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  name="cancelAtPeriodEnd"
                  checked={formData.cancelAtPeriodEnd}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 bg-gray-700"
                />
                <span className="ml-2 text-sm text-white">Enable</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Cancel At (optional)</label>
              <input
                type="datetime-local"
                name="cancelAt"
                value={formData.cancelAt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Canceled At (optional)</label>
              <input
                type="datetime-local"
                name="canceledAt"
                value={formData.canceledAt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading || !stripeCustomerId}
          >
            {loading ? 'Processing...' : 'Simulate Webhook'}
          </button>
        </form>
      </div>
      
      {results && (
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          {results.error ? (
            <div className="bg-red-800 text-white p-4 rounded mb-4">
              <h3 className="font-semibold mb-1">Error</h3>
              <p>{results.message}</p>
            </div>
          ) : (
            <div className="bg-green-800 text-white p-4 rounded mb-4">
              <h3 className="font-semibold mb-1">Success</h3>
              <p>Subscription {results.action} successfully!</p>
            </div>
          )}
          
          <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 