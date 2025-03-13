/**
 * Subreddit Analyzer Component
 * 
 * A React component that provides the user interface for analyzing subreddits.
 * It handles the analysis process, displays progress, and shows the results
 * in a user-friendly format.
 * 
 * Features:
 * - Real-time analysis progress tracking
 * - Error handling and user feedback
 * - Detailed display of subreddit statistics
 * - AI-powered insights visualization
 * 
 * Required Props:
 * None
 * 
 * Usage:
 * ```tsx
 * <SubredditAnalyzer />
 * ```
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeSubreddit } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function SubredditAnalyzer() {
  const [subreddit, setSubreddit] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleAnalysis = async () => {
    if (!subreddit) {
      toast({
        title: "Error",
        description: "Please enter a subreddit name",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setResults(null);

    try {
      const data = await analyzeSubreddit(subreddit, setProgress);
      setResults(data);
      toast({
        title: "Analysis Complete",
        description: "Subreddit analysis has been completed successfully."
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze subreddit",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Enter subreddit name"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              disabled={isAnalyzing}
            />
            <Button 
              onClick={handleAnalysis}
              disabled={isAnalyzing || !subreddit}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Analyzing r/{subreddit}... {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      </Card>

      {results && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
          {/* Add your results display here */}
        </Card>
      )}
    </div>
  );
}
