import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useSubredditInfo } from '../../../hooks/useSubredditInfo';
import { useSubredditPosts } from '../../../hooks/useSubredditPosts';
import AnalysisCard from './analysis-card';
import { ProgressCircle } from '../../../components/ProgressCircle';
import { analysisWorker, ProgressData } from '../../../lib/analysisWorker';

interface SubredditAnalyzerProps {
  subredditName: string;
  autoStart?: boolean;
}

export function SubredditAnalyzer({ subredditName, autoStart = true }: SubredditAnalyzerProps) {
  const { subredditInfo, isLoading: isLoadingSubreddit, error: subredditError } = useSubredditInfo(subredditName);
  const { posts, isLoading: isLoadingPosts, error: postsError } = useSubredditPosts(subredditName);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  // Initialize analysis worker
  useEffect(() => {
    // Clean up worker when component unmounts
    return () => {
      analysisWorker.terminate();
    };
  }, []);

  // Auto-start analysis when data is loaded
  useEffect(() => {
    if (autoStart && subredditInfo && posts && posts.length > 0 && !isAnalyzing && !results && !error) {
      startAnalysis();
    }
  }, [autoStart, subredditInfo, posts, isAnalyzing, results, error]);

  const startAnalysis = async () => {
    if (isAnalyzing) return;
    
    try {
      setIsAnalyzing(true);
      setProgress({ progress: 0, stage: 'Initializing' });
      setResults(null);
      setError(null);

      // Set up analysis callbacks
      analysisWorker
        .onProgress((data: ProgressData) => {
          setProgress(data);
        })
        .onComplete((data: any) => {
          // Transform the data to match the expected AnalysisData format
          const analysisData = {
            info: {
              name: subredditName,
              subscribers: subredditInfo?.subscribers || 0,
              active_users: subredditInfo?.active_users || 0,
              rules: subredditInfo?.rules?.map((rule: any) => ({
                title: rule.title,
                description: rule.description,
                marketingImpact: 'medium' // Default value
              })) || []
            },
            posts: posts || [],
            analysis: data
          };
          
          setResults(analysisData);
          setIsAnalyzing(false);
          setProgress(null);
        })
        .onError((err: Error) => {
          setError(err);
          setIsAnalyzing(false);
          setProgress(null);
        });

      // Start analysis
      await analysisWorker.analyze({
        subredditName,
        subredditInfo: subredditInfo || {
          name: subredditName,
          title: '',
          description: '',
          subscribers: 0,
          active_users: 0,
          rules: [],
          allowedContentTypes: [],
          created_utc: Date.now() / 1000,
          over18: false
        },
        posts: posts || [],
        rules: subredditInfo?.rules,
        allowedContentTypes: subredditInfo?.allowedContentTypes,
        subscribers: subredditInfo?.subscribers,
        active_users: subredditInfo?.active_users
      });
    } catch (err) {
      console.error('Failed to start analysis:', err);
      setError(err instanceof Error ? err : new Error('Failed to start analysis'));
      setIsAnalyzing(false);
    }
  };

  if (isLoadingSubreddit || isLoadingPosts) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          <ProgressCircle percentage={30} size={60} strokeWidth={5} />
        </div>
        <h3 className="text-lg font-semibold mb-2">Loading subreddit data</h3>
        <p className="text-muted-foreground">Fetching information about r/{subredditName}</p>
      </div>
    );
  }

  // Helper function to extract error message safely
  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  };

  if (subredditError || postsError) {
    return (
      <div className="p-4 border border-red-500 bg-red-100 rounded-md text-red-800 mb-4 flex items-start">
        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
        <div>
          <p>Error loading subreddit data</p>
          <p className="text-sm">
            {getErrorMessage(subredditError) || getErrorMessage(postsError)}
          </p>
        </div>
      </div>
    );
  }

  if (isAnalyzing && progress) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          <ProgressCircle percentage={progress.progress} size={80} strokeWidth={5} />
        </div>
        <h3 className="text-lg font-semibold mb-2">Analyzing r/{subredditName}</h3>
        <p className="text-muted-foreground">{progress.stage || 'Processing data...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <div className="p-4 border border-red-500 bg-red-100 rounded-md text-red-800 mb-4 flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
          <div>
            <p>Analysis failed</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
        <button 
          onClick={startAnalysis} 
          className="self-center mt-4 px-4 py-2 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (results) {
    return <AnalysisCard analysis={results} mode="new" />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <button 
        onClick={startAnalysis} 
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Analyze r/{subredditName}
      </button>
    </div>
  );
} 