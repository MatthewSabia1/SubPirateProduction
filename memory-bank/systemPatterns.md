# System Patterns

## Architecture Overview

### Frontend Architecture
```mermaid
flowchart TD
    Pages --> Components
    Components --> Features
    Features --> Services
    Services --> APIs
    Components --> SharedUI[Shared UI Components]
    Features --> Utils[Utility Functions]
```

### Data Flow
```mermaid
flowchart LR
    User --> Frontend
    Frontend --> RedditAPI[Reddit API]
    Frontend --> OpenRouterAPI[OpenRouter API]
    Frontend --> Supabase
    Frontend --> StripeAPI[Stripe API]
    RedditAPI --> Analysis
    OpenRouterAPI --> Analysis
    Analysis --> Supabase
    StripeAPI --> Webhook[Webhook Server]
    Webhook --> Supabase
```

### User Role Management Flow
```mermaid
flowchart TD
    Admin[Admin User] --> SetRole[Set User Role]
    SetRole --> RoleType{Role Type}
    RoleType -->|Admin| SetAdminRole[Set Admin Role]
    RoleType -->|Gift| SetGiftRole[Set Gift Role]
    RoleType -->|Regular| RemoveSpecialRole[Remove Special Role]
    
    SetAdminRole --> DatabaseUpdate[Update Profile Role]
    SetGiftRole --> DatabaseUpdate
    RemoveSpecialRole --> DatabaseUpdate
    
    DatabaseUpdate --> RefreshUI[Refresh UI]
    
    Admin -->|Create New| NewUser[Create Special User]
    NewUser --> CheckExists{User Exists?}
    CheckExists -->|Yes| UpdateExisting[Update Existing User]
    CheckExists -->|No| CreateNew[Create New User]
    CreateNew --> SetPassword[Generate Temporary Password]
    SetPassword --> SendReset[Send Reset Email]
    UpdateExisting --> SetRole
```

### Authentication Flow
```mermaid
flowchart TD
    User[User] --> LoginOptions[Login Options]
    LoginOptions --> EmailPassword[Email/Password]
    LoginOptions --> GoogleOAuth[Google OAuth]
    
    EmailPassword --> SupabaseAuth[Supabase Auth]
    GoogleOAuth --> GoogleConsent[Google Consent Screen]
    GoogleConsent --> AuthCallback[/auth/callback]
    
    SupabaseAuth --> SessionCreated{Session Created?}
    AuthCallback --> SessionCreated
    
    SessionCreated -->|Yes| Dashboard[Dashboard]
    SessionCreated -->|No| LoginError[Login Error]
    
    LoginError --> LoginOptions
```

### Subscription Flow
```mermaid
flowchart TD
    User[User] --> PricingPage[Pricing Page]
    PricingPage --> SelectPlan[Select Plan]
    SelectPlan --> CreateSession[Create Checkout Session]
    CreateSession --> StripeCheckout[Stripe Checkout]
    StripeCheckout --> Success{Success?}
    Success -->|Yes| RedirectApp[Redirect to App]
    Success -->|No| RedirectPricing[Return to Pricing]
    StripeCheckout --> WebhookEvents[Webhook Events]
    WebhookEvents --> UpdateStatus[Update Subscription Status]
    UpdateStatus --> DatabaseUpdate[Update Database]
```

### Environment Detection Pattern
```mermaid
flowchart TD
    Initialize[Initialize Stripe Client] --> CheckBuild{Is Production Build?}
    CheckBuild -->|Yes| CheckDomain{Check Domain}
    CheckBuild -->|No| UseTestMode[Use Test Mode]
    
    CheckDomain -->|Production Domain| UseProductionMode[Use Production Mode]
    CheckDomain -->|Dev/Preview Domain| UseTestMode
    
    UseTestMode --> LoadTestKeys[Load Test API Keys]
    UseProductionMode --> LoadProductionKeys[Load Production API Keys]
    
    LoadTestKeys --> InitStripe[Initialize Stripe Client]
    LoadProductionKeys --> InitStripe
    
    InitStripe --> LogMode[Log Current Mode]
    LogMode --> Ready[Client Ready]
```

## Component Structure

### Core Components
1. **Analysis Components**
   - SubredditAnalysis
   - AnalysisCard
   - ProgressBar
   - ContentTypeIndicators

2. **Project Components**
   - ProjectList
   - ProjectSubreddits
   - ProjectSettings
   - ShareProject

3. **Shared Components**
   - SavedList
   - AddToProject
   - FilterSort
   - Icons
   - AuthCallback

4. **Authentication Components**
   - Login
   - Signup
   - AuthCallback
   - AuthContext
   - PrivateRoute

5. **Subscription Components**
   - Pricing
   - PricingCard
   - TestModeIndicator
   - SubscriptionStatus

## Design Patterns

### 1. Component Patterns
- Presentational/Container separation
- Compound components for complex UIs
- Render props for flexible components
- Custom hooks for shared logic

### 2. State Management
- React Query for API data
- Local state for UI elements
- Supabase realtime for sync
- Context for theme/auth

### 3. Error Handling
- Boundary components
- Graceful degradation
- User-friendly messages
- Detailed logging
- Enhanced error diagnostics in test mode

### 4. Performance Patterns
- Code splitting
- Lazy loading
- Memoization
- Debounced API calls

### 5. Stripe Integration Patterns
- Test/Production mode separation
- Domain and build-based environment detection
  - Production mode only for production domain and production build
  - Test mode for development, local environments and preview deployments
  - Clear logging of current environment for debugging
- Environment-specific API keys and webhook secrets
- Fallback price IDs for reliability
- Visual indicators for test environment
- Webhook server for event handling
- Comprehensive logging for debugging
- Verification tools for production readiness

### 6. Production Readiness Pattern
```mermaid
flowchart TD
    Start[Start Verification] --> CheckEnv[Check Environment Variables]
    CheckEnv --> CheckAPI[Verify API Connection]
    CheckAPI --> CheckWebhooks[Verify Webhook Setup]
    CheckWebhooks --> CheckProducts[Verify Products & Prices]
    CheckProducts --> CheckDB[Verify Database Tables]
    CheckDB --> Summary[Generate Summary Report]
    Summary --> Decision{All Checks Passed?}
    Decision -->|Yes| Ready[Production Ready]
    Decision -->|No| Issues[Address Issues]
    Issues --> Start
```

### 7. Database Patterns
- Idempotent migrations for safety
  - Use IF EXISTS/IF NOT EXISTS clauses
  - DROP before CREATE for functions/triggers
  - Explicit permission grants for security
  - Security definer functions when needed
  - Row-level security policies for data protection
- Transaction-based operations for atomicity
- Proper indexing for performance
- Clear and consistent schema design
- Explicit foreign key constraints
- Regular database maintenance

### 8. User Usage Tracking Pattern
```mermaid
flowchart TD
    UserAction[User Action] --> CheckTier[Check Subscription Tier]
    CheckTier --> LimitCheck{Check Usage Limits}
    LimitCheck -->|Within Limits| IncrementCounter[Increment Usage Counter]
    LimitCheck -->|Exceeded| ShowUpgrade[Show Upgrade Prompt]
    IncrementCounter --> PerformAction[Perform Action]
    ShowUpgrade --> UpgradePath[Upgrade Path]
    
    subgraph UsageTracking[Usage Tracking System]
        IncrementCounter --> IncrementFunction[increment_usage_stat]
        IncrementFunction --> UpdateDB[Update user_usage_stats]
        GetLimits[get_user_usage_stats] --> ReadDB[Read user_usage_stats]
    end
    
    CheckTier --> GetLimits
```

This pattern ensures usage tracking is:
1. **Reliable**: SQL functions handle database consistency
2. **Secure**: Row-level security enforces data access
3. **Scalable**: Indexed tables for fast access
4. **Maintainable**: Clear separation of concerns
5. **Resilient**: Error handling at multiple levels

### 9. Image Loading Pattern
```mermaid
flowchart TD
    Component[UI Component] --> RedditImage[RedditImage Component]
    RedditImage --> AttemptLoad[Attempt Image Load]
    AttemptLoad --> LoadCheck{Success?}
    LoadCheck -->|Yes| DisplayImage[Display Image]
    LoadCheck -->|No| TryFallback{Fallback Available?}
    TryFallback -->|Yes| LoadFallback[Load Fallback Image]
    TryFallback -->|No| GeneratePlaceholder[Generate Placeholder]
    LoadFallback --> DisplayImage
    GeneratePlaceholder --> DisplayImage
```

This pattern ensures image loading is:
1. **Resilient**: Handles CORS errors and network failures gracefully
2. **User-friendly**: Always displays something meaningful
3. **Reusable**: Consistent approach across the application
4. **Efficient**: Uses lazy loading for performance
5. **Maintainable**: Centralizes image loading logic

### 10. Authentication Pattern
```mermaid
flowchart TD
    Component[UI Component] --> AuthContext[AuthContext]
    
    AuthContext --> AuthMethods{Auth Methods}
    AuthMethods -->|Email/Password| SignInWithEmail[signInWithEmail]
    AuthMethods -->|Google| SignInWithGoogle[signInWithGoogle]
    AuthMethods -->|Signup| SignUp[signUp]
    AuthMethods -->|Logout| SignOut[signOut]
    
    SignInWithEmail --> SupabaseAuth[Supabase Auth]
    SignInWithGoogle --> SupabaseOAuth[Supabase OAuth]
    SignUp --> SupabaseAuth
    SignOut --> SupabaseAuth
    
    SupabaseOAuth --> Redirect[Redirect to Provider]
    Redirect --> Callback[AuthCallback Component]
    Callback --> SessionCheck{Session Valid?}
    
    SupabaseAuth --> SessionCheck
    
    SessionCheck -->|Yes| SetSession[Set Session in Context]
    SessionCheck -->|No| HandleError[Handle Error]
    
    SetSession --> ProtectedRoute[Access Protected Routes]
    HandleError --> ShowError[Show Error Message]
```

This pattern ensures authentication is:
1. **Consistent**: Unified approach across different providers
2. **Secure**: Proper session handling and validation
3. **User-friendly**: Clear feedback during authentication process
4. **Flexible**: Easy to add new authentication providers
5. **Maintainable**: Centralized authentication logic in AuthContext

### User Role Management Pattern
```mermaid
flowchart TD
    Start[Role Assignment] --> CheckRole{Which Role?}
    CheckRole -->|Admin| SetAdmin[Set Admin Role]
    CheckRole -->|Gift| SetGift[Set Gift Role]
    CheckRole -->|User| RemoveSpecial[Remove Special Role]
    
    SetAdmin --> DatabaseUpdate[Update User Profile]
    SetGift --> DatabaseUpdate
    RemoveSpecial --> DatabaseUpdate
    
    DatabaseUpdate --> Trigger[Database Trigger]
    Trigger --> CreateSubscription[Create/Update Role-specific Subscription]
    CreateSubscription --> Frontend[Update Frontend Access]
    
    Frontend --> CheckAccess{Check Access}
    CheckAccess -->|Admin| AdminFeatures[Full Access + Admin Panel]
    CheckAccess -->|Gift| GiftFeatures[Pro-level Access]
    CheckAccess -->|Regular| StandardFeatures[Tier-based Access]
```

The User Role Management Pattern implements:
1. **Role-based Access Control**: Three distinct user roles (user, admin, gift)
2. **Database Functions**:
   - `is_admin(user_id)`: Checks if a user has admin role
   - `is_gift_user(user_id)`: Checks if a user has gift role
   - `set_user_role(user_id, role)`: Securely sets a user's role with validation
3. **Database Triggers**:
   - `special_role_subscription_trigger`: Automatically maintains subscription records for admin and gift users
4. **Command-line Interface**: Admin tool for role management
5. **UI Components**: Role-specific displays in Settings page
6. **Feature Access System**: Tier access based on role

### Subscription Tier System Pattern
```mermaid
flowchart TD
    User[User] --> CheckRole{Check Role}
    CheckRole -->|Admin| AdminTier[Admin Tier]
    CheckRole -->|Gift| GiftTier[Gift Tier]
    CheckRole -->|Regular| CheckSubscription[Check Subscription]
    
    CheckSubscription --> TierAssignment[Assign Tier]
    AdminTier --> Features{Feature Access}
    GiftTier --> Features
    TierAssignment --> Features
    
    Features --> FeatureCheck{Has Access?}
    FeatureCheck -->|Yes| AllowAccess[Allow Feature]
    FeatureCheck -->|No| UpgradePrompt[Show Upgrade]
```

The Subscription Tier System includes:
1. **Hierarchical Tiers**: free, starter, creator, pro, agency, admin, gift
2. **Role-based Override**: admin and gift roles override regular subscription
3. **Feature Mapping**: Feature keys mapped to tiers
4. **Usage Limits**: Tier-specific limits on various metrics
5. **UI Rendering**: Different UI/UX based on tier
6. **Clear Upgrade Paths**: For regular users to enhance their subscription

## Technical Decisions

### 1. Framework Choices
- **React**: Component-based UI
- **TypeScript**: Type safety
- **Tailwind**: Styling
- **Supabase**: Backend
- **Express**: Webhook server

### 2. API Integration
- **Reddit API**: Direct REST calls
- **OpenRouter**: AI analysis
- **Supabase**: Real-time data
- **Stripe API**: Subscription management
   - Test mode during development
   - Webhook events for state management

### 3. Data Storage
- **Supabase Tables**:
  - projects
  - subreddits
  - project_subreddits
  - saved_subreddits
  - user_settings
  - subscriptions
  - payment_history

### 4. Authentication
- Supabase Auth
- Multiple authentication providers:
  - Email/Password for traditional login
  - Google OAuth for social login
- JWT tokens
- Role-based access
- Subscription-based feature access
- Dedicated callback route for OAuth providers
- Consistent error handling across authentication methods

### 5. Environment Separation
- Development with forced test mode
- Test environment with test API keys
- Production with live API keys
- Clear visual indicators per environment

## Testing Strategies

### 1. Unit Testing
- Component tests
- Utility function tests
- Mock API responses

### 2. Integration Testing
- User flow tests
- API integration tests
- Database interactions

### 3. Subscription Testing
- Mock Stripe events
- Webhook verification tests
- Success/failure flow tests
- Using Stripe CLI for local webhook testing

### Directory Structure
```
src/
├── components/
│   ├── analysis/
│   ├── project/
│   └── shared/
├── features/
│   ├── subreddit-analysis/
│   └── project-management/
├── lib/
│   ├── api/
│   ├── utils/
│   └── hooks/
├── pages/
└── styles/
```

### Feature Organization
- Services
- Components
- Types
- Utils
- Hooks

## Implementation Guidelines

### 1. Component Guidelines
- Single responsibility
- Prop type definitions
- Error boundaries
- Loading states

### 2. State Management
- Minimize prop drilling
- Centralize API logic
- Cache management
- Optimistic updates

### 3. Styling Approach
- Tailwind utilities
- CSS variables
- Responsive design
- Dark theme

### 4. Testing Strategy
- Unit tests for utils
- Component testing
- Integration tests
- E2E workflows

### 1. Type Safety Guidelines
- Use `unknown` for external data
- Implement type guards
- Validate parsed data
- Handle edge cases

### 2. Analysis Guidelines
- Sample sufficient data
- Validate inputs
- Provide fallbacks
- Handle errors gracefully

### 3. Database Guidelines
- Match schema types
- Handle nullables
- Validate before save
- Type-safe queries

## UI Patterns

### Card Interaction Pattern
```tsx
<div 
  onClick={handleCardClick}
  className="p-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
>
  <div className="flex items-center justify-between">
    {/* Card Content */}
    <div className="flex items-center gap-4">
      {/* Main Content */}
    </div>
    
    {/* Action Buttons */}
    <div onClick={e => e.stopPropagation()}>
      {/* Independent Actions */}
    </div>
  </div>
</div>
```

Key characteristics:
1. Full Card Clickability:
   - Entire card surface is clickable
   - Clear visual feedback on hover
   - Proper cursor indication
   - Accessible click targets

2. Action Independence:
   - Action buttons stop event propagation
   - Preserve independent functionality
   - Clear visual separation
   - Maintain hover states

3. Visual Hierarchy:
   - Card-level hover effects
   - Action-specific states
   - Status indicators
   - Consistent spacing

4. Implementation:
   - Event bubbling control
   - Type-safe handlers
   - Proper event isolation
   - Accessibility support

### Data Display Consistency
1. Community Stats Format
   - Total subscribers: Gray text with Users icon
   - Online users: Emerald text with Activity icon
   - Consistent spacing and layout across views
   - Conditional rendering for online count when > 0

2. Component Structure
   - Grid-based layouts for data tables
   - Consistent column widths and spacing
   - Unified action button styling
   - Standardized icon usage

### Data Refresh Patterns
1. Automatic Updates
   - Periodic refresh of subreddit data
   - Database synchronization
   - Local state management
   - Error handling and recovery

2. Data Transformation
   - Consistent handling of API responses
   - Proper type casting and validation
   - Unified formatting functions
   - Error boundary implementation

## Component Architecture

### Shared Components
1. Data Display Components
   - Community stats display
   - Action buttons
   - Status indicators
   - Loading states

2. Data Management
   - Refresh mechanisms
   - State synchronization
   - Error handling
   - Cache management

### Code Organization
1. Component Structure
   - Consistent prop interfaces
   - Shared utility functions
   - Common styling patterns
   - Reusable hooks

2. State Management
   - Local component state
   - Database synchronization
   - Cache handling
   - Error state management

## Analysis System Architecture

### Core Components

#### 1. OpenRouter Service (`src/lib/openRouter.ts`)
- Primary interface for AI analysis
- Handles API communication
- Manages retries and error handling
- Validates and transforms AI output

Latest patterns:
```typescript
interface SubredditAnalysisInput {
  name: string;
  title: string;
  description: string;
  rules: {
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }[];
  content_categories: string[];
  posting_requirements: {
    karma_required: boolean;
    account_age_required: boolean;
    manual_approval: boolean;
  };
  allowed_content_types: string[];
}
```

#### 2. Analysis Worker (`src/workers/analysis.worker.ts`)
- Handles analysis in background thread
- Prepares input data
- Manages analysis lifecycle
- Reports progress and results

### Analysis Patterns

#### Rule Analysis Pattern
1. Text Analysis:
   ```typescript
   function determineMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
     const text = `${rule.title} ${rule.description}`.toLowerCase();
     
     const highImpactKeywords = [
       'spam', 'promotion', 'advertising', 'marketing', 'self-promotion',
       'commercial', 'business', 'selling', 'merchandise', 'affiliate'
     ];
     
     const mediumImpactKeywords = [
       'quality', 'format', 'title', 'flair', 'tags',
       'submission', 'guidelines', 'requirements', 'posting'
     ];
     
     if (highImpactKeywords.some(keyword => text.includes(keyword))) {
       return 'high';
     }
     
     if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
       return 'medium';
     }
     
     return 'low';
   }
   ```

2. Content Type Detection:
   ```typescript
   function determineAllowedContentTypes(info: SubredditInfo, posts: SubredditPost[]): string[] {
     const types = new Set<string>();
     
     // Rule analysis
     const rulesText = info.rules
       .map(rule => `${rule.title} ${rule.description}`)
       .join(' ')
       .toLowerCase();

     // Default content types
     if (!rulesText.includes('no text posts')) types.add('text');
     if (!rulesText.includes('no image')) types.add('image');
     if (!rulesText.includes('no video')) types.add('video');
     if (!rulesText.includes('no link')) types.add('link');

     // Validation against posts
     posts.forEach(post => {
       if (post.selftext) types.add('text');
       if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
       if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
       if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
         types.add('link');
       }
     });

     return Array.from(types);
   }
   ```

#### Title Template Pattern
```typescript
function extractTitlePatterns(rules: any[]): string[] {
  const patterns = new Set<string>();
  const ruleText = Array.isArray(rules) ? rules.join(' ').toLowerCase() : '';

  if (ruleText.includes('[') && ruleText.includes(']')) {
    patterns.add('[Category/Topic] Your Title');
  }
  
  if (ruleText.includes('flair')) {
    patterns.add('Title with Required Flair');
  }

  if (patterns.size === 0) {
    patterns.add('Descriptive Title');
    patterns.add('Question Format Title?');
    patterns.add('[Topic] - Description');
  }

  return Array.from(patterns);
}
```

#### Marketing Score Pattern
```typescript
function calculateMarketingScore(rules: any[]): number {
  let score = 75; // Base score
  
  // Count restrictive rules
  const highImpactRules = rules.filter((r: any) => r.marketingImpact === 'high').length;
  const mediumImpactRules = rules.filter((r: any) => r.marketingImpact === 'medium').length;
  
  // Deduct points for restrictive rules
  score -= (highImpactRules * 10);
  score -= (mediumImpactRules * 5);
  
  return Math.max(0, Math.min(100, score));
}
```

### AI Integration Pattern

#### System Prompt Pattern
```typescript
const systemPrompt = `You are an expert Reddit marketing analyst. Your task is to analyze subreddit rules and content requirements to determine marketing potential. Focus ONLY on:

1. Rule Analysis:
   - How restrictive are the rules regarding marketing/promotion?
   - What content types are allowed/prohibited?
   - Are there specific formatting requirements?

2. Title Requirements:
   - Required formats (e.g. [Tags], specific prefixes)
   - Prohibited patterns
   - Length restrictions
   - Example templates that comply with rules

3. Content Restrictions:
   - Allowed media types
   - Required content elements
   - Prohibited content types
   - Quality requirements

DO NOT consider engagement metrics, subscriber counts, or activity levels. Base your analysis purely on how permissive or restrictive the subreddit's rules and requirements are for marketing activities.`;
```

#### Output Validation Pattern
```typescript
function validateAndTransformOutput(result: unknown): AIAnalysisOutput {
  let parsedResult: any = result;
  
  try {
    // Handle markdown-formatted results
    if (typeof parsedResult === 'string') {
      const markdownMatch = parsedResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        parsedResult = JSON.parse(markdownMatch[1].trim());
      }
    }

    // Transform and validate output
    const output: AIAnalysisOutput = {
      postingLimits: {
        frequency: parsedResult?.postingLimits?.frequency || 1,
        bestTimeToPost: ['Morning', 'Afternoon', 'Evening'],
        contentRestrictions: Array.isArray(parsedResult?.postingLimits?.contentRestrictions)
          ? parsedResult.postingLimits.contentRestrictions
          : ['Follow subreddit rules']
      },
      // ... rest of validation logic
    };

    return output;
  } catch (error) {
    throw new AIAnalysisError('Failed to validate AI response');
  }
}
```

## Layout Patterns

### Page Container Pattern
The application now follows a consistent page container pattern across major list views:

```tsx
<div className="max-w-[1200px] mx-auto px-4 md:px-8">
  {/* Page content */}
</div>
```

Key characteristics:
1. Maximum width constraint (1200px)
2. Centered horizontally using auto margins
3. Responsive padding:
   - Mobile: 16px (px-4)
   - Desktop: 32px (px-8)

Currently implemented in:
- SavedList component (`src/pages/SavedList.tsx`)
- Projects page (`src/pages/Projects.tsx`)

This pattern ensures:
- Consistent content width across pages
- Proper content alignment
- Responsive behavior on different screen sizes
- Improved readability on wide screens

### Card List Pattern
For lists of items (projects, saved subreddits), we use:
```tsx
<div className="bg-[#111111] rounded-lg overflow-hidden">
  <div className="divide-y divide-[#222222]">
    {/* List items */}
  </div>
</div>
```

Features:
- Dark background (#111111)
- Rounded corners
- Dividers between items (#222222)
- Overflow handling 

## Data Structure Patterns

### Subreddit Analysis Data
The application follows a consistent data structure pattern for subreddit analysis:

```typescript
interface AnalysisData {
  // Basic Information
  subreddit: string;
  subscribers: number;
  activeUsers: number;
  rules?: any[];

  // Marketing Analysis
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };

  // Posting Strategy
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };

  // Content Strategy
  contentStrategy: {
    recommendedTypes: string[];
    topics: string[];
    dos: string[];
    donts: string[];
  };

  // Analysis Results
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };

  // Optional Components
  titleTemplates?: {
    patterns: string[];
    examples: string[];
    effectiveness: number;
  };
  gamePlan?: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}
```

### Data Flow
1. OpenRouter AI Service
   - Generates analysis with consistent schema
   - Validates against TypeScript interface
   - Returns structured data

2. Frontend Components
   - Use consistent property paths
   - Implement validation checks
   - Handle optional properties safely

3. Database Storage
   - Maps to Supabase schema
   - Preserves complete analysis data
   - Handles data versioning

### Validation Patterns
```typescript
// Component-level validation
if (!analysis?.postingLimits?.contentRestrictions || 
    !analysis?.marketingFriendliness?.score || 
    !analysis?.contentStrategy?.recommendedTypes) {
  // Handle incomplete data
}

// Database-level validation
interface SavedSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  posting_requirements: {
    restrictions: string[];
    recommendations: string[];
  };
  posting_frequency: {
    timing: Array<{ hour: number; timezone: string }>;
    postTypes: string[];
  };
  best_practices: string[];
  analysis_data: AnalysisData;
}
```

### Error Handling Patterns
1. API Service Errors
   - Retry logic for transient failures
   - Specific error messages for different scenarios
   - Graceful degradation

2. Data Validation Errors
   - Early validation in components
   - User-friendly error messages
   - Recovery options when possible

3. Save Operation Errors
   - Transaction-like operations
   - Rollback on failure
   - User feedback and retry options

## Component Patterns

### Analysis Display
- Consistent grid layout
- Section-based organization
- Progressive disclosure
- Error boundaries

### Data Input/Output
- Type-safe interfaces
- Validation before save
- Optimistic updates
- Error recovery

## Best Practices

### Data Structure
1. Use consistent property naming
2. Implement proper TypeScript interfaces
3. Handle optional properties explicitly
4. Validate data at boundaries

### Error Handling
1. Implement retry logic
2. Provide specific error messages
3. Handle edge cases gracefully
4. Log errors for debugging

### Component Design
1. Use TypeScript for type safety
2. Implement proper validation
3. Handle loading states
4. Provide error feedback

### Database Operations
1. Use transactions when needed
2. Validate data before save
3. Handle conflicts properly
4. Maintain data integrity 

## Prompt System Architecture
- Location: `src/features/subreddit-analysis/lib/prompts.ts`
- Two main components:
  1. SYSTEM_PROMPT: Core instruction set for the AI
  2. ANALYSIS_PROMPT: Task-specific instructions

### Prompt Design Patterns
1. Rule Analysis Pattern
   - Thorough examination of rules
   - Identification of exploitable gaps
   - Loophole detection
   
2. Risk Assessment Pattern
   - Risk-reward calculation
   - Detection probability analysis
   - Ban risk evaluation
   
3. Stealth Pattern
   - Plausible deniability maintenance
   - Organic content blending
   - Mod scrutiny avoidance

4. Circumvention Pattern
   - Restriction bypass strategies
   - Automod pattern analysis
   - Detection avoidance techniques

### AI Response Structure
- JSON Schema conformant
- Includes:
  - Marketing friendliness score
  - Rule exploitation strategies
  - Risk assessments
  - Tactical recommendations
  - Stealth techniques

## Key Technical Decisions
1. Sophisticated Rule Analysis
   - Analyze rather than disregard rules
   - Focus on exploitation over violation
   - Maintain plausible deniability

2. Risk-Based Approach
   - Calculate risk-reward ratios
   - Assess detection probabilities
   - Evaluate mod response patterns

3. Stealth-First Design
   - Blend with organic content
   - Avoid obvious patterns
   - Maintain legitimate appearance 

## Stripe Integration Architecture

### Subscription Flow
```mermaid
flowchart LR
    User --> Checkout[Stripe Checkout]
    Checkout --> StripeAPI[Stripe API]
    StripeAPI --> Webhook[Webhook Endpoint]
    Webhook --> Database[Supabase Database]
    User --> Portal[Customer Portal]
    Portal --> StripeAPI
    User --> App[Application]
    App --> Database
```

### User Association Pattern
The system uses a reliable pattern to associate Stripe customers with application users:

1. **Metadata Association**: 
   - User ID is stored in Stripe customer metadata during checkout
   - Webhook handlers extract user ID from metadata
   - Database records are linked using this ID

2. **Event-Based Architecture**:
   - Stripe webhooks serve as the source of truth
   - Application reacts to webhook events
   - Database is synchronized based on event data

3. **Implementation**:
```typescript
// Storing user ID in metadata during checkout
const sessionParams = {
  customer_creation: 'always',
  customer_email: userEmail,
  customer_data: {
    metadata: {
      userId: userId
    }
  },
  subscription_data: {
    metadata: {
      userId: userId
    }
  }
};

// Extracting user ID from webhook event
const userId = event.data.object.customer?.metadata?.userId || 
               event.data.object.metadata?.userId;

// Database synchronization
if (userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      subscription_id: subscriptionId,
      status: status,
      // Other fields...
    });
}
```

### Error Handling Pattern
The subscription system implements a robust error handling pattern:

1. **Graceful Degradation**:
   - Use of `.maybeSingle()` instead of `.single()` for queries
   - Default to free tier when subscription lookup fails
   - Fallback strategies for missing data

2. **Comprehensive Logging**:
   - Detailed error capture at each step
   - User ID included in logs for traceability
   - Structured error objects with context

3. **Query Pattern Improvements**:
   - Using wildcard `*` for select queries to avoid 406 errors
   - Simplified query structure to prevent column mismatch errors
   - Consistent error handling across subscription-related functions

### Customer Portal Integration
The system implements a standard pattern for customer portal access:

1. **Session Creation**:
   - Generate a portal session for the current user
   - Pass return URL for seamless experience
   - Handle errors with graceful fallbacks

2. **Implementation**:
```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: returnUrl
});
```

### Database Schema

#### Core Tables
```sql
-- Stripe prices table
CREATE TABLE public.stripe_prices (
    id text PRIMARY KEY,              -- Stripe price ID
    active boolean DEFAULT true,
    currency text DEFAULT 'usd',
    unit_amount integer,              -- Amount in cents
    type text DEFAULT 'recurring',
    recurring_interval text DEFAULT 'month',
    product_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Main subscriptions table
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status subscription_status NOT NULL,
    price_id text REFERENCES stripe_prices(id),
    quantity integer DEFAULT 1,
    cancel_at_period_end boolean DEFAULT false,
    cancel_at timestamptz,
    canceled_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,
    created_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    trial_start timestamptz,
    trial_end timestamptz
);

-- Customer subscriptions linking table
CREATE TABLE public.customer_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid NOT NULL,
    stripe_price_id text REFERENCES stripe_prices(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Key Design Decisions

1. **ID Management**
   - Using text type for all Stripe IDs
   - Using UUIDs for internal primary keys
   - Direct storage of Stripe IDs for easy reference

2. **Subscription States**
   ```sql
   CREATE TYPE subscription_status AS ENUM (
       'trialing',
       'active',
       'canceled',
       'incomplete',
       'incomplete_expired',
       'past_due',
       'unpaid',
       'paused'
   );
   ```

3. **Price Management**
   - Storing prices in cents to avoid floating-point issues
   - Maintaining Stripe price IDs as primary reference
   - Supporting both one-time and recurring prices

4. **Relationship Structure**
   - Direct user to subscription relationship
   - Flexible customer subscription linking
   - Foreign key constraints for data integrity

### Integration Patterns

1. **Price Synchronization**
   - Stripe is source of truth for prices
   - Local cache in stripe_prices table
   - Regular sync via webhooks

2. **Subscription Management**
   - Direct mapping to Stripe subscriptions
   - Status tracking via subscription_status
   - Support for trial periods

3. **Customer Management**
   - Flexible customer-subscription relationship
   - Support for multiple subscription types
   - Clean separation of concerns

### Security Considerations

1. **Data Protection**
   - No sensitive payment data stored locally
   - Only reference IDs from Stripe stored
   - All payment processing handled by Stripe

2. **Access Control**
   - Row Level Security (RLS) policies
   - User-specific subscription access
   - Protected price management 

## Image Handling Patterns

### Reddit Image Processing
1. **Image Source Priority**
   ```typescript
   // Try sources in order:
   1. preview?.images[0]?.source?.url  // Highest quality
   2. thumbnail                        // Fallback
   3. media?.oembed?.thumbnail_url     // Additional source
   4. generatePlaceholder()            // Last resort
   ```

2. **NSFW Content Handling**
   ```typescript
   // No content filtering - handle special values
   if (postData.thumbnail === 'nsfw') {
     // Try to get alternative image source
     if (postData.preview?.images?.[0]?.source?.url) {
       thumbnailUrl = decodeHtmlEntities(postData.preview.images[0].source.url);
     } else if (postData.media?.oembed?.thumbnail_url) {
       thumbnailUrl = decodeHtmlEntities(postData.media.oembed.thumbnail_url);
     }
   }
   ```

3. **URL Validation**
   ```typescript
   const isValidUrl = (url: string): boolean => {
     if (!url) return false;
     // Only filter non-URL placeholders
     if (url === 'self' || url === 'default' || url === 'image') return false;
     try {
       new URL(url);
       return true;
     } catch (e) {
       return false;
     }
   };
   ```

### Image Component Pattern
```typescript
// RedditImage component usage
<RedditImage 
  src={primaryImageUrl}
  alt={title}
  className="..."
  fallbackSrc={fallbackImageUrl}
/>
```

## Error Handling Patterns

### Image Loading Errors
```typescript
// Progressive fallback system
1. Try primary image
2. On error, try fallback image
3. On fallback error, use generated placeholder
4. Log all failures for debugging
```

### API Error Handling
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      // Handle not found
    } else if (response.status === 403) {
      // Handle forbidden
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
} catch (err) {
  console.error('Error fetching data:', err);
  // Set safe error state
}
```

## Content Display Patterns

### Post Details Display
```typescript
// Post display hierarchy
1. Title and metadata
2. Image/thumbnail if available
3. Content preview
4. Engagement metrics
5. Action buttons
```

### Calendar Display Pattern
```typescript
// Calendar post display
1. Compact view in grid
2. Expandable details in modal
3. Full content access on click
4. No content filtering
```

## Data Fetching Patterns

### Reddit API Integration
```typescript
// API request pattern
1. Validate input
2. Check rate limits
3. Make request
4. Handle special cases
5. Process response
6. Update state
```

### Post Syncing Pattern
```typescript
// Sync process
1. Fetch latest posts
2. Process all content types
3. Store in database
4. Update UI
```

## State Management Patterns

### Loading States
```typescript
// Loading state pattern
1. Initial loading
2. Content fetching
3. Error states
4. Success states
```

### Data Caching
```typescript
// Cache implementation
1. Store fetched data
2. Check cache before API calls
3. Invalidate on updates
4. Refresh periodically
```

## UI Patterns

### Modal Pattern
```typescript
// Modal implementation
1. Trigger opens modal
2. Load content
3. Handle interactions
4. Close and cleanup
```

### Responsive Design
```typescript
// Breakpoint pattern
sm: '640px'   // Mobile
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large Desktop
```

## Security Patterns

### Authentication
```typescript
// Auth flow
1. Check auth state
2. Validate tokens
3. Refresh if needed
4. Handle errors
```

### Data Access
```typescript
// Access control
1. Check user permissions
2. Validate request
3. Filter response
4. Log access
```

### Admin Panel Architecture
```mermaid
flowchart TD
    AdminPage[Admin Page] --> AdminTabs{Tab Selection}
    AdminTabs -->|Metrics| AdminMetrics[Admin Metrics]
    AdminTabs -->|Users| UserManagement[User Management]
    AdminTabs -->|Tools| AdminTools[Admin Tools]
    UserManagement -->|Select User| UserDetails[User Details]
    AdminMetrics -->|Fetch| MetricsData[Database Metrics]
    UserManagement -->|Fetch| UsersData[User Database]
    UserDetails -->|Fetch| UserDetailData[User Details Data]
    AdminTools -->|Create| SpecialUser[Special User]
```

### Admin Panel Access Flow
```mermaid
flowchart TD
    User -->|Navigate| AdminRoute[/admin Route]
    AdminRoute --> CheckAuth{Is Authenticated?}
    CheckAuth -->|No| RedirectLogin[Redirect to Login]
    CheckAuth -->|Yes| CheckAdmin{Is Admin?}
    CheckAdmin -->|No| RedirectDashboard[Redirect to Dashboard]
    CheckAdmin -->|Yes| AdminPanel[Admin Panel]
    AdminPanel --> AdminTabs{Tab Selection}
    AdminTabs -->|Metrics| ShowMetrics[Show Metrics]
    AdminTabs -->|Users| ShowUsers[Show User Management]
    AdminTabs -->|Tools| ShowTools[Show Admin Tools]
    ShowUsers -->|Select User| ShowUserDetails[Show User Details]
```

## User-Specific Data Management

### User-Specific Search History
- Search history is now tracked and filtered by user_id to ensure privacy and relevance
- The frequent_searches table includes a user_id column that references auth.users(id)
- The increment_search_count function accepts a user_id parameter to associate searches with specific users
- The FrequentSearches component filters searches by the current authenticated user
- This pattern ensures users only see their own search history and prevents data leakage
- The component handles both authenticated and unauthenticated user states appropriately