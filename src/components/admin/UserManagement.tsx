import React, { useState, useEffect } from 'react';
import { Key, Search, X, UserCog, Trash2, RefreshCw, Mail, ShieldCheck, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserData {
  id: string;
  display_name: string | null;
  email: string | null;
  image_url: string | null;
  created_at: string;
  role: string | null;
  subscription_tier: string | null;
  subscription_end: string | null;
  subscription_id: string | null;
}

interface UserManagementProps {
  onSelectUser: (userId: string, userName: string | null) => void;
}

function UserManagement({ onSelectUser }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name', { ascending: true });
      
      if (profilesError) throw profilesError;
      
      // Fetch all subscriptions - using simple query
      const { data: subscriptions, error: subsError } = await supabase
        .from('customer_subscriptions')
        .select('*');
      
      if (subsError) throw subsError;
      
      // Fetch all prices separately
      const { data: prices, error: pricesError } = await supabase
        .from('stripe_prices')
        .select('*');
        
      if (pricesError) throw pricesError;
      
      // Fetch all products separately
      const { data: products, error: productsError } = await supabase
        .from('stripe_products')
        .select('*');
        
      if (productsError) throw productsError;
      
      // Map subscription data to users
      const userData: UserData[] = profiles.map((profile: any) => {
        // Find subscription for this user
        const userSubscription = subscriptions?.find(
          (sub: any) => sub.user_id === profile.id && 
          new Date(sub.current_period_end) > new Date() &&
          sub.status === 'active'
        );
        
        // Get subscription tier name if exists
        let subscriptionTier = null;
        let subscriptionEnd = null;
        let subscriptionId = null;
        
        if (userSubscription) {
          // Get associated price
          const priceData = prices?.find(price => price.id === userSubscription.stripe_price_id);
          
          // Get associated product
          const productData = priceData && products?.find(
            product => product.stripe_product_id === priceData.stripe_product_id
          );
          
          // Get tier from product metadata if available
          subscriptionTier = productData?.metadata?.tier || 
                            (productData?.name ? productData.name : 'Unknown Tier');
          subscriptionEnd = userSubscription.current_period_end;
          subscriptionId = userSubscription.stripe_subscription_id;
        }
        
        return {
          id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          image_url: profile.image_url,
          created_at: profile.created_at,
          role: profile.role,
          subscription_tier: subscriptionTier,
          subscription_end: subscriptionEnd,
          subscription_id: subscriptionId
        };
      });
      
      setUsers(userData);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(`Failed to load users: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };
  
  // Update user role
  const updateUserRole = async (userId: string, newRole: 'admin' | 'gift' | null) => {
    try {
      setActionFeedback(null);
      
      const { error } = await supabase
        .rpc('set_user_role', { 
          user_id: userId, 
          new_role: newRole 
        });
      
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setActionFeedback({
        message: `User role updated to ${newRole || 'regular user'}`,
        type: 'success'
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => setActionFeedback(null), 3000);
      
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setActionFeedback({
        message: `Failed to update role: ${err.message}`,
        type: 'error'
      });
    }
  };
  
  // Reset user password
  const resetPassword = async (email: string | null) => {
    if (!email) {
      setActionFeedback({
        message: 'No email address for this user',
        type: 'error'
      });
      return;
    }
    
    try {
      setActionFeedback(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      setActionFeedback({
        message: `Password reset email sent to ${email}`,
        type: 'success'
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => setActionFeedback(null), 3000);
      
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setActionFeedback({
        message: `Failed to send reset email: ${err.message}`,
        type: 'error'
      });
    }
  };
  
  // Delete user
  const deleteUser = async (userId: string, email: string | null) => {
    if (!confirm(`Are you sure you want to delete ${email || 'this user'}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionFeedback(null);
      
      // Delete from profiles first (should cascade due to DB constraints)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // Call Supabase auth API to delete the user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) throw authError;
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      
      setActionFeedback({
        message: `User ${email || userId} has been deleted`,
        type: 'success'
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => setActionFeedback(null), 3000);
      
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setActionFeedback({
        message: `Failed to delete user: ${err.message}`,
        type: 'error'
      });
    }
  };
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (user.display_name?.toLowerCase().includes(query)) ||
      (user.email?.toLowerCase().includes(query)) ||
      (user.id.toLowerCase().includes(query))
    );
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-[#111111] rounded-lg border border-[#333333] focus:outline-none focus:ring-2 focus:ring-[#D4B675] w-64"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {actionFeedback && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          actionFeedback.type === 'success' 
            ? 'bg-green-900/20 text-green-400' 
            : 'bg-red-900/20 text-red-400'
        }`}>
          {actionFeedback.message}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4B675] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 text-red-400 p-4 rounded-lg mb-4">
          {error}
        </div>
      ) : (
        <div className="bg-[#0a0a0a] rounded-lg border border-[#333333] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333333] bg-[#111111]">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Created</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    {searchQuery ? 'No users match your search' : 'No users found in the database'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-[#222222] hover:bg-[#111111]">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full overflow-hidden mr-3 bg-[#222222] flex-shrink-0">
                          {user.image_url ? (
                            <img 
                              src={user.image_url} 
                              alt={user.display_name || ''} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => onSelectUser(user.id, user.display_name)}
                          className="font-medium hover:text-[#D4B675] truncate max-w-[200px]"
                        >
                          {user.display_name || 'Unnamed User'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">
                      {user.email || 'No email'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400">
                            <ShieldCheck size={12} className="mr-1" />
                            Admin
                          </span>
                        )}
                        {user.role === 'gift' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400">
                            <Gift size={12} className="mr-1" />
                            Gift
                          </span>
                        )}
                        {user.subscription_tier && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#D4B675]/30 text-[#D4B675]">
                            {user.subscription_tier}
                          </span>
                        )}
                        {!user.role && !user.subscription_tier && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-400">
                            Free
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => onSelectUser(user.id, user.display_name)}
                        title="View User Details"
                        className="p-1.5 inline-flex items-center justify-center bg-[#222222] rounded-md hover:bg-[#333333]"
                      >
                        <UserCog size={16} />
                      </button>
                      
                      <div className="inline-block relative group">
                        <button
                          title="Change User Role"
                          className="p-1.5 inline-flex items-center justify-center bg-[#222222] rounded-md hover:bg-[#333333]"
                        >
                          {user.role === 'admin' ? (
                            <ShieldCheck size={16} className="text-red-400" />
                          ) : user.role === 'gift' ? (
                            <Gift size={16} className="text-yellow-400" />
                          ) : (
                            <ShieldCheck size={16} className="text-gray-400" />
                          )}
                        </button>
                        
                        <div className="absolute right-0 mt-1 w-36 bg-[#111111] border border-[#333333] rounded-md shadow-lg z-10 hidden group-hover:block">
                          <button
                            onClick={() => updateUserRole(user.id, null)}
                            className={`block w-full text-left px-3 py-2 hover:bg-[#222222] ${!user.role ? 'text-[#D4B675]' : 'text-gray-300'}`}
                          >
                            Regular User
                          </button>
                          <button
                            onClick={() => updateUserRole(user.id, 'gift')}
                            className={`block w-full text-left px-3 py-2 hover:bg-[#222222] flex items-center ${user.role === 'gift' ? 'text-[#D4B675]' : 'text-gray-300'}`}
                          >
                            <Gift size={14} className="mr-2 text-yellow-400" />
                            Gift User
                          </button>
                          <button
                            onClick={() => updateUserRole(user.id, 'admin')}
                            className={`block w-full text-left px-3 py-2 hover:bg-[#222222] flex items-center ${user.role === 'admin' ? 'text-[#D4B675]' : 'text-gray-300'}`}
                          >
                            <ShieldCheck size={14} className="mr-2 text-red-400" />
                            Admin
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => resetPassword(user.email)}
                        title="Reset Password"
                        className="p-1.5 inline-flex items-center justify-center bg-[#222222] rounded-md hover:bg-[#333333]"
                      >
                        <Key size={16} />
                      </button>
                      
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        title="Delete User"
                        className="p-1.5 inline-flex items-center justify-center bg-[#222222] rounded-md hover:bg-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="flex justify-end mt-4">
        <button
          onClick={fetchUsers}
          className="flex items-center px-4 py-2 bg-[#111111] hover:bg-[#222222] rounded-lg"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
      </div>
    </div>
  );
}

export default UserManagement; 