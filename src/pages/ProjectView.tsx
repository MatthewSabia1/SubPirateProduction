import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Share2, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProjectSubreddits from '../components/ProjectSubreddits';
import ShareProjectModal from '../components/ShareProjectModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }
    fetchProject();
    fetchPostCounts();
  }, [projectId]);

  const fetchPostCounts = async () => {
    try {
      // Get all connected Reddit accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('reddit_accounts')
        .select('id, total_posts_24h');

      if (accountsError) throw accountsError;

      // Sum up total posts for all accounts
      const totalPosts = (accounts || []).reduce((sum, account) => sum + (account.total_posts_24h || 0), 0);
      
      setPostCounts({ total: totalPosts });
    } catch (err) {
      console.error('Error fetching post counts:', err);
    }
  };

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Project not found');
      
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading project...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg">
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="text-gray-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10 flex-shrink-0 hidden md:block"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:hidden mb-2">
              <button
                onClick={() => navigate('/projects')}
                className="text-gray-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-xl font-bold truncate">{project.name}</h1>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold truncate hidden md:block">{project.name}</h1>
            {project.description && (
              <p className="text-gray-400 mt-1 line-clamp-2 md:line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto mt-2 md:mt-0">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="secondary flex items-center gap-2 text-sm md:text-base h-9 md:h-10"
          >
            <Share2 size={20} />
            <span className="hidden md:inline">Share</span>
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="secondary flex items-center gap-2 text-sm md:text-base h-9 md:h-10"
          >
            <Settings size={20} />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Subreddits List */}
      <div className="mt-4 md:mt-8 overflow-x-auto">
        <ProjectSubreddits projectId={project.id} />
      </div>

      {/* Modals */}
      <ShareProjectModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />
      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        project={project}
        onUpdate={handleProjectUpdate}
      />
    </div>
  );
}

export default ProjectView;