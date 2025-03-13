import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, ChevronRight, Trash2, Share2, AlertTriangle } from 'lucide-react';
import ShareProjectModal from '../components/ShareProjectModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import CreateProjectModal from '../components/CreateProjectModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const openShareModal = (project: Project) => {
    setSelectedProject(project);
    setIsShareModalOpen(true);
  };

  const openSettingsModal = (project: Project) => {
    setSelectedProject(project);
    setIsSettingsModalOpen(true);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  const getProjectImage = (project: Project) => {
    if (project.image_url) return project.image_url;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`;
  };

  const handleCreateProject = async (projectData: { name: string; description: string | null; image_url: string | null }) => {
    try {
      // Check if a project with this name already exists for the user
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('name', projectData.name)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingProject) {
        setError('A project with this name already exists');
        return;
      }

      // Create new project
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description,
          image_url: projectData.image_url,
          user_id: user?.id
        });

      if (projectError) {
        if (projectError.code === '23505') {
          setError('A project with this name already exists');
        } else {
          throw projectError;
        }
        return;
      }

      // Refresh the projects list
      setIsCreateModalOpen(false);
      fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">Projects <span className="text-[#C69B7B]">Management</span></h1>
        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Organize your subreddit targets into strategic marketing campaigns for better tracking and collaboration.
        </p>
      </div>

      <div className="flex items-center justify-end mb-8">
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="primary flex items-center justify-center gap-2 text-sm md:text-base h-10 md:h-11">
          <Plus size={20} />
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
          <AlertTriangle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-[#111111] rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first project to start analyzing subreddits
          </p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="primary flex items-center justify-center gap-2 mx-auto h-10 md:h-11">
            <Plus size={20} />
            New Project
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] rounded-lg overflow-hidden">
          <div className="divide-y divide-[#222222]">
            {projects.map((project) => (
              <article
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-[#1A1A1A] transition-colors group cursor-pointer"
              >
                <div className="w-16 sm:w-12 h-16 sm:h-12 rounded-lg bg-[#1A1A1A] overflow-hidden group-hover:bg-[#222222] transition-colors flex-shrink-0">
                  <img 
                    src={getProjectImage(project)}
                    alt={project.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-medium text-lg sm:text-base truncate">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 sm:line-clamp-1">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center mt-4 sm:mt-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openShareModal(project);
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title="Share Project"
                  >
                    <Share2 size={20} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openSettingsModal(project);
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title="Project Settings"
                  >
                    <Settings size={20} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title="Delete Project"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="text-gray-400 p-2">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedProject && (
        <>
          <ShareProjectModal
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setSelectedProject(null);
            }}
            projectId={selectedProject.id}
            projectName={selectedProject.name}
          />
          <ProjectSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => {
              setIsSettingsModalOpen(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            onUpdate={handleProjectUpdate}
          />
        </>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}

export default Projects;