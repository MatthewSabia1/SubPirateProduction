import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: { name: string; description: string | null; image_url: string | null }) => Promise<void>;
  defaultName?: string;
  defaultDescription?: string;
}

function CreateProjectModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  defaultName = '',
  defaultDescription = ''
}: CreateProjectModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
      const fileName = `${Date.now()}.${fileExt}`;
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
    if (!name.trim() || saving || !user) return;

    setSaving(true);
    setError(null);

    try {
      // Call onSubmit with the project data instead of creating it here
      // This prevents duplicate project creation since the parent component will handle it
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl
      });

      // No need to call onClose() here as the parent component will do this
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
      setSaving(false); // Only reset saving state on error
    }
    // Note: We don't reset saving state on success because the modal will be closed by the parent
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-1">Create New Project</h2>
        <p className="text-gray-400 text-sm mb-6">
          Create a new project to organize your subreddits
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Project Image</label>
            <div className="inline-block relative group">
              <div className="w-24 h-24 bg-[#0f0f0f] rounded-lg overflow-hidden">
                <img 
                  src={getProjectImage()}
                  alt={name}
                  className="w-full h-full object-cover"
                />
                {uploadProgress !== null && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-4/5">
                      <div className="h-1 bg-[#222222] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#C69B7B] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="text-center text-xs mt-1 text-white">
                        {Math.round(uploadProgress)}%
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#C69B7B] hover:bg-[#B38A6A] h-7 px-2.5 rounded text-xs font-medium text-white flex items-center gap-1 transition-colors"
                    disabled={uploadProgress !== null}
                  >
                    <Upload size={12} />
                    Change
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="bg-red-500/20 hover:bg-red-500/30 h-7 px-2.5 rounded text-xs font-medium text-red-400 flex items-center gap-1 transition-colors"
                      disabled={uploadProgress !== null}
                    >
                      <X size={12} />
                      Remove
                    </button>
                  )}
                </div>
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
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Recommended size: 128x128px. Max file size: 5MB
            </p>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              type="submit" 
              className="primary flex-1"
              disabled={saving || !name.trim() || uploadProgress !== null}
            >
              {saving ? 'Creating...' : 'Create Project'}
            </button>
            <button 
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={saving || uploadProgress !== null}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default CreateProjectModal;