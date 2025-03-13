import React, { useState, useEffect, useRef } from 'react';
import { Search, Telescope, Bookmark, FolderPlus, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Check, Users, MessageCircle, Calendar, Activity, History } from 'lucide-react';
import { redditApi, SubredditFrequency } from '../lib/redditApi';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from '../components/ProgressBar';
import AddToProjectModal from '../components/AddToProjectModal';
import CreateProjectModal from '../components/CreateProjectModal';
import FrequentSearches from '../components/FrequentSearches';
import PricingCards from '../components/PricingCards';
import { useCallback } from 'react';
import { getSubredditInfo, getSubredditPosts } from '../lib/reddit';
import { analyzeSubredditData } from '../lib/analysis';

// Add to global window type
declare global {
  interface Window {
    debugProjectSubreddits: (projectId: string) => Promise<any>;
  }
}

// Custom styles matching Dashboard page
const customStyles = `
  .dashboard-card {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #222222;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  }
  
  .dashboard-card:hover {
    border-color: #333333;
    transform: translateY(-4px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .dashboard-card-featured {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 2px solid #C69B7B;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
  }
  
  .dashboard-button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  
  .button-outline {
    color: #ffffff;
    border: 1px solid #C69B7B;
  }
  
  .button-outline:hover {
    background-color: #C69B7B;
    color: #000000;
  }
  
  .button-primary {
    background-color: #C69B7B;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
  }
  
  .button-primary:hover {
    background-color: #B38A6A;
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    background-color: rgba(198, 155, 123, 0.1);
    border: 1px solid rgba(198, 155, 123, 0.2);
    color: #C69B7B;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  
  /* Pricing card styles */
  .pricing-card {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #222222;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    height: 100%;
  }
  
  .pricing-card:hover {
    border-color: #333333;
    transform: translateY(-4px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .pricing-card-featured {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 2px solid #C69B7B;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
    height: 100%;
  }
  
  .pricing-button {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  
  /* Enhanced tool and result card styles */
  .tool-card {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #222222;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
  }
  
  .tool-card:hover {
    border-color: #333333;
    transform: translateY(-4px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .tool-card-featured {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 2px solid #C69B7B;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
    display: flex;
    flex-direction: column;
  }
  
  .tool-card-featured:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.3);
  }
  
  .result-item {
    background-color: #0a0a0a;
    border-radius: 0.75rem;
    padding: 1.25rem;
    border: 1px solid #222222;
    transition: all 0.25s ease;
  }
  
  .result-item:hover {
    border-color: #333333;
    background-color: #0f0f0f;
    transform: translateY(-2px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .action-button-primary {
    background-color: #C69B7B;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(198, 155, 123, 0.2);
  }
  
  .action-button-primary:hover:not(:disabled) {
    background-color: #B38A6A;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(198, 155, 123, 0.3);
  }
  
  .action-button-secondary {
    background-color: #1a1a1a;
    color: #ffffff;
    border: 1px solid #222222;
  }
  
  .action-button-secondary:hover:not(:disabled) {
    background-color: #222222;
    border-color: #C69B7B;
  }
  
  .progress-container {
    background-color: #0a0a0a;
    border-radius: 0.75rem;
    border: 1px solid #1a1a1a;
    padding: 1.25rem;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  
  .notification {
    background-color: rgba(10, 10, 10, 0.8);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(8px);
    border-left: 3px solid #C69B7B;
    transition: all 0.3s ease;
  }
  
  .notification-success {
    border-left-color: #10b981;
  }
  
  .notification-error {
    border-left-color: #ef4444;
  }
`;

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error';
  timestamp: number;
}

interface AnalysisProgress {
  status: string;
  progress: number;
  indeterminate: boolean;
}

interface SaveStatus {
  subreddits: Partial<Record<string, {
    type: 'success' | 'error';
    message: string;
    saving: boolean;
    saved: boolean;
  }>>;
}

function SpyGlass() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [frequencies, setFrequencies] = useState<SubredditFrequency[]>([]);
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | undefined>(undefined);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{id: string; name: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ subreddits: {} });
  const [savingAll, setSavingAll] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Process notification queue with proper typing
  useEffect(() => {
    const timer = setInterval(() => {
      setNotificationQueue(prev => {
        // Remove notifications older than 3 seconds
        const now = Date.now();
        return prev.filter(n => now - n.timestamp < 3000);
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Cleanup save status on unmount
  useEffect(() => {
    return () => {
      setSaveStatus({ subreddits: {} });
      setSavingAll(false);
    };
  }, []);

  // Clear save status when username changes
  useEffect(() => {
    setSaveStatus({ subreddits: {} });
  }, [username]);

  const trackSearch = async (username: string) => {
    try {
      // Get the user's avatar URL from Reddit
      const userInfo = await redditApi.getUserInfo(username);
      const avatarUrl = userInfo?.avatar_url || null;

      // Track the search with the authenticated user's ID
      if (user) {
        await supabase.rpc('increment_search_count', {
          p_username: username,
          p_avatar_url: avatarUrl,
          p_user_id: user.id // Add user ID
        });
      } else {
        console.log('Search not tracked: User not authenticated');
      }
    } catch (err) {
      console.error('Error tracking search:', err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent | Event) => {
    if (e) {
      e.preventDefault();
    }
    
    // Don't proceed if already loading or no username
    if (!username.trim() || loading) return;

    // Set loading state and clear previous data
    setLoading(true);
    setError(null);
    setFrequencies([]);
    setProgress({
      status: 'Validating username...',
      progress: 20,
      indeterminate: false
    });

    try {
      const cleanUsername = redditApi.parseUsername(username.trim());
      if (!cleanUsername) {
        throw new Error('Please enter a valid Reddit username');
      }

      // Track the search after validation
      await trackSearch(cleanUsername);

      setProgress({
        status: 'Fetching user posts...',
        progress: 40,
        indeterminate: false
      });

      // First verify the user exists
      const userResponse = await fetch(`https://www.reddit.com/user/${cleanUsername}/about.json`);
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          throw new Error(`User ${cleanUsername} not found`);
        } else if (userResponse.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        } else if (userResponse.status >= 500) {
          throw new Error('Reddit servers are having issues. Please try again later.');
        }
        throw new Error(`Failed to fetch user data (${userResponse.status})`);
      }

      const posts = await redditApi.getUserPosts(cleanUsername);
      if (!Array.isArray(posts)) {
        throw new Error('Invalid response from Reddit API');
      }
      
      if (posts.length === 0) {
        throw new Error('No posts found for this user');
      }

      setProgress({
        status: 'Analyzing posting patterns...',
        progress: 80,
        indeterminate: false
      });

      // Filter out any posts where subreddit name matches a username pattern
      const validPosts = posts.filter(post => 
        post.subreddit && // ensure subreddit exists
        !post.subreddit.toLowerCase().startsWith('u_') && 
        post.subreddit.toLowerCase() !== cleanUsername.toLowerCase()
      );

      if (validPosts.length === 0) {
        throw new Error('No valid subreddit posts found for analysis');
      }

      const frequencies = await redditApi.analyzePostFrequency(validPosts);
      if (!Array.isArray(frequencies) || frequencies.length === 0) {
        throw new Error('Failed to analyze posting patterns');
      }

      setFrequencies(frequencies);
      addNotification(`Successfully analyzed ${frequencies.length} subreddits`, 'success');

      setProgress({
        status: 'Analysis complete!',
        progress: 100,
        indeterminate: false
      });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const saveSubreddit = async (subredditName: string) => {
    try {
      if (!user) {
        throw new Error('Please sign in to save subreddits');
      }

      console.log(`Starting saveSubreddit for r/${subredditName}`);

      // First check if this subreddit already exists in the database
      const { data: existingSubreddit, error: lookupError } = await supabase
        .from('subreddits')
        .select('*')
        .eq('name', subredditName)
        .maybeSingle();
        
      if (lookupError) {
        console.error(`Error looking up r/${subredditName}:`, lookupError);
        throw lookupError;
      }
      
      if (existingSubreddit) {
        console.log(`Found existing subreddit in database: r/${subredditName}`, existingSubreddit);
        
        // Add to user's saved list if not already saved - use onConflict: 'ignore' to avoid duplicate key errors
        const { error: saveError } = await supabase
          .from('saved_subreddits')
          .upsert({
            subreddit_id: existingSubreddit.id,
            user_id: user.id,
            last_post_at: null
          }, { onConflict: 'user_id,subreddit_id', ignoreDuplicates: true });
        
        if (saveError) {
          // Just log this error but don't throw - we want to continue even if saving fails
          console.warn(`Warning: Error adding r/${subredditName} to saved_subreddits:`, saveError);
        }
        
        return existingSubreddit;
      }

      // Find the frequency data for this subreddit
      const frequencyData = frequencies.find(f => f.name === subredditName);
      if (!frequencyData) {
        throw new Error(`Subreddit data not found in analysis results for r/${subredditName}`);
      }

      console.log(`Creating new subreddit record for r/${subredditName}`);

      // Create new subreddit
      const { data: newSubreddit, error: insertError } = await supabase
        .from('subreddits')
        .insert({
          name: frequencyData.name,
          subscriber_count: frequencyData.subscribers,
          active_users: frequencyData.active_users,
          marketing_friendly_score: 0, // Will be calculated later during analysis
          posting_requirements: {
            allowedTypes: [],
            restrictions: [],
            recommendations: []
          },
          posting_frequency: {
            postTypes: [],
            timing: [],
            topics: []
          },
          // Set default content types - most subreddits support at least text and links
          allowed_content: ['text', 'link'],
          best_practices: [],
          rules_summary: '',
          last_analyzed_at: new Date().toISOString(),
          icon_img: frequencyData.icon_img,
          community_icon: frequencyData.community_icon
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating subreddit r/${subredditName}:`, insertError);
        throw insertError;
      }
      
      if (!newSubreddit) {
        throw new Error(`Failed to create subreddit record for r/${subredditName}`);
      }

      console.log(`Created new subreddit record:`, newSubreddit);

      // Add to user's saved list - use onConflict: 'ignore' to avoid duplicate key errors
      const { error: saveError } = await supabase
        .from('saved_subreddits')
        .upsert({
          subreddit_id: newSubreddit.id,
          user_id: user.id,
          last_post_at: null
        }, { onConflict: 'user_id,subreddit_id', ignoreDuplicates: true });
        
      if (saveError) {
        console.warn(`Warning: Error adding r/${subredditName} to saved_subreddits, but continuing:`, saveError);
      }
      
      return newSubreddit;
    } catch (err) {
      console.error(`Error in saveSubreddit for r/${subredditName}:`, err);
      throw err;
    }
  };

  const clearSaveStatus = useCallback((subredditName: string) => {
    setSaveStatus(prev => {
      const { [subredditName]: removed, ...rest } = prev.subreddits;
      return { subreddits: rest };
    });
  }, []);

  const handleSaveSubreddit = async (subredditName: string) => {
    const key = 'save_' + subredditName;
    if (!user || savingAll || saveStatus.subreddits[key]?.saving) return;

    setSaveStatus(prev => ({
      subreddits: {
        ...prev.subreddits,
        [key]: {
          type: 'success',
          message: 'Starting save...',
          saving: true,
          saved: false
        }
      }
    }));

    try {
      await saveSubreddit(subredditName);
      
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'success',
            message: 'Saved to list',
            saving: false,
            saved: true
          }
        }
      }));

      // Clear status after success
      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 3000);
    } catch (err) {
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to save',
            saving: false,
            saved: false
          }
        }
      }));

      // Clear error status after delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 3000);
    }
  };

  const handleAddToProject = async (subredditName: string) => {
    const key = 'add_' + subredditName;
    if (!user || savingAll || saveStatus.subreddits[key]?.saving) return;

    setSaveStatus(prev => ({
      subreddits: {
        ...prev.subreddits,
        [key]: {
          type: 'success',
          message: 'Starting addition...',
          saving: true,
          saved: false
        }
      }
    }));
    
    try {
      const subreddit = await saveSubreddit(subredditName);
      setSelectedSubreddit({
        id: subreddit.id,
        name: subreddit.name
      });

      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'success',
            message: 'Ready to add to project',
            saving: false,
            saved: true
          }
        }
      }));

      // Clear status after modal is shown
      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 1000);
    } catch (err) {
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: {
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to add to project',
            saving: false,
            saved: false
          }
        }
      }));

      setTimeout(() => {
        setSaveStatus(prev => {
          const { [key]: _, ...rest } = prev.subreddits;
          return { subreddits: rest };
        });
      }, 3000);
    }
  };

  const handleSaveAll = async () => {
    if (savingAll || !username) return;
    setSavingAll(true);
    setShowCreateProject(true);
  };

  const handleCreateProject = async (projectData: { 
    name: string; 
    description: string | null; 
    image_url: string | null 
  }) => {
    setSaveStatus({ subreddits: {} });
    setShowCreateProject(false);
    
    // Set progress indicator for project creation
    setProgress({
      status: 'Creating project...',
      progress: 10,
      indeterminate: false
    });
    
    try {
      // Get the user ID first to avoid nested async calls
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user?.id) throw new Error('User not authenticated');
      
      const userId = userData.user.id;
      
      // Create new project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description,
          image_url: projectData.image_url,
          user_id: userId
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Failed to create project');

      // Add user as project owner
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'owner'
        });

      if (memberError) {
        console.error('Error adding project owner:', memberError);
        // Continue anyway since the user is already set as the user_id in the projects table
      }

      console.log('Project created successfully:', project);
      console.log('Frequencies to save:', frequencies.length);
      
      if (frequencies.length === 0) {
        throw new Error('No subreddits to save to project');
      }
      
      // Store the project ID for later use if the RLS error occurs
      const createdProjectId = project.id;
      
      // Update progress for subreddit saving
      setProgress({
        status: `Saving ${frequencies.length} subreddits to project...`,
        progress: 30,
        indeterminate: false
      });

      // Diagnostic logging of frequency data
      console.log('Frequency data to be processed:', 
        frequencies.map(f => ({
          name: f.name, 
          subscribers: f.subscribers,
          hasIconImg: !!f.icon_img,
          hasCommunityIcon: !!f.community_icon
        }))
      );

      // First save all subreddits then add them to the project in a single batch
      const savedSubreddits = [];
      let savedCount = 0;
      const totalToSave = frequencies.length;
      
      // Step 1: Save/create all subreddits first
      for (const freq of frequencies) {
        try {
          // Update progress periodically
          if (savedCount % 3 === 0 || savedCount === totalToSave - 1) {
            const progressPercent = 30 + Math.round((savedCount / totalToSave) * 30); // Use 30% of progress bar for saving
            setProgress({
              status: `Saving subreddit ${savedCount+1}/${totalToSave}...`,
              progress: progressPercent,
              indeterminate: false
            });
          }
        
          console.log(`Saving subreddit: r/${freq.name}`);
          const subreddit = await saveSubreddit(freq.name);
          console.log(`Subreddit saved:`, subreddit);
          
          if (!subreddit || !subreddit.id) {
            console.error(`Invalid subreddit data returned for ${freq.name}`, subreddit);
            continue; // Skip this subreddit but continue with others
          }
          
          savedSubreddits.push(subreddit);
          savedCount++;
        } catch (subredditError) {
          console.error(`Error processing r/${freq.name}:`, subredditError);
          // Continue with next subreddit rather than failing the entire operation
        }
      }

      console.log(`Saved ${savedSubreddits.length} out of ${frequencies.length} subreddits`);
      
      let rlsPolicyError = false;
      
      // Step 2: Add all subreddits to the project in a single batch operation
      if (savedSubreddits.length > 0) {
        try {
          setProgress({
            status: `Adding subreddits to project...`,
            progress: 70,
            indeterminate: false
          });

          // Log detailed information about subreddits we're trying to add
          console.log('Adding these subreddits to project:', 
            savedSubreddits.map(sub => ({
              id: sub.id,
              name: sub.name,
              subscriber_count: sub.subscriber_count
            }))
          );

          // Create batch insert records for ALL subreddits
          const projectSubredditRecords = savedSubreddits.map(subreddit => ({
            project_id: project.id,
            subreddit_id: subreddit.id
          }));
          
          console.log(`Preparing to add ${projectSubredditRecords.length} subreddits to project ${project.id}`);
          
          // Insert in smaller batches to avoid potential limits
          const BATCH_SIZE = 20;
          let successCount = 0;
          
          try {
            for (let i = 0; i < projectSubredditRecords.length; i += BATCH_SIZE) {
              const batch = projectSubredditRecords.slice(i, i + BATCH_SIZE);
              console.log(`Processing batch ${i/BATCH_SIZE + 1}, size: ${batch.length}`);
              
              try {
                const { data: batchData, error: batchError } = await supabase
                  .from('project_subreddits')
                  .insert(batch)
                  .select();
                  
                if (batchError) {
                  // Handle the RLS policy recursion error specifically
                  if (batchError.code === '42P17') {
                    console.error('RLS policy recursion detected during batch insert:', batchError.message);
                    rlsPolicyError = true;
                    
                    // Add user-friendly notification
                    addNotification(
                      'Project created but subreddits could not be associated due to a database configuration issue. ' +
                      'Please contact your administrator to fix the project_members RLS policy.', 
                      'error'
                    );
                    
                    break; // Exit the loop early since all other batches will fail too
                  }
                  
                  console.error(`Error in batch ${i/BATCH_SIZE + 1}:`, batchError);
                  
                  // Fall back to individual inserts for this batch
                  console.log('Falling back to individual inserts for this batch...');
                  
                  for (const record of batch) {
                    try {
                      const { data, error } = await supabase
                        .from('project_subreddits')
                        .insert(record)
                        .select();
                        
                      if (error) {
                        // Also check for the RLS policy error in individual inserts
                        if (error.code === '42P17') {
                          rlsPolicyError = true;
                          throw new Error('RLS policy recursion detected. Please contact your administrator.');
                        }
                        
                        if (error.code === '23505') { // PostgreSQL unique violation code
                          console.log(`Record already exists in project (duplicate): ${record.subreddit_id}`);
                          successCount++; // Count as success since it's already there
                        } else {
                          console.error(`Error adding record to project:`, error);
                        }
                      } else {
                        console.log(`Successfully added record: ${record.subreddit_id}`);
                        successCount++;
                      }
                    } catch (e) {
                      console.error(`Exception adding record:`, e);
                      
                      // If it's our specific RLS error, break out of the loop
                      if (e instanceof Error && e.message.includes('RLS policy recursion')) {
                        rlsPolicyError = true;
                        break; // Break out of the individual inserts loop
                      }
                    }
                  }
                  
                  // If we detected the RLS error during individual inserts, break out of the batch loop too
                  if (rlsPolicyError) {
                    break;
                  }
                } else if (batchData) {
                  // Success case
                  successCount += batchData.length;
                  console.log(`Successfully added batch ${i/BATCH_SIZE + 1}: ${batchData.length} records`);
                }
              } catch (batchError) {
                console.error(`Exception in batch ${i/BATCH_SIZE + 1}:`, batchError);
                
                // If it's our specific RLS error, break out of the loop
                if (batchError instanceof Error && batchError.message.includes('RLS policy recursion')) {
                  rlsPolicyError = true;
                  break; // Break out of the batch loop
                }
              }
            }
            
            console.log(`Successfully added ${successCount} out of ${projectSubredditRecords.length} subreddits to project`);
          } catch (insertError) {
            console.error('Error during association of subreddits to project:', insertError);
            
            // Special handling for the RLS policy recursion error
            if (insertError instanceof Error && insertError.message.includes('RLS policy recursion')) {
              rlsPolicyError = true;
              addNotification(
                'Project created but subreddits could not be associated due to a database configuration issue. ' +
                'Please contact your administrator to fix the project_members RLS policy.', 
                'error'
              );
            } else {
              addNotification(
                `Project created but only ${successCount} of ${projectSubredditRecords.length} subreddits were added.`, 
                'error'
              );
            }
          }
        } catch (batchError) {
          console.error('Error during association of subreddits to project:', batchError);
        }
      }
      
      // If we had the RLS error, skip the verification step which will also fail
      if (!rlsPolicyError) {
        // Step 3: Verify the association by doing a final check
        try {
          setProgress({
            status: `Verifying project subreddits...`,
            progress: 90,
            indeterminate: false
          });
          
          // First get the associations
          const { data: associations, error: associationsError } = await supabase
            .from('project_subreddits')
            .select('subreddit_id')
            .eq('project_id', project.id);
            
          if (associationsError) {
            // Check for the RLS policy error here too
            if (associationsError.code === '42P17') {
              rlsPolicyError = true;
              console.error('RLS policy recursion detected during verification:', associationsError.message);
            } else {
              console.error('Error checking project_subreddits associations:', associationsError);
            }
          } else if (!associations || associations.length === 0) {
            console.error('CRITICAL: No subreddit associations found for the newly created project!');
          } else {
            console.log(`Verification found ${associations.length} subreddit associations`);
            
            // Now get the actual subreddits
            const subredditIds = associations.map(a => a.subreddit_id);
            const { data: projectSubreddits, error: subredditsError } = await supabase
              .from('subreddits')
              .select('id, name, subscriber_count')
              .in('id', subredditIds);
              
            if (subredditsError) {
              console.error('Error fetching associated subreddits:', subredditsError);
            } else {
              console.log(`Found ${projectSubreddits?.length || 0} out of ${subredditIds.length} associated subreddits`);
              console.log('Subreddits in project:', projectSubreddits?.map(s => s.name).sort());
            }
          }
        } catch (verifyError) {
          console.error('Error during final verification:', verifyError);
          
          // Check if this is also the RLS error
          if (verifyError instanceof Error && verifyError.message.includes('policy recursion')) {
            rlsPolicyError = true;
          }
        }
      }
      
      // Final progress update
      setProgress({
        status: 'Opening new project...',
        progress: 100,
        indeterminate: false
      });
      
      // Log detailed information about what was saved
      console.log('Final project creation summary:');
      console.log(`- Project: ${project.id} (${project.name})`);
      console.log(`- Attempted to save ${frequencies.length} subreddits`);
      console.log(`- Successfully saved ${savedSubreddits.length} subreddits`);
      console.log(`- Project subreddits should include:`, savedSubreddits.map(s => ({ 
        id: s.id, 
        name: s.name,
        subscribers: s.subscriber_count
      })));
      
      if (rlsPolicyError) {
        // If we had an RLS error, specifically tell the user that the project was created 
        // but they'll need to add subreddits manually
        setSaveStatus({
          subreddits: {
            all: {
              type: 'error',
              message: `Project created but subreddits couldn't be associated. You'll need to add them manually.`,
              saving: false,
              saved: true
            }
          }
        });
        
        // More descriptive notification
        addNotification(
          'Project created, but subreddits could not be associated due to a database policy error. ' +
          'This is a known issue with the RLS policy on project_members. ' +
          'You can still use your project and add subreddits manually.',
          'error'
        );
      } else {
        // Normal success case
        setSaveStatus({
          subreddits: {
            all: {
              type: 'success',
              message: `Saved ${savedSubreddits.length} subreddits to new project`,
              saving: false,
              saved: true
            }
          }
        });
      }

      // Navigate to new project - always do this even if there was an RLS error
      // as the project itself was created successfully
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error('Error creating project with subreddits:', err);
      setSaveStatus({
        subreddits: {
          all: {
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to save subreddits to project',
            saving: false,
            saved: false
          }
        }
      });
    } finally {
      setSavingAll(false);
      setShowCreateProject(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const getSubredditIcon = (freq: SubredditFrequency) => {
    // Use community icon first if available
    if (freq.community_icon) {
      return freq.community_icon;
    }
    
    // Fallback to icon_img if available
    if (freq.icon_img) {
      return freq.icon_img;
    }
    
    // Final fallback to generated placeholder
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111&radius=12`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleFrequentSearchClick = async (clickedUsername: string) => {
    // Don't proceed if already loading
    if (loading) return;

    // Set loading state and clear previous data
    setLoading(true);
    setError(null);
    setFrequencies([]);
    
    // Set the progress state
    setProgress({
      status: 'Validating username...',
      progress: 20,
      indeterminate: false
    });

    try {
      const cleanUsername = redditApi.parseUsername(clickedUsername.trim());
      if (!cleanUsername) {
        throw new Error('Please enter a valid Reddit username');
      }

      // Set the username in state
      setUsername(cleanUsername);

      // Track the search after validation
      await trackSearch(cleanUsername);

      setProgress({
        status: 'Fetching user posts...',
        progress: 40,
        indeterminate: false
      });

      // First verify the user exists
      const userResponse = await fetch(`https://www.reddit.com/user/${cleanUsername}/about.json`);
      if (!userResponse.ok) {
        throw new Error(`User ${cleanUsername} not found`);
      }

      const posts = await redditApi.getUserPosts(cleanUsername);
      if (posts.length === 0) {
        throw new Error('No posts found for this user');
      }

      setProgress({
        status: 'Analyzing posting patterns...',
        progress: 80,
        indeterminate: false
      });

      // Filter out any posts where subreddit name matches a username pattern
      const validPosts = posts.filter(post => 
        !post.subreddit.toLowerCase().startsWith('u_') && 
        post.subreddit.toLowerCase() !== cleanUsername.toLowerCase()
      );

      const frequencies = await redditApi.analyzePostFrequency(validPosts);
      setFrequencies(frequencies);

      setProgress({
        status: 'Analysis complete!',
        progress: 100,
        indeterminate: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze user');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const addNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification: Notification = {
      id: Math.random().toString(36).substring(7),
      message,
      type,
      timestamp: Date.now()
    };
    setNotificationQueue(prev => [...prev, notification]);
  };

  // Update error handling to use notification system
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    setError(message);
    addNotification(message, 'error');
  };

  // Debug helper function
  const debugProjectSubreddits = async (projectId: string) => {
    console.log(`Debugging project ID: ${projectId}`);
    
    try {
      // Check if project exists
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (projectError) {
        console.error('Project lookup error:', projectError);
        return;
      }
      
      console.log('Project details:', project);
      
      // First get project_subreddits associations
      console.log('Fetching project-subreddit associations...');
      const { data: projectSubreddits, error: psError } = await supabase
        .from('project_subreddits')
        .select('id, project_id, subreddit_id')
        .eq('project_id', projectId);
        
      if (psError) {
        console.error('Error fetching project subreddits:', psError);
        
        // Check for the specific RLS policy recursion error
        if (psError.code === '42P17') {
          console.warn('=============================================');
          console.warn('DETECTED RLS POLICY RECURSION ERROR');
          console.warn('This is a Supabase database configuration issue.');
          console.warn('');
          console.warn('The issue occurs in policies on the project_members table.');
          console.warn('It creates an infinite loop during authorization checks.');
          console.warn('');
          console.warn('To fix this, go to the Supabase dashboard:');
          console.warn('1. Navigate to Authentication > Policies');
          console.warn('2. Find policies for the project_members table');
          console.warn('3. Look for policies that may be creating circular references');
          console.warn('4. Update the policies to break the circular dependency');
          console.warn('=============================================');
          
          // Try to get some basic project info as a fallback
          console.log('Trying to fetch basic project info as a fallback...');
          return {
            project,
            error: 'RLS policy recursion detected',
            errorCode: psError.code,
            message: psError.message,
            timestamp: new Date().toISOString()
          };
        }
        
        return;
      }
      
      console.log(`Found ${projectSubreddits?.length || 0} project-subreddit associations`);
      
      if (!projectSubreddits || projectSubreddits.length === 0) {
        console.log('No subreddits associated with this project');
        return;
      }
      
      // Extract subreddit IDs
      const subredditIds = projectSubreddits.map(ps => ps.subreddit_id);
      console.log('Associated subreddit IDs:', subredditIds);
      
      // Then fetch the actual subreddit data
      const { data: subreddits, error: subredditsError } = await supabase
        .from('subreddits')
        .select('id, name, subscriber_count')
        .in('id', subredditIds);
        
      if (subredditsError) {
        console.error('Error fetching subreddits:', subredditsError);
        return;
      }
      
      console.log(`Fetched ${subreddits?.length || 0} out of ${subredditIds.length} subreddits`);
      console.log('Subreddit details:', subreddits);
      
      // Check for missing subreddits
      const missingIds = subredditIds.filter(id => 
        !subreddits.some(s => s.id === id)
      );
      
      if (missingIds.length > 0) {
        console.log(`WARNING: ${missingIds.length} subreddit IDs have associations but no subreddit records`);
        console.log('Missing IDs:', missingIds);
      }
      
      return {
        project,
        associations: projectSubreddits,
        subreddits
      };
    } catch (error) {
      console.error('Debug function error:', error);
    }
  };

  // Assign debug function to window object
  useEffect(() => {
    window.debugProjectSubreddits = debugProjectSubreddits;
    
    // Cleanup function to remove the property when component unmounts
    return () => {
      // Use type assertion to fix TypeScript error
      (window as any).debugProjectSubreddits = undefined;
    };
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-20">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">Competitor <span className="text-[#C69B7B]">Intelligence</span></h1>
        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Analyze Reddit users to identify their most active subreddits and discover marketing opportunities.
        </p>
      </div>

      <style>{customStyles}</style>

      <div className="flex flex-col gap-8 max-w-5xl mx-auto mb-12">
        {/* Search Form */}
        <div className="tool-card-featured">
          <h2 className="text-xl font-semibold mb-6">Analyze Reddit User</h2>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Reddit username (e.g., username, u/username, or profile URL)"
                className="w-full h-[52px] bg-[#050505] rounded-lg pl-4 pr-[120px] text-white placeholder-gray-500 border-none focus:ring-1 focus:ring-[#C69B7B]"
                disabled={loading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button 
                  type="submit" 
                  className="action-button action-button-primary h-10 px-6 rounded-lg text-base font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-[#C69B7B]"
                  disabled={loading}
                >
                  <Telescope size={16} />
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>

            {progress && (
              <div className="progress-container">
                <ProgressBar 
                  progress={progress.progress}
                  status={progress.status}
                  indeterminate={progress.indeterminate}
                />
              </div>
            )}

            {error && (
              <div className="notification notification-error flex items-center gap-2">
                <AlertTriangle size={20} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Frequent Searches */}
        <div className="tool-card">
          <FrequentSearches 
            onUsernameClick={handleFrequentSearchClick}
          />
        </div>

        {/* Results Section */}
        {frequencies.length > 0 && (
          <div className="tool-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Results</h2>
              <div className="text-sm text-gray-400">
                Found {frequencies.length} frequently posted subreddits
              </div>
            </div>

            <div className="flex justify-end mb-6">
              <button
                onClick={handleSaveAll}
                className="action-button action-button-primary px-6 py-2 text-sm flex items-center gap-2"
                disabled={savingAll || !username}
              >
                {savingAll ? (
                  <>
                    <div className="animate-spin text-sm h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus size={16} />
                    <span>Save All to New Project</span>
                  </>
                )}
              </button>
            </div>

            <div className="divide-y divide-[#222222] bg-[#0a0a0a] rounded-lg overflow-hidden">
              {frequencies.map((freq) => (
                <div key={freq.name}>
                  <div 
                    onClick={() => setExpandedSubreddit(
                      expandedSubreddit === freq.name ? undefined : freq.name
                    )}
                    className="result-item cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#1A1A1A] overflow-hidden flex-shrink-0">
                          <img 
                            src={getSubredditIcon(freq)}
                            alt={freq.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111&radius=12`;
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <a 
                              href={`https://reddit.com/r/${freq.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()} // Prevent card expansion when clicking link
                            >
                              r/{freq.name}
                              <ExternalLink size={14} className="text-gray-400" />
                            </a>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center gap-1.5 bg-[#1A1A1A] px-2.5 py-1 rounded-md">
                                <Users size={14} className="text-gray-400" />
                                <span className="text-gray-300 font-medium">{formatNumber(freq.subscribers)}</span>
                                {freq.active_users > 0 && (
                                  <>
                                    <span className="text-gray-600 mx-1.5">•</span>
                                    <Activity size={14} className="text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">{formatNumber(freq.active_users)} online</span>
                                  </>
                                )}
                              </div>
                              <span className="text-gray-400">{freq.count} posts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleSaveSubreddit(freq.name)}
                          className={`action-button ${
                            saveStatus.subreddits['save_' + freq.name]?.saved 
                              ? 'action-button-primary' 
                              : 'action-button-secondary'
                          }`}
                          title={saveStatus.subreddits['save_' + freq.name]?.saved ? 'Saved to List' : 'Save to List'}
                          disabled={!user || savingAll || saveStatus.subreddits['save_' + freq.name]?.saving}
                        >
                          <div className="w-5 flex justify-center">
                            {saveStatus.subreddits['save_' + freq.name]?.saving ? (
                              <div className="animate-spin text-lg">⚬</div>
                            ) : saveStatus.subreddits['save_' + freq.name]?.saved ? (
                              <Check size={16} className="text-white" />
                            ) : (
                              <Bookmark size={16} />
                            )}
                          </div>
                          <span className="text-center">
                            {saveStatus.subreddits['save_' + freq.name]?.saving 
                              ? 'Saving...' 
                              : saveStatus.subreddits['save_' + freq.name]?.saved 
                                ? 'Saved' 
                                : 'Save'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleAddToProject(freq.name)}
                          className={`action-button ${
                            saveStatus.subreddits['add_' + freq.name]?.saved 
                              ? 'action-button-primary' 
                              : 'action-button-secondary'
                          }`}
                          title={saveStatus.subreddits['add_' + freq.name]?.saved ? 'Added to Project' : 'Add to Project'}
                          disabled={!user || savingAll || saveStatus.subreddits['add_' + freq.name]?.saving}
                        >
                          <div className="w-5 flex justify-center">
                            {saveStatus.subreddits['add_' + freq.name]?.saving ? (
                              <div className="animate-spin text-lg">⚬</div>
                            ) : (
                              <FolderPlus size={16} className={saveStatus.subreddits['add_' + freq.name]?.saved ? 'text-white' : ''} />
                            )}
                          </div>
                          <span className="text-center">
                            {saveStatus.subreddits['add_' + freq.name]?.saving 
                              ? 'Adding...' 
                              : 'Add to Project'}
                          </span>
                        </button>
                        <div className="text-gray-400 p-2">
                          {expandedSubreddit === freq.name ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedSubreddit === freq.name && (
                    <div className="border-t border-[#222222] bg-[#0A0A0A] divide-y divide-[#222222]">
                      {freq.lastPosts.map((post) => (
                        <div key={post.id} className="p-4 hover:bg-[#111111] transition-colors">
                          <div className="flex items-start gap-4">
                            {(post.preview_url || post.thumbnail) ? (
                              <img 
                                src={post.preview_url || post.thumbnail || ''}
                                alt=""
                                className="w-20 h-20 rounded-md object-cover bg-[#111111]"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = getSubredditIcon(freq);
                                }}
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-md bg-[#111111] flex items-center justify-center">
                                <img 
                                  src={getSubredditIcon(freq)}
                                  alt=""
                                  className="w-12 h-12 object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111`;
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[15px] font-medium hover:text-[#C69B7B] transition-colors line-clamp-2 mb-2"
                              >
                                {post.title}
                              </a>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Users size={14} />
                                  <span>{post.score} points</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle size={14} />
                                  <span>{post.num_comments} comments</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  <span>{formatDate(post.created_utc)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* General notifications queue */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md">
        {notificationQueue.map(notification => (
          <div 
            key={notification.id}
            className={`notification ${
              notification.type === 'success' 
                ? 'notification-success' 
                : 'notification-error'
            } flex items-center gap-2 animate-fade-in`}
          >
            {notification.type === 'success' ? (
              <Check size={20} className="shrink-0" />
            ) : (
              <AlertTriangle size={20} className="shrink-0" />
            )}
            <p>{notification.message}</p>
          </div>
        ))}
        
        {/* Save status notifications */}
        {Object.entries(saveStatus.subreddits)
          .filter(([_, s]) => s?.message && !s?.saving)
          .map(([key, s]) => {
            // Skip entries without a type (shouldn't happen, but just to be safe)
            if (!s?.type) return null;
            
            return (
              <div 
                key={key}
                className={`notification ${
                  s.type === 'success' 
                    ? 'notification-success' 
                    : 'notification-error'
                } flex items-center gap-2`}
              >
                {s.type === 'success' ? (
                  <Check size={20} className="shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="shrink-0" />
                )}
                <p>
                  {key !== 'all' ? (
                    <>
                      <span className="font-medium">r/{key.replace('save_', '').replace('add_', '')}</span>{' '}
                      {s.message}
                    </>
                  ) : (
                    s.message
                  )}
                </p>
              </div>
            );
          })}
      </div>

      {selectedSubreddit && (
        <AddToProjectModal
          isOpen={true}
          onClose={() => setSelectedSubreddit(null)}
          subredditId={selectedSubreddit.id}
          subredditName={selectedSubreddit.name}
        />
      )}

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => {
          setShowCreateProject(false);
          setSavingAll(false);
        }}
        onSubmit={handleCreateProject}
        defaultName={username ? `u/${username}'s Subreddits` : ''}
        defaultDescription={username ? `Subreddits analyzed from u/${username}'s posting history` : ''}
      />
    </div>
  );
}

export default SpyGlass;