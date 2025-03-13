import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Telescope, 
  BookmarkCheck, 
  BarChart3,
  Calendar, 
  FolderKanban, 
  Users, 
  Settings, 
  LogOut,
  Upload,
  X,
  Menu,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface Profile {
  display_name: string | null;
  image_url: string | null;
}

function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useFeatureAccess();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `user_images/${fileName}`;

      // Delete old image if exists
      if (profile?.image_url) {
        const oldPath = profile.image_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('user_images')
          .remove([oldPath]);
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_images')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Profile will be automatically updated via auth subscription
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !profile?.image_url) return;

    try {
      const filePath = profile.image_url.split('/').slice(-2).join('/');
      
      // Delete from storage
      await supabase.storage
        .from('user_images')
        .remove([filePath]);

      // Update profile
      await supabase
        .from('profiles')
        .update({ image_url: null })
        .eq('id', user.id);

      // Profile will be automatically updated via auth subscription
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const getProfileImage = () => {
    if (profile?.image_url) return profile.image_url;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.display_name || user?.email}&backgroundColor=111111`;
  };

  return (
    <div className={`sidebar ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Logo size="md" className="ml-1" />
          <button
            onClick={onMobileClose}
            className="md:hidden text-gray-400 hover:text-white p-2 -mr-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      </div>
      
      <nav className="mt-4">
        <button 
          onClick={() => handleNavigation('/dashboard')}
          className={`sidebar-link w-full text-left ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          <Search size={20} />
          Analyze
        </button>
        <button
          onClick={() => handleNavigation('/spyglass')}
          className={`sidebar-link w-full text-left ${location.pathname === '/spyglass' ? 'active' : ''}`}
        >
          <Telescope size={20} />
          SpyGlass
        </button>
        <button
          onClick={() => handleNavigation('/analytics')}
          className={`sidebar-link w-full text-left ${location.pathname === '/analytics' ? 'active' : ''}`}
        >
          <BarChart3 size={20} />
          Analytics
        </button>
        <button
          onClick={() => handleNavigation('/saved')}
          className={`sidebar-link w-full text-left ${location.pathname === '/saved' ? 'active' : ''}`}
        >
          <BookmarkCheck size={20} />
          Saved List
        </button>
        <button
          onClick={() => handleNavigation('/calendar')}
          className={`sidebar-link w-full text-left ${location.pathname === '/calendar' ? 'active' : ''}`}
        >
          <Calendar size={20} />
          Calendar
        </button>
        <button
          onClick={() => handleNavigation('/projects')}
          className={`sidebar-link w-full text-left ${location.pathname === '/projects' ? 'active' : ''}`}
        >
          <FolderKanban size={20} />
          Projects
        </button>
        <button
          onClick={() => handleNavigation('/accounts')}
          className={`sidebar-link w-full text-left ${location.pathname === '/accounts' ? 'active' : ''}`}
        >
          <Users size={20} />
          Reddit Accounts
        </button>
        
        {/* Admin Panel Link - Only visible to admins */}
        {isAdmin && (
          <button
            onClick={() => handleNavigation('/admin')}
            className={`sidebar-link w-full text-left ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            <ShieldCheck size={20} />
            Admin Panel
          </button>
        )}
      </nav>

      <div className="absolute bottom-0 left-0 w-full border-t border-[#333333]">
        <div className="p-4">
          <div className="group relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-[#0f0f0f] overflow-hidden">
                  <img 
                    src={getProfileImage()}
                    alt={profile?.display_name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1 text-[#ffffff]">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <div className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                      <Upload 
                        size={16} 
                        className="text-white"
                      />
                    </div>
                  </label>
                  {profile?.image_url && (
                    <button
                      onClick={handleRemoveImage}
                      className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {profile?.display_name || 'Unnamed User'}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            {error && (
              <div className="absolute bottom-full left-0 w-full mb-2 p-2 bg-red-900/50 text-red-400 text-xs rounded">
                {error}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => handleNavigation('/settings')}
          className={`sidebar-link w-full text-left ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <Settings size={20} />
          Settings
        </button>
        <button onClick={handleLogout} className="sidebar-link w-full text-left">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;