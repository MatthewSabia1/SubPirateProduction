/* src/features/subreddit-analysis/components/subreddit-analyzer.tsx */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm, SubmitHandler } from 'react-hook-form';
import { analyzeSubreddit } from '../lib/api';
import AnalysisCard from './analysis-card';

interface FormData {
  subreddit: string;
}

export const SubredditAnalyzer: React.FC = () => {
  const { register, handleSubmit } = useForm<FormData>();
  const [analysis, setAnalysis] = useState<any>(null);

  const mutation = useMutation((subreddit: string) => analyzeSubreddit(subreddit), {
    onSuccess: (data: any) => setAnalysis(data),
    onError: (error: unknown) => console.error('Error analyzing subreddit', error)
  });

  const onSubmit: SubmitHandler<FormData> = (data: FormData) => {
    mutation.mutate(data.subreddit);
  };

  const handleSaveComplete = () => {
    // Clear the analysis to show it was saved
    setAnalysis(null);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="mb-4">
        <input
          type="text"
          placeholder="Enter subreddit name"
          {...register('subreddit', { required: true })}
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Analyze
        </button>
      </form>
      {mutation.isLoading && <p>Loading...</p>}
      {mutation.isError && <p>Error analyzing subreddit.</p>}
      {analysis && (
        <div onClick={e => e.stopPropagation()}>
          <AnalysisCard 
            analysis={analysis} 
            mode="new" 
            isAnalyzing={mutation.isLoading}
            onSaveComplete={handleSaveComplete}
          />
        </div>
      )}
    </div>
  );
}; 