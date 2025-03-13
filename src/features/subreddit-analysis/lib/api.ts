/* src/features/subreddit-analysis/lib/api.ts */

export async function analyzeSubreddit(subreddit: string): Promise<any> {
  const response = await fetch(`/api/analyze/${subreddit}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return await response.json();
} 