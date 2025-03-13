import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: 'read' | 'edit' | 'owner';
  profile: Profile;
}

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

function ShareProjectModal({ isOpen, onClose, projectId, projectName }: ShareProjectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, projectId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          profile:profiles (
            id,
            display_name,
            email
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load project members');
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      // Filter out users who are already members
      const existingMemberIds = members.map(m => m.user_id);
      setSearchResults(data?.filter(user => !existingMemberIds.includes(user.id)) || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addMember = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_members')
        .insert([
          {
            project_id: projectId,
            user_id: userId,
            role: 'read'
          }
        ]);

      if (error) throw error;

      await fetchMembers();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, role: 'read' | 'edit' | 'owner') => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error('Error updating member role:', err);
      setError('Failed to update member role');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-1">Share Project</h2>
        <p className="text-gray-400 text-sm mb-6">
          Share "{projectName}" with other users
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                className="search-input w-full h-10 bg-[#0f0f0f] rounded-md"
                onChange={handleSearchChange}
                placeholder="Search users by name or email"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 bg-[#0f0f0f] rounded-lg divide-y divide-gray-800">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 first:rounded-t-lg last:rounded-b-lg hover:bg-[#1A1A1A] text-[#ffffff]"
                  >
                    <div>
                      <div className="font-medium">
                        {user.display_name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                    <button
                      onClick={() => addMember(user.id)}
                      className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                      disabled={loading}
                    >
                      <UserPlus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member list */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Members</h3>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-[#0f0f0f] p-3 rounded-lg text-[#ffffff]"
                >
                  <div>
                    <div className="font-medium">
                      {member.profile.display_name || 'Unnamed User'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {member.profile.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as 'read' | 'edit' | 'owner')}
                      className="bg-[#0f0f0f] border-none rounded-md px-3 py-1 text-sm focus:ring-1 focus:ring-[#333333]"
                    >
                      <option value="read">Read Only</option>
                      <option value="edit">Editor</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ShareProjectModal;