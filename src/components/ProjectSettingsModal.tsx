import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';
import { Upload, X, Share2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

function ProjectSettingsModal({ isOpen, onClose, project, onUpdate }: ProjectSettingsModalProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [imageUrl, setImageUrl] = useState(project.image_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProjectImage = () => {
    if (imageUrl) return imageUrl;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${name}&backgroundColor=0f0f0f`;
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError(null);
    setUploadProgress(0);

    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}-${Date.now()}.${fileExt}`;
      const filePath = `project-images/${fileName}`;

      // Upload the file
      const { error: uploadError, data } = await supabase.storage
        .from('project_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          },
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project_images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      setUploadProgress(null);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
      setUploadProgress(null);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error('Failed to update project');

      onUpdate(data);
      onClose();
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="bg-[#111111]">
      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-2">Project Settings</h2>
        <p className="text-gray-500 text-base mb-8">
          Update your project details or manage project settings.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-base mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#C69B7B]"
              required
            />
          </div>

          {/* Project Image */}
          <div>
            <label className="block text-base mb-2">Project Image</label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 bg-[#0A0A0A] rounded-lg overflow-hidden border border-[#333333]">
                <img 
                  src={getProjectImage()}
                  alt={name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Upload size={20} className="text-white" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              <div className="text-sm text-gray-500">
                Choose File
                <span className="block text-gray-600">No file chosen</span>
              </div>
            </div>
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-base mb-2">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#C69B7B]"
            />
          </div>

          {/* Share Project Button */}
          <div className="pt-4 border-t border-[#222222]">
            <button type="button" className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg px-4 py-3 text-white hover:bg-[#111111] transition-colors flex items-center justify-center gap-2">
              <Share2 size={20} />
              Share Project
            </button>
          </div>
          
          {/* Delete Project Warning */}
          <div className="mt-8 pt-8 border-t border-[#222222]">
            <p className="text-red-500 mb-4">
              Deleting this project will remove all its data and cannot be undone.
            </p>
            <button 
              type="button"
              onClick={() => {/* TODO: Implement delete */}}
              className="w-full bg-red-900/20 text-red-500 hover:bg-red-900/30 rounded-lg px-4 py-3 transition-colors"
            >
              Delete Project
            </button>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              type="submit"
              className="flex-1 bg-[#C69B7B] hover:bg-[#B38A6A] text-white rounded-lg px-4 py-3 font-medium transition-colors disabled:opacity-50"
              disabled={saving || !name.trim()}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-[#0A0A0A] hover:bg-[#111111] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default ProjectSettingsModal;