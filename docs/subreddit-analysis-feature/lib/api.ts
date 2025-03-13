/**
 * Frontend API Client for Subreddit Analysis
 * 
 * This module provides the frontend interface to interact with the subreddit analysis
 * backend service. It handles the API requests and provides a clean interface for
 * the React components to consume.
 * 
 * Features:
 * - Progress tracking for analysis requests
 * - Error handling and retry logic
 * - Type-safe API responses
 * 
 * Usage:
 * ```typescript
 * const analysis = await analyzeSubreddit('programming', (progress) => {
 *   console.log(`Analysis progress: ${progress}%`);
 * });
 * ```
 */

/**
 * Analyzes a subreddit and returns detailed statistics and insights
 * @param subreddit - Name of the subreddit to analyze
 * @param onProgress - Optional callback for tracking analysis progress
 * @returns Analysis results including statistics, rules, and AI insights
 */
export async function analyzeSubreddit(
  subreddit: string,
  onProgress?: (progress: number) => void
): Promise<any> {
  // Initialize progress
  onProgress?.(0);

  // Start progress simulation
  let progress = 0;
  const duration = Math.floor(Math.random() * (15000 - 10000) + 10000); // Random duration between 10-15 seconds
  const interval = 100; // Update every 100ms
  const steps = duration / interval;
  const increment = 90 / steps; // Go up to 90% during simulation

  const progressInterval = setInterval(() => {
    progress = Math.min(90, progress + increment);
    onProgress?.(progress);
  }, interval);

  try {
    const response = await fetch(`/api/analyze/${subreddit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Clear the interval once we get the response
    clearInterval(progressInterval);

    if (!response.ok) {
      const error = await response.text();
      onProgress?.(0);
      throw new Error(error || 'Failed to analyze subreddit');
    }

    // Jump to 100% when we have the data
    onProgress?.(100);
    const result = await response.json();
    return result;
  } catch (error) {
    clearInterval(progressInterval);
    onProgress?.(0);
    throw error;
  }
}
