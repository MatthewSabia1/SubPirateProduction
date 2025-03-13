import { SubredditInfo } from '../hooks/useSubredditInfo';
import { SubredditPost } from '../hooks/useSubredditPosts';

export interface WorkerMessage {
  type: 'progress' | 'basicAnalysis' | 'complete' | 'error';
  data: any;
}

export interface ProgressData {
  progress: number;
  stage?: string;
}

export interface AnalysisInput {
  subredditName: string;
  subredditInfo: SubredditInfo;
  posts: SubredditPost[];
  rules?: Array<{
    title: string;
    description: string;
  }>;
  allowedContentTypes?: string[];
  subscribers?: number;
  active_users?: number;
}

export class AnalysisWorkerService {
  private worker: Worker | null = null;
  private progressCallback: ((data: ProgressData) => void) | null = null;
  private completeCallback: ((data: any) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private isAnalyzing: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    // Only create the worker in a browser environment
    if (typeof window !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
        this.setupMessageHandler();
      } catch (error) {
        console.error('Failed to initialize worker:', error);
      }
    }
  }

  private setupMessageHandler() {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { type, data } = event.data;

      switch (type) {
        case 'progress':
          if (this.progressCallback) {
            this.progressCallback(data);
          }
          break;
        
        case 'complete':
          this.isAnalyzing = false;
          if (this.completeCallback) {
            this.completeCallback(data);
          }
          break;
        
        case 'error':
          this.isAnalyzing = false;
          if (this.errorCallback) {
            this.errorCallback(new Error(data.message || 'Unknown analysis error'));
          }
          break;
        
        default:
          console.warn('Unknown message type from worker:', type);
      }
    };

    this.worker.onerror = (error) => {
      this.isAnalyzing = false;
      if (this.errorCallback) {
        this.errorCallback(new Error(`Worker error: ${error.message}`));
      }
    };
  }

  public onProgress(callback: (data: ProgressData) => void) {
    this.progressCallback = callback;
    return this;
  }

  public onComplete(callback: (data: any) => void) {
    this.completeCallback = callback;
    return this;
  }

  public onError(callback: (error: Error) => void) {
    this.errorCallback = callback;
    return this;
  }

  public async analyze(input: AnalysisInput): Promise<void> {
    if (!this.worker) {
      this.initWorker();
      if (!this.worker) {
        throw new Error('Analysis worker could not be initialized');
      }
    }

    if (this.isAnalyzing) {
      throw new Error('Analysis is already in progress');
    }

    this.isAnalyzing = true;
    
    // Report initial progress
    if (this.progressCallback) {
      this.progressCallback({ progress: 0, stage: 'Initializing analysis' });
    }

    try {
      console.log('Starting subreddit analysis for:', input.subredditName);
      this.worker.postMessage({
        type: 'analyze',
        data: input
      });
    } catch (error) {
      this.isAnalyzing = false;
      throw error;
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isAnalyzing = false;
    this.progressCallback = null;
    this.completeCallback = null;
    this.errorCallback = null;
  }
}

export const analysisWorker = new AnalysisWorkerService(); 