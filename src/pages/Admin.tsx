import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, BarChart3, Wrench, ShieldCheck } from 'lucide-react';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { supabase } from '../lib/supabase';
import UserManagement from '../components/admin/UserManagement';
import AdminMetrics from '../components/admin/AdminMetrics';
import UserDetails from '../components/admin/UserDetails';
import AdminTools from '../components/admin/AdminTools';
import { useAuth } from '../contexts/AuthContext';

// Define the interface for UserDetails component props
interface UserDetailsProps {
  userId: string;
}

function Admin() {
  const { isAdmin, isLoading } = useFeatureAccess();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'tools'>('metrics');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  // Check if we're in a test environment
  useEffect(() => {
    const isTestEnvironment = window.location.hostname === 'localhost';
    setTestMode(isTestEnvironment);
  }, []);

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        if (!user) return;
        
        // Load subscriptions from both tables
        const { data: subs1, error: error1 } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id);
          
        const { data: subs2, error: error2 } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('user_id', user.id);
          
        if (error1) throw error1;
        if (error2) throw error2;
        
        const combinedSubs = [
          ...(subs1 || []).map(s => ({ ...s, source: 'subscriptions' })),
          ...(subs2 || []).map(s => ({ ...s, source: 'customer_subscriptions' }))
        ];
        
        setSubscriptions(combinedSubs);
      } catch (err: any) {
        console.error('Error loading subscriptions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadSubscriptions();
  }, [user]);

  // Function to create a test subscription in the database directly
  async function createTestSubscription() {
    try {
      if (!user) return;
      if (!testMode) {
        alert("This function is only available in test mode!");
        return;
      }
      
      // Create a subscription directly in the database for testing
      const testSubData = {
        user_id: user.id,
        stripe_customer_id: `cus_test_${Date.now()}`,
        stripe_subscription_id: `sub_test_${Date.now()}`,
        stripe_price_id: 'price_test',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancel_at_period_end: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .insert(testSubData)
        .select();
        
      if (error) throw error;
      
      alert('Test subscription created successfully!');
      window.location.reload();
    } catch (err: any) {
      console.error('Error creating test subscription:', err);
      alert(`Error creating test subscription: ${err.message}`);
    }
  }

  // Function to delete a subscription from the database
  async function deleteSubscription(id: string, source: string) {
    try {
      if (!user) return;
      if (!testMode) {
        alert("This function is only available in test mode!");
        return;
      }
      
      if (!confirm('Are you sure you want to delete this subscription?')) {
        return;
      }
      
      const { error } = await supabase
        .from(source)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      alert('Subscription deleted successfully!');
      window.location.reload();
    } catch (err: any) {
      console.error('Error deleting subscription:', err);
      alert(`Error deleting subscription: ${err.message}`);
    }
  }

  // Show loading state while determining admin status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4B675] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-8 w-full max-w-screen-2xl mx-auto">
      <div className="flex items-center mb-8">
        <ShieldCheck className="text-red-500 mr-2" size={24} />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Navigation */}
      {!selectedUser ? (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              activeTab === 'metrics'
                ? 'bg-[#D4B675] text-white'
                : 'bg-[#111111] hover:bg-[#222222]'
            }`}
          >
            <BarChart3 size={18} className="mr-2" />
            Metrics
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              activeTab === 'users'
                ? 'bg-[#D4B675] text-white'
                : 'bg-[#111111] hover:bg-[#222222]'
            }`}
          >
            <Users size={18} className="mr-2" />
            User Management
          </button>
          
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              activeTab === 'tools'
                ? 'bg-[#D4B675] text-white'
                : 'bg-[#111111] hover:bg-[#222222]'
            }`}
          >
            <Wrench size={18} className="mr-2" />
            Admin Tools
          </button>
        </div>
      ) : (
        <div className="flex items-center mb-6">
          <button
            onClick={() => {
              setSelectedUser(null);
              setSelectedUserName(null);
            }}
            className="px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#222222] flex items-center mr-3"
          >
            <Users size={18} className="mr-2" />
            User Management
          </button>
          
          <ChevronRight size={16} className="text-gray-500 mr-3" />
          
          <div className="bg-[#111111] px-4 py-2 rounded-lg">
            {selectedUserName || selectedUser}
          </div>
        </div>
      )}

      {/* Content */}
      {selectedUser ? (
        <UserDetails userId={selectedUser} />
      ) : (
        <>
          {activeTab === 'metrics' && <AdminMetrics />}
          {activeTab === 'users' && (
            <UserManagement 
              onSelectUser={(userId: string, userName: string | null) => {
                setSelectedUser(userId);
                setSelectedUserName(userName);
              }} 
            />
          )}
          {activeTab === 'tools' && <AdminTools />}
        </>
      )}

      {testMode && (
        <div className="mt-8 p-4 bg-amber-100 border border-amber-300 rounded-md">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Test Mode Active</h2>
          <p className="text-amber-700 mb-4">You're running in a test environment. Use the options below to manage test subscriptions.</p>
          
          <button 
            onClick={createTestSubscription}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Create Test Subscription
          </button>
        </div>
      )}
      
      <div className="mt-8 bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
        
        {loading ? (
          <p>Loading subscription data...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : subscriptions.length === 0 ? (
          <p>No subscriptions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-700 rounded">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-2 border-b border-gray-600 text-left">ID</th>
                  <th className="px-4 py-2 border-b border-gray-600 text-left">Source</th>
                  <th className="px-4 py-2 border-b border-gray-600 text-left">Status</th>
                  <th className="px-4 py-2 border-b border-gray-600 text-left">Customer ID</th>
                  <th className="px-4 py-2 border-b border-gray-600 text-left">Start Date</th>
                  <th className="px-4 py-2 border-b border-gray-600 text-left">End Date</th>
                  {testMode && (
                    <th className="px-4 py-2 border-b border-gray-600 text-left">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={`${sub.source}-${sub.id}`} className="hover:bg-gray-700">
                    <td className="px-4 py-2 border-b border-gray-600">{sub.id}</td>
                    <td className="px-4 py-2 border-b border-gray-600">{sub.source}</td>
                    <td className="px-4 py-2 border-b border-gray-600">
                      <span 
                        className={`px-2 py-1 rounded text-xs ${
                          sub.status === 'active' ? 'bg-green-800 text-green-100' : 
                          sub.status === 'trialing' ? 'bg-blue-800 text-blue-100' : 
                          sub.status === 'canceled' ? 'bg-red-800 text-red-100' : 
                          'bg-gray-600 text-gray-100'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b border-gray-600">{sub.stripe_customer_id}</td>
                    <td className="px-4 py-2 border-b border-gray-600">
                      {new Date(sub.current_period_start).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-600">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </td>
                    {testMode && (
                      <td className="px-4 py-2 border-b border-gray-600">
                        <button
                          onClick={() => deleteSubscription(sub.id, sub.source)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin; 