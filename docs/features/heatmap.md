# Subreddit Activity Heatmap

## Overview
The heatmap visualization displays subreddit posting activity patterns across different days and hours. It helps users identify the best times to post by analyzing engagement patterns from the top 500 posts.

## Features

### 1. Interactive Visualization
- Day/hour grid showing post activity
- Color intensity based on post engagement
- Smooth hover effects with neighbor highlighting
- Portal-based tooltip system
- Responsive design

### 2. Data Processing
- Analyzes top 500 posts for better representation
- Engagement scoring: 75% upvotes, 25% comments
- Efficient data batching
- Fallback strategies for sparse data
- Automatic data normalization

### 3. User Interface
- Modern flat design aesthetic
- Smooth transitions and animations
- Clear visual feedback
- Accessible color scheme
- Informative tooltips

## Technical Implementation

### Component Structure
```typescript
interface Post {
  title: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface HeatmapProps {
  posts: Post[];
}

interface TooltipData {
  posts: Post[];
  position: { x: number; y: number };
  dayIndex: number;
  hour: number;
}
```

### Key Functions

#### 1. Intensity Calculation
```typescript
const getCellIntensity = (day: number, hour: number) => {
  const baseIntensity = grid[day][hour].score / maxScore;
  let totalIntensity = baseIntensity * 1.2;
  
  // Calculate neighbor effects
  for (let d = -2; d <= 2; d++) {
    for (let h = -2; h <= 2; h++) {
      // ... neighbor calculation logic
    }
  }
  
  return Math.min(totalIntensity, 1);
};
```

#### 2. Color Interpolation
```typescript
const interpolateColor = (intensity: number): string => {
  const start = { r: 26, g: 26, b: 26 }; // #1a1a1a
  const end = { r: 76, g: 175, b: 80 }; // #4CAF50
  // ... color interpolation logic
};
```

#### 3. Tooltip Positioning
```typescript
const getTooltipPosition = (rect: DOMRect, dayIndex: number, hour: number) => {
  // ... smart positioning logic to handle edge cases
};
```

## Usage

### Basic Implementation
```tsx
import { HeatmapChart } from '@/components/HeatmapChart';

function SubredditAnalysis({ posts }) {
  return (
    <div className="overflow-x-auto">
      <HeatmapChart posts={posts} />
    </div>
  );
}
```

### Data Requirements
- Minimum of 50 posts for meaningful visualization
- Posts must include:
  - Score (upvotes)
  - Number of comments
  - Creation timestamp
  - Title for tooltip display

## Styling

### Color Scheme
- Base: #1a1a1a (dark gray)
- Active: #4CAF50 (emerald green)
- Hover: rgba(76, 175, 80, 0.5)
- Border: #222222
- Text: #ffffff, #gray-400

### CSS Classes
```css
.heatmap-cell {
  transition: all 0.2s ease-out;
  border: 1px solid #222222;
}

.neighbor-hover {
  transition: all 0.2s ease-out !important;
}

.tooltip {
  @apply fixed z-[9999] w-72 bg-[#0A0A0A] rounded-lg border border-[#222222] shadow-xl;
  backdrop-filter: blur(8px);
}
```

## Performance Considerations

### Optimization Techniques
1. React.memo for pure components
2. Efficient neighbor calculation
3. Debounced hover effects
4. Proper cleanup of event listeners
5. Smart tooltip positioning

### Memory Management
1. Cleanup timeouts on unmount
2. Clear portal elements
3. Remove event listeners
4. Reset hover states

## Accessibility

### Features
1. Keyboard navigation support
2. Screen reader compatibility
3. ARIA labels for interactive elements
4. Sufficient color contrast
5. Focus management

### ARIA Attributes
```tsx
<div
  role="grid"
  aria-label="Post activity heatmap"
  // ... other attributes
>
  {/* Grid implementation */}
</div>
```

## Future Enhancements

### Planned Features
1. Customizable color schemes
2. Additional data visualizations
3. Export capabilities
4. Enhanced mobile support
5. Custom time ranges

### Considerations
- Scale testing with larger datasets
- Additional visualization options
- Enhanced tooltip features
- Mobile optimization
- Performance monitoring 