import { Router, Request, Response, NextFunction } from 'express';
import { RedditAPI } from './services/reddit';
import { OpenRouter } from './services/openrouter';

const router = Router();

router.get('/analyze/:subreddit', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    const subreddit = req.params.subreddit;
    try {
      const redditAPI = new RedditAPI();
      const stats = await redditAPI.getSubredditStats(subreddit);
      const openRouter = new OpenRouter();
      const analysis = await openRouter.analyzeSubreddit(stats);
      res.json(analysis);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return next(error);
      }
      return next(new Error('Unknown error'));
    }
  })().catch(next);
});

export default router; 