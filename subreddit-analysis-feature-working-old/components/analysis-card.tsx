/**
 * Analysis Card Component
 * 
 * Displays detailed subreddit analysis results in a visually appealing card format.
 * Shows statistics, rules, content guidelines, and AI-generated insights.
 */

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Activity,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Target,
  Sparkles 
} from 'lucide-react';

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

interface AnalysisCardProps {
  analysis: AnalysisResult;
  isLoading?: boolean;
  error?: Error;
}

export function AnalysisCard({ analysis, isLoading, error }: AnalysisCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-500">
        <div className="text-red-500 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Error: {error.message}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Subscribers</p>
            <p className="text-xl font-semibold">
              {analysis.subscribers.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-xl font-semibold">
              {analysis.activeUsers.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Marketing Score</p>
            <div className="flex items-center gap-2">
              <Progress value={analysis.marketingFriendliness.score} className="w-24" />
              <span className="font-semibold">
                {analysis.marketingFriendliness.score}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Strategy */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Content Strategy
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Recommended Post Types</h4>
            <ul className="space-y-1">
              {analysis.contentStrategy.postTypes.map((type, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {type}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Best Posting Times (UTC)</h4>
            <ul className="space-y-1">
              {analysis.contentStrategy.timing.map((time, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {time.hour}:00 {time.timezone}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Strategic Analysis */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Strengths
          </h4>
          <ul className="space-y-1 text-sm">
            {analysis.strategicAnalysis.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Weaknesses
          </h4>
          <ul className="space-y-1 text-sm">
            {analysis.strategicAnalysis.weaknesses.map((weakness, index) => (
              <li key={index}>{weakness}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Opportunities
          </h4>
          <ul className="space-y-1 text-sm">
            {analysis.strategicAnalysis.opportunities.map((opportunity, index) => (
              <li key={index}>{opportunity}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Guidelines */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Posting Guidelines</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Restrictions</h4>
            <ul className="space-y-1">
              {analysis.postingGuidelines.restrictions.map((restriction, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  {restriction}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {analysis.postingGuidelines.recommendations.map((rec, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}