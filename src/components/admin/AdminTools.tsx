import React, { useState } from 'react';
import { ShieldCheck, Gift, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function AdminTools() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<'admin' | 'gift'>('gift');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Handle form submission to create a special role user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!name) {
      setError('Please enter a name');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // First check if the user already exists
      const { data: existingUser, error: searchError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();
      
      if (searchError) throw searchError;
      
      // If user exists, update their role
      if (existingUser) {
        // Call the RPC function to set user role
        const { error: updateError } = await supabase
          .rpc('set_user_role', { 
            user_id: existingUser.id, 
            new_role: roleType 
          });
        
        if (updateError) throw updateError;
        
        setSuccess(`User ${email} already exists. Role updated to ${roleType}.`);
        return;
      }
      
      // User doesn't exist, create a new one using a server-side RPC function
      // instead of directly calling the admin API
      const { data: newUserData, error: createError } = await supabase
        .rpc('create_special_user', {
          user_email: email,
          user_name: name,
          user_role: roleType,
          redirect_url: `${window.location.origin}/reset-password`
        });
      
      if (createError) throw createError;
      
      if (!newUserData || !newUserData.success) {
        throw new Error(newUserData?.message || 'Failed to create user');
      }
      
      setSuccess(`User ${email} created with ${roleType} role. A password reset email has been sent.`);
      
      // Reset form
      setEmail('');
      setName('');
      
    } catch (err: any) {
      console.error('Error creating special user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Admin Tools</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#111111] rounded-lg p-6">
          <h3 className="text-lg font-medium flex items-center mb-4">
            <UserPlus className="mr-2 text-[#D4B675]" size={20} />
            Create Special Role User
          </h3>
          
          {success && (
            <div className="bg-green-900/20 text-green-400 p-3 rounded-lg mb-4 flex items-center">
              <CheckCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 text-red-400 p-3 rounded-lg mb-4 flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleCreateUser}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-sm">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4B675]"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-2 text-sm">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User's Name"
                className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4B675]"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-400 mb-2 text-sm">Role Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="roleType"
                    checked={roleType === 'gift'}
                    onChange={() => setRoleType('gift')}
                    className="w-4 h-4 mr-2"
                  />
                  <Gift size={16} className="mr-1 text-[#D4B675]" />
                  <span>Gift User</span>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="roleType"
                    checked={roleType === 'admin'}
                    onChange={() => setRoleType('admin')}
                    className="w-4 h-4 mr-2"
                  />
                  <ShieldCheck size={16} className="mr-1 text-red-400" />
                  <span>Admin User</span>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded-lg flex items-center justify-center ${
                roleType === 'admin' 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-[#D4B675] hover:bg-[#C4A665]'
              } text-white font-medium`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {roleType === 'admin' ? <ShieldCheck size={16} className="mr-2" /> : <Gift size={16} className="mr-2" />}
                  Create {roleType === 'admin' ? 'Admin' : 'Gift'} User
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-[#111111] rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Role Descriptions</h3>
          
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <Gift size={18} className="mr-2 text-[#D4B675]" />
              <h4 className="font-medium">Gift User</h4>
            </div>
            <p className="text-gray-400 text-sm ml-6">
              Gift users receive all Pro-tier features without requiring payment. 
              They can be created for partners, testers, or promotional purposes. 
              They have access to all premium features but don't have administrative capabilities.
            </p>
          </div>
          
          <div>
            <div className="flex items-center mb-2">
              <ShieldCheck size={18} className="mr-2 text-red-400" />
              <h4 className="font-medium">Admin User</h4>
            </div>
            <p className="text-gray-400 text-sm ml-6">
              Admin users have full access to all features and administrative capabilities.
              They can manage users, view analytics, modify settings, and access this admin panel.
              Only create admin users for trusted team members who need full system access.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-[#111111] rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">How Special Users Work</h3>
        
        <div className="text-sm text-gray-400 space-y-4">
          <p>
            When you create a special role user (Admin or Gift), they will receive an email to set their password.
            Once they log in, they will automatically have the appropriate role permissions applied.
          </p>
          
          <p>
            <span className="text-[#D4B675] font-medium">Gift users</span> receive full premium features without 
            needing to provide payment information. This is useful for partners, beta testers, or promotional purposes.
          </p>
          
          <p>
            <span className="text-red-400 font-medium">Admin users</span> receive full system access including this admin panel.
            They can manage other users, view system-wide metrics, and perform administrative tasks.
          </p>
          
          <p>
            Both types of special users bypass the normal subscription process. Their status is managed
            directly through the database and is not tied to Stripe subscriptions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminTools; 