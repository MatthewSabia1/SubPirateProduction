npm install @tanstack/react-query zod @hookform/resolvers/zod react-hook-form @radix-ui/react-progress @radix-ui/react-alert-dialog lucide-react @radix-ui/react-card @radix-ui/react-toast framer-motion
```

## Environment Variables

Create a `.env` file with your API credentials:

```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
DEEPSEEK_API_KEY=your_deepseek_api_key
```

## Module Configuration

Configure module aliases in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@db/*": ["./db/*"]
    }
  }
}
```

## File Structure

```
subreddit-analysis-feature/
├── services/
│   ├── reddit.ts         # Reddit API integration
│   ├── deepseek.ts      # DeepSeek AI analysis
│   └── errors.ts        # Error handling classes
├── lib/
│   ├── api.ts           # Frontend API client
│   └── prompts.ts       # AI analysis prompts
├── components/
│   ├── subreddit-analyzer.tsx  # Main analysis component
│   └── analysis-card.tsx       # Results display component
└── README.md            # Documentation
```

## Backend Integration

1. Import and initialize the services:

```typescript
import { redditAPI } from './services/reddit';
import { DeepSeek } from './services/deepseek';

const deepseek = new DeepSeek();
```

2. Add the analysis endpoint to your Express app:

```typescript
app.get('/api/analyze/:subreddit', async (req, res) => {
  try {
    const stats = await redditAPI.getSubredditStats(req.params.subreddit);
    const analysis = await deepseek.analyzeSubreddit(stats);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Frontend Integration

1. Import the components:

```typescript
import { SubredditAnalyzer } from './components/subreddit-analyzer';
import { AnalysisCard } from './components/analysis-card';
```

2. Use them in your React application:

```tsx
function AnalysisPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Subreddit Analysis</h1>
      <SubredditAnalyzer />
    </div>
  );
}
```

## API Response Types

The analysis results follow this structure:

```typescript
interface AnalysisResult {
  subreddit: string;
  subscribers: number;
  activeUsers: number;
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };
  postingGuidelines: {
    allowedTypes: string[];
    restrictions: string[];
    recommendations: string[];
  };
  contentStrategy: {
    postTypes: string[];
    timing: Array<{ hour: number; timezone: string }>;
    topics: string[];
  };
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
}