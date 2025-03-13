# Active Context

## Current Focus
- Fixed FrequentSearches component to only show the current user's searches instead of all users' searches
- Added user_id column to frequent_searches table to properly track searches per user
- Updated increment_search_count function to track which user made each search
- Implementing comprehensive admin panel for application management
- Admin panel metrics display for user growth, revenue, and usage statistics
- User management interface for role assignment and user administration
- User detail views for comprehensive user information and activity tracking
- Admin tools for creating special users (gift and admin accounts)
- Securing admin routes with proper authentication and authorization
- Implementing tabbed interface for admin panel navigation
- Enhancing Sidebar with conditional admin panel link for admin users
- Ensuring consistent subscription verification across all routes
- Improving error handling for subscription checks
- Enhancing the subscription features system to support multiple user roles
- Implementing the admin and gift user interfaces in the Settings page
- Creating administrative scripts to manage user roles
- Adding triggers for automatic subscription management based on user roles
- Extending the feature access system to support different user roles
- Improving error handling and validation in the role management system
- Maintaining consistent data structure between frontend and database
- Improving handling of Stripe test vs. live mode customer IDs
- Fixing redirect loops for users with active subscriptions
- Enhancing error logging for subscription verification
- Preparing Stripe integration for production environment
- Improving environment detection for Stripe configuration (test vs. production)
- Implementing robust verification tools for Stripe production readiness
- Enhancing webhook handling based on environment
- Creating comprehensive documentation for production Stripe setup
- Ensuring secure handling of production API keys and webhook secrets
- Data structure consistency fixes across subreddit analysis components
- Standardizing property naming between AI service and frontend components
- Improving error handling and validation
- Improving error handling and validation in Reddit API integration
- Standardizing error handling patterns across the application
- Maintaining consistent error reporting
- Enhancing subreddit analysis visualization with interactive heatmap
- Improving analysis data persistence and retrieval
- Optimizing re-analysis functionality in saved subreddits
- Implementing smooth hover effects and transitions
- Maintaining consistent data structure between frontend and database
- Refining the subreddit analysis system's prompts to be more sophisticated in its blackhat marketing approach
- Improving the marketing friendliness score calculation by making it more nuanced
- Fixing issues with the subreddit analysis system
- Removing engagement metrics from marketing friendliness scoring
- Improving title template generation
- Making AI output more consistent and focused
- Implementing Stripe subscription management
- Addressing Supabase 406 errors in subscription queries
- Fixing Stripe checkout session creation (400 error)
- Improving error handling in subscription flow
- Enhancing subscription data storage and association with users
- Implementing robust webhook handling for Stripe events
- Configuring Stripe to use test mode for development
- Fixing foreign key constraint issues in the database
- Resolving Stripe synchronization script errors
- Fixing Supabase RPC function 404 errors and permission issues
- Adding CORS protection for Reddit images
- Creating reusable components for handling external image loading
- Fixing potential image loading errors across the application
- Implementing Google Authentication for enhanced login options

## Recently Implemented Features

### Admin Panel
The application now includes a comprehensive admin panel accessible only to users with the admin role. This panel serves as a central management hub for application administrators and includes the following key components:

#### Admin Dashboard Metrics
- Total users count with new user growth statistics
- Monthly revenue calculation based on active subscriptions
- Subscription metrics by tier with visual distribution
- Usage statistics including total analyses and posts
- Activity summary with key performance indicators

#### User Management Interface
- Complete user table with search functionality
- User role management (admin, gift, regular)
- Password reset functionality
- User deletion with confirmation
- Visual indicators for different user types
- Profile image preview in user list

#### User Details View
- Comprehensive user profile information
- Subscription details and status
- Usage statistics and activity history
- Connected Reddit accounts
- Frequent searches history
- Projects overview
- Saved subreddits listing

#### Admin Tools
- Special user creation interface (admin or gift users)
- Existing user role modification
- Automatic password reset email generation
- Role descriptions and documentation
- Validation and error handling

#### Technical Implementation
- React Router integration with protected route
- Tab-based navigation system
- Role-based access control
- Database RPC functions for user role management
- Consistent styling with existing application
- Mobile-responsive design
- Clear error states and loading indicators

## Recent Changes
- Improved "Connect a Reddit Account" modal behavior:
  - Updated modal to only display after users have signed up, signed in, and have an active subscription
  - Prevented modal from appearing on public pages (landing, pricing, login, subscription, auth)
  - Added subscription status check before showing the modal
  - Enhanced path checking logic to determine if user is on a backend/dashboard page
  - Improved state management to prevent unnecessary modal displays
  - Added better logging for modal visibility conditions and state changes
  - Fixed modal display to only show once per page load in backend areas

- Fixed Stripe checkout session errors with price IDs:
  - Updated fallback price IDs in SubscriptionPage.tsx to match actual IDs in Stripe account
  - Replaced placeholder IDs (e.g., price_starter_monthly) with actual Stripe price IDs
  - Ensured consistent price ID usage across the application
  - Fixed the issue causing checkout session creation failures
  - Verified proper integration with Stripe API using correct price IDs

- Implemented comprehensive user role system with admin and gift roles:
  - Added a "gift" role to complement the existing "admin" role
  - Created a robust role management system with database functions and triggers
  - Implemented role-based subscription features and limits
  - Added specialized UI elements for different user roles in the Settings page
  - Enhanced the FeatureAccessContext to detect and handle different user roles
  - Created command-line scripts for managing user roles
  - Added database triggers to automatically maintain subscription records for special roles
  
- Enhanced the subscription system to support role-based access:
  - Extended the subscription tier enumeration to include "admin" and "gift" tiers
  - Added specialized handling for admin and gift users in the feature access system
  - Created custom subscription records for admin and gift users
  - Implemented unique constraints to prevent conflicts in subscription records
  - Developed triggers to automatically update subscription records when roles change
  - Fixed issues with ON CONFLICT clauses by adding proper constraints
  - Updated the FeatureAccessContext to check for admin and gift roles
  
- Improved the UI for different user roles:
  - Added special sections in Settings page for admin and gift users
  - Implemented role-specific visual indicators and messaging
  - Created custom subscription plan displays for different roles
  - Added appropriate icons and styling for each role type
  - Enhanced subscription management with role-specific actions and alerts
  - Implemented different subscription detail displays based on user role
  
- Developed administrative scripts and tools:
  - Updated the set-admin.js script to handle both admin and gift roles
  - Added comprehensive command-line options for role management
  - Improved error handling and user feedback in the scripts
  - Created separate npm commands for setting and removing different roles
  - Enhanced validation and error reporting for role management operations
  - Added documentation in both code and usage examples

- Fixed several critical issues with user role management:
  - Added a unique constraint on (user_id, stripe_subscription_id) in customer_subscriptions
  - Fixed SQL migration errors with the ON CONFLICT clause
  - Improved error handling for role-setting operations
  - Enhanced subscription feature availability checks
  - Updated the subscription tier type system across the application
  - Standardized role validation across multiple components
  - Fixed edge cases in the role-based subscription management

- Implemented mandatory subscription requirement for all new users:
  - Modified authentication flow to check subscription status
  - Updated routing to direct new users to subscription page
  - Enhanced subscription status verification across multiple tables
  - Added clear state management for authentication redirects
  - Improved error handling and logging during subscription checks
  - Fixed redirect issues for users with active subscriptions
  - Added robust error handling for subscription verification
  - Fixed issue with customer ID mismatches between test/live environments

- Improved subscription verification across multiple tables:
  - Enhanced `checkUserSubscription` function to check both subscription tables
  - Added explicit OR condition handling for active/trialing status
  - Implemented individual queries as fallback for OR condition failures
  - Added detailed logging throughout the subscription check process
  - Created safety mechanisms for handling errors during subscription verification
  - Added graceful degradation for failed subscription checks

- Fixed routing for users with active subscriptions:
  - Removed `PrivateRoute` wrapper from subscription page to prevent redirect loops
  - Updated subscription page to correctly handle authenticated users
  - Enhanced logic in `App.tsx` to prevent unnecessary redirections
  - Added clear logging of redirect conditions
  - Improved state passing during navigation
  - Fixed authentication callback routing logic

- Enhanced error handling for Stripe customer IDs:
  - Added detection of customer ID environment mismatches
  - Implemented recovery mechanism for mismatched customer IDs
  - Added fallback checkout process when customer ID is invalid
  - Enhanced error messaging for Stripe API errors
  - Added robust error handling in `createCheckoutSession` function
  - Improved validation of environment-specific configurations

- Prepared Stripe integration for production environment:
  - Created verification script (`scripts/verify-stripe-production.js`) to check:
    - Environment variables for production keys
    - Stripe account connection and activation status
    - Webhook endpoints with proper configuration
    - Active products and prices
    - Database tables and relations
  - Enhanced environment detection logic in Stripe client:
    - Added domain-based environment detection
    - Properly handle test vs. production mode based on both build environment and domain
    - Clear logging of environment status for debugging
  - Updated webhook handling for production:
    - Environment-specific webhook secrets
    - Enhanced error handling
    - Improved logging of webhook events
  - Created comprehensive production setup guide (`docs/stripe-production-setup.md`):
    - Detailed steps for Stripe account preparation
    - Instructions for configuring production API keys
    - Webhook setup procedures
    - Database configuration requirements
    - Testing strategies for production environment
  - Added npm scripts for easier production setup:
    - Added verification script command
    - Created webhook setup commands
    - Provided streamlined production setup workflow
- Restored the "Add to Project" button in the SavedList component:
  - Added back the missing button that allows users to add subreddits to their projects
  - Ensured proper integration with the existing AddToProjectModal component
  - Maintained consistent UI styling with other action buttons
  - Implemented proper event handling to prevent event propagation issues
  - Fixed the functionality to set selectedSubreddit state when clicked
  - Positioned the button in the actions section with proper spacing
- Renamed `postingGuidelines` to `postingLimits` across the application for consistency
- Updated OpenRouter API schema to match frontend data structure
- Enhanced validation checks in AnalysisCard component
- Improved error handling in save operations
- Added proper typing for analysis data structure
- Enhanced `getUserPosts` function:
  - Removed error masking for better debugging
  - Added specific error types and messages
  - Improved error context and status codes
  - Better handling of API-specific errors
- Error Handling Structure:
  - Hierarchical error handling approach
  - Clear separation of concerns
  - Specific error messages with context
  - Proper error propagation
- Error Types:
  - Enhanced RedditAPIError usage
  - Added HTTP status codes
  - Improved error messages
  - Better error context
- Updated the SYSTEM_PROMPT and ANALYSIS_PROMPT in `src/features/subreddit-analysis/lib/prompts.ts`
- Changed approach from blindly disregarding rules to analyzing them for exploitation
- Added sophisticated analysis areas:
  1. Rule Analysis for finding exploitable gaps
  2. Detection Pattern analysis
  3. Circumvention Tactics
  4. Risk Assessment
  5. Stealth Techniques
- Focus on plausible deniability and avoiding mod scrutiny
- Improved prompt structure for better strategic analysis
- Fixed Supabase 406 errors by changing `.select()` calls to use `*` and replacing `.single()` with `.maybeSingle()`
- Resolved Stripe Checkout 400 errors by removing undefined parameters and enhancing customer metadata
- Improved error handling with try/catch blocks throughout the subscription flow
- Enhanced logging for subscription-related operations
- Updated webhook handler to properly associate subscriptions with users
- Implemented proper user ID storage in Stripe customer metadata
- Modified API endpoints to work with Vite instead of Next.js
- Changed environment variable access from `process.env` to `import.meta.env` for Vite compatibility
- Created a new `RedditImage` component to handle CORS issues with Reddit images:
  - Handles image loading errors gracefully
  - Provides fallback mechanisms for failed image loads
  - Uses generated placeholders as a last resort
  - Applies best practices for image loading
- Updated components that display Reddit images to use the new `RedditImage` component:
  - Updated `RedditAccounts.tsx` to use `RedditImage` for account avatars
  - Updated `Calendar.tsx` to use `RedditImage` for post thumbnails and avatars
  - Fixed type issues in the `Calendar.tsx` component related to Reddit post data structure
- Added proper mapping for the API response in the Calendar component to match the RedditPost interface
- Enhanced error handling for image loading across the application
- Fixed NSFW content handling in Calendar component to ensure all content displays properly
- Updated RedditImage component to handle NSFW thumbnails more effectively
- Improved post details fetching to properly handle NSFW content and thumbnails
- Removed content filtering from Reddit API integration
- Set showNSFW to true by default in Dashboard component

### Google Authentication Implementation
- Enhanced the authentication system with Google OAuth integration:
  - Added a `signInWithGoogle` method to the AuthContext
  - Created a "Continue with Google" button in the Login component
  - Implemented proper loading state and error handling for Google sign-in
  - Created a dedicated AuthCallback component to handle OAuth redirects
  - Added a new route in App.tsx for the auth callback (/auth/callback)
  - Configured proper redirect URL handling for consistent authentication flow
  - Enhanced user experience with appropriate loading indicators during authentication
  - Implemented comprehensive error handling for authentication failures

### Stripe Integration Fixes
- Fixed several critical issues with Stripe integration:
  1. Resolved foreign key constraint errors in the database schema
  2. Fixed sync-products.js script to use ES modules syntax instead of CommonJS
  3. Updated SQL script to remove references to non-existent columns
  4. Created comprehensive Quick Fix Guide for Stripe integration issues
  5. Fixed issue with query approach for finding missing prices in subscriptions
  6. Updated environment variable references to use VITE_ prefix
  7. Enhanced error handling in synchronization script
  8. Improved database fixes to ensure proper product and price relationships
  9. Fixed Stripe Customer Portal configuration
  10. Documented common Stripe integration issues and solutions
  11. Created comprehensive Stripe database cleanup script to remove test products/prices
  12. Added detailed documentation on managing Stripe products and prices in the database
  13. Fixed orphaned prices and products in the database

### Stripe Database Cleanup (Completed)
- Successfully executed the Stripe database cleanup process:
  1. Created and executed comprehensive cleanup script (`docs/stripe-db-cleanup.sql`)
  2. Reduced database from 56 products to 8 essential products (4 tier products + 4 legacy products)
  3. Reduced from 47 prices to 5 essential prices (4 tier prices + 1 referenced price)
  4. Updated orphaned prices to have valid product references
  5. Ensured all products have proper descriptions and are marked as active
  6. Created detailed documentation in `docs/stripe-db-cleanup-guide.md`
  7. Enhanced sync script to prevent future database clutter with test products
  8. Added filtering logic in sync script to identify and exclude test products/prices
  9. Added official product and price ID tracking in the sync script
  10. Verified subscription pricing is working correctly after cleanup

### Stripe Test Mode Configuration Updates
- Modified Stripe client to always use test API keys during development
- Added `useTestMode = true` configuration option in client.ts
- Enhanced webhook server to force test mode
- Updated webhook signature verification with better error handling
- Added detailed logging for webhook events and payload handling
- Added test mode visual indicator in Pricing UI
- Added fallback price IDs for each plan to ensure consistent checkout flow
- Created specific environment variables for test mode in .env
- Enhanced error logging in Stripe client for better debugging
- Modified package.json scripts to use test mode environment variables

### Data Structure Updates
```typescript
interface AnalysisData {
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };
  contentStrategy: {
    recommendedTypes: string[];
    topics: string[];
    dos: string[];
    donts: string[];
  };
  // ... other properties
}
```

### Components Updated
1. `AnalysisCard.tsx`
   - Updated interface definitions
   - Enhanced validation checks
   - Fixed property access paths
   - Improved save operation mapping

2. `SubredditAnalysis.tsx`
   - Updated data mapping for Supabase
   - Fixed property access in UI rendering
   - Added proper error handling

3. `openrouter.ts`
   - Updated JSON schema to match new structure
   - Improved error handling with retries
   - Enhanced response validation

4. `Pricing.tsx`
   - Added test mode indicator banner
   - Added fallback price IDs for each subscription tier
   - Enhanced error logging for checkout process
   - Added detailed troubleshooting information

5. `client.ts` (Stripe)
   - Forced test mode during development
   - Added clear logging for API keys being used
   - Enhanced error handling for checkout session creation
   - Added detailed request/response logging

6. `AuthContext.tsx`
   - Added Google authentication method
   - Enhanced type definitions for auth methods
   - Improved error handling for authentication operations
   - Standardized authentication flow across providers

7. `Login.tsx`
   - Added Google login button
   - Implemented loading state for authentication
   - Enhanced error handling for failed login attempts
   - Improved user feedback during authentication process

8. `AuthCallback.tsx`
   - Created new component for handling OAuth redirects
   - Implemented session detection and management
   - Added loading indicator during authentication processing
   - Implemented error handling for failed authentication
   - Added redirection logic based on authentication status

9. `App.tsx`
   - Added new route for handling authentication callbacks
   - Configured route for the AuthCallback component
   - Maintained consistent routing pattern across the application

## Active Decisions
- Using `postingLimits` as the standard property name for posting-related data
- Maintaining consistent property paths across components
- Implementing comprehensive validation checks
- Following TypeScript best practices for type safety
- Using specific error types for better error handling
- Including context in error messages
- Proper error propagation
- Maintaining error handling consistency
- Decided to make the AI analyze rules thoroughly instead of disregarding them
- Focused on sophisticated circumvention rather than brute force rule breaking
- Emphasized stealth and plausible deniability in marketing strategies
- Maintained aggressive marketing goals while adding more nuanced approach
- Storing user IDs in Stripe customer metadata for reliable association
- Using Stripe webhooks as the source of truth for subscription status
- Implementing robust error handling throughout the subscription flow
- Using `maybeSingle()` instead of `single()` for Supabase queries that might return no results
- Using wildcard `*` for Supabase select queries to avoid 406 errors
- Using test mode for all Stripe operations during development
- Implementing clear test mode indicators in the UI to avoid confusion
- Using specific test price IDs for consistent checkout flow
- Maintaining separate environment variables for test and production
- Enhancing webhook handlers to properly process test events
- Using a component-based approach for CORS handling rather than a proxy server
- Implementing graceful fallbacks for failed image loads
- Using generated avatars when no image is available
- Using consistent error handling patterns across the application
- Focusing on user experience by making image loading resilient
- Standardized authentication flow across different providers (email/password and Google)
- Implemented comprehensive error handling for authentication operations
- Used a dedicated callback route for handling OAuth redirects
- Maintained consistent UI elements for authentication operations
- Enhanced user experience with appropriate loading indicators during authentication
- Implemented a "Continue with Google" button following modern design patterns
- Structured the authentication callback flow to handle various authentication scenarios

## Next Steps
1. Monitor error rates after deployment
2. Consider adding data migration for existing saved analyses
3. Update documentation to reflect new data structure
4. Consider adding schema validation at API boundaries
5. Apply consistent error handling pattern to other API methods
6. Monitor error reporting effectiveness
7. Consider adding error tracking analytics
8. Update documentation with new error handling patterns
9. Testing the complete subscription lifecycle
10. Verifying webhook handling for all events
11. Testing customer portal functionality
12. Improving error messages for failed payments
13. Documenting the webhook setup process
14. Creating a subscription management guide
15. Implementing proper production mode switching when ready to launch
16. Creating a deployment checklist for Stripe production configuration
17. Monitor database after Stripe cleanup script execution
18. Ensure subscription flow works with cleaned database
19. Consider regular database maintenance procedures
20. Schedule periodic reviews of the Stripe products and prices database
21. Continue monitoring for additional CORS issues
22. Consider additional components that might benefit from the `RedditImage` component
23. Enhance the `RedditImage` component with additional features as needed:
   - Consider adding a loading state
   - Add image optimization features
   - Add cache control headers
24. Update documentation to reflect the new image handling approach
25. Consider adding server-side proxy for production if CORS issues persist
26. Configure Google OAuth in Supabase project settings
27. Test the complete Google authentication flow
28. Consider adding additional social login options like GitHub or Twitter
29. Enhance user profile data by using information from OAuth providers
30. Implement better profile picture handling using Google profile images
31. Consider adding more robust error recovery for failed authentication attempts
32. Add user notifications for successful authentication events
33. Review authentication security measures and implement best practices
34. Document the authentication setup process for both development and production

## Current Considerations
- Backward compatibility with existing saved analyses
- Error handling for edge cases
- Performance impact of additional validation
- User experience during data loading and validation
- Need to monitor if the new prompts result in more practical and implementable strategies
- Should watch for balance between aggressiveness and detection avoidance
- May need to fine-tune risk assessment calculations based on user feedback
- Consider adding more specific guidance on automod pattern analysis
- Need to ensure Stripe webhook is correctly set up
- Monitor subscription events in Stripe dashboard
- Consider adding retry logic for failed webhooks
- Add user notifications for subscription events
- Implement subscription analytics and monitoring
- Process for switching to production Stripe mode when ready to launch
- Maintaining test/production separation in development
- Handling webhook verification in different environments
- Image loading performance across the application
- User experience during image loading failures
- Fallback strategies for external resources
- Alternative approaches for handling Reddit content if CORS issues continue
- Need to ensure proper Supabase configuration for Google OAuth
- Should track success rates for different authentication methods
- Consider user experience implications of multiple authentication options
- May need to enhance profile management to handle various data sources
- Monitor authentication error rates and address common failure patterns
- Consider adding more detailed error messages for authentication failures
- Need to ensure proper session handling across different authentication methods
- Consider implementing Remember Me functionality for improved user experience

## Dependencies
- Supabase database schema
- OpenRouter API integration
- Frontend component structure
- TypeScript type system
- Stripe API for subscriptions and payments
- Webhook server for handling Stripe events
- React components 
- Reddit API responses
- Tailwind CSS for styling
- External SVG generators for fallback images

## Recent Insights
- Consistent property naming improves maintainability
- Strong typing prevents runtime errors
- Proper validation improves user experience
- Centralized error handling reduces code duplication
- Forcing test mode for Stripe prevents accidental charges
- Visual indicators for test mode improve developer experience
- Fallback price IDs ensure consistent checkout flow
- Detailed error logging speeds up debugging
- Proper webhook signature verification is critical for security
- Regular database maintenance is necessary to keep Stripe data clean
- Clear documentation of database schema and expected data is vital
- SQL transactions are essential for database maintenance operations
- Filtering test products/prices during synchronization prevents database clutter
- Maintaining a list of official product/price IDs ensures proper tracking
- Reddit's APIs do not properly set CORS headers for image responses
- Direct loading of Reddit images in the browser causes CORS errors
- The application has multiple places where Reddit images are displayed
- A component-based approach with proper fallbacks can address CORS issues without needing a proxy server
- Reddit's data structure can be inconsistent in the response format, requiring careful mapping to typed interfaces

## Current Focus
Working on enhancing the subreddit analysis system, specifically:
1. Improving type safety and error handling
2. Enhancing database compatibility
3. Strengthening analysis robustness
4. Improving user interface and interactions

### Recent Improvements

#### SpyGlass UI Enhancement (Latest)
1. Card Interaction Improvements:
   - Made entire subreddit cards clickable for better UX
   - Removed dedicated expand button in favor of full-card click
   - Added proper cursor feedback with `cursor-pointer`
   - Preserved action button functionality with event stopPropagation

2. Event Handling:
   - Added `stopPropagation` to external links and action buttons
   - Ensured action buttons remain independently clickable
   - Replaced expand button with status indicator
   - Improved click target areas for better accessibility

3. Visual Feedback:
   - Added hover states to entire cards
   - Maintained chevron indicators for expansion state
   - Preserved consistent spacing and alignment
   - Enhanced visual hierarchy

4. Code Organization:
   - Improved event handler isolation
   - Enhanced type safety in click handlers
   - Better separation of concerns between card and action areas
   - Maintained consistent styling patterns

### Previous Improvements
- Enhanced type safety in OpenRouter integration
- Improved database schema compatibility
- Strengthened analysis output validation
- Increased post analysis sample size to 50 posts

### Code Quality Enhancements
- Replaced any types with unknown for safer type handling
- Added proper type validation for API responses
- Improved error handling for API timeouts and failures
- Enhanced data transformation reliability

### UI Improvements
- Enhanced subreddit data display in project views to show online users count alongside total subscribers
- Implemented consistent display format between saved list and project views for community stats
- Added debug logging to track subreddit data refresh and updates

### Data Management
- Improved subreddit data refresh functionality to properly update both database and UI state
- Added comprehensive error handling for subreddit data updates
- Enhanced data transformation for project subreddits to properly handle all fields

## Recent Changes

### Analysis System Improvements
1. Type Safety:
   - Introduced unknown type for initial API responses
   - Added proper type validation for parsed results
   - Enhanced error handling with specific types
   - Improved database schema compatibility

2. Analysis Robustness:
   - Increased analysis sample to 50 top posts
   - Enhanced content type detection
   - Improved posting pattern analysis
   - Added fallbacks for missing data

3. Data Validation:
   - Added comprehensive output validation
   - Enhanced error recovery
   - Improved default values
   - Strengthened type checking

### Analytics Dashboard Implementation
1. Added Analytics component:
   - Comprehensive data visualization
   - Real-time data fetching
   - Interactive date range selection
   - Export functionality

2. Chart Integration:
   - Added Chart.js with custom styling
   - Implemented multiple chart types
   - Added responsive layouts
   - Enhanced data presentation

3. Data Management:
   - Added Supabase queries for analytics
   - Implemented data aggregation
   - Added real-time updates
   - Enhanced error handling

### API Usage Tracking Enhancements
- Implemented MD5 hashing for endpoint tracking to ensure consistent storage and lookup
- Added automatic endpoint hashing via database trigger
- Created atomic increment function for thread-safe request counting
- Fixed unique constraint issues in the reddit_api_usage table
- Enhanced error handling for API rate limiting and usage tracking

### Database Optimizations
- Added endpoint_hash column for efficient lookups and consistent storage
- Implemented proper constraints and indexes for API usage tracking
- Created database-level functions for atomic operations
- Improved data integrity with proper unique constraints

### Recent Changes
1. Updated ProjectSubreddits component to display online users count in the same format as SavedList
2. Enhanced refreshSubredditData function to:
   - Update both subscriber_count and active_users in database
   - Update local state with latest data
   - Add debug logging for tracking data updates
3. Maintained consistent styling between project and saved list views

### Projects Page Layout Update (Latest)
- Standardized the Projects page layout to match the SavedList component styling
- Key changes to `src/pages/Projects.tsx`:
  1. Container styling:
     - Added `max-w-[1200px]` for consistent width constraint
     - Added `mx-auto` for horizontal centering
     - Implemented responsive padding with `px-4 md:px-8`
  2. Loading state optimization:
     - Simplified loading state container structure
     - Removed unnecessary padding wrapper
  3. Responsive design improvements:
     - Maintained consistent spacing across different screen sizes
     - Preserved existing responsive behavior for project cards

## Active Decisions

### 1. Type Safety
- Use unknown for initial API responses
- Validate all parsed data
- Provide specific error types
- Maintain strict type checking

### 2. Analysis Quality
- Analyze top 50 posts for better insights
- Validate all analysis components
- Provide meaningful defaults
- Ensure database compatibility

### 3. Error Handling
- Implement specific error messages
- Add retry logic for API failures
- Provide graceful degradation
- Maintain data consistency

## Next Steps

### Immediate Tasks
1. Test analysis improvements
2. Monitor error handling
3. Validate database integration
4. Check type safety coverage

### Short-term Goals
1. Enhance analysis accuracy
2. Improve performance
3. Add more validation
4. Expand test coverage

### Next Steps
1. Monitor the effectiveness of the subreddit data refresh mechanism
2. Consider adding a manual refresh button for subreddit stats
3. Look for other areas where data display consistency can be improved

### Current Considerations
- Need to ensure data freshness without overwhelming the Reddit API
- Balance between real-time updates and performance
- Maintaining consistent user experience across different views

## Known Issues
- None currently - recent fixes have addressed:
  - Type safety concerns
  - Analysis robustness
  - Database compatibility
  - Error handling

## Current Questions
1. What additional metrics should we add?
2. How to optimize chart performance?
3. What export formats to support?
4. How to handle real-time updates efficiently?

## Recent Learnings
1. Chart.js configuration options
2. Data aggregation strategies
3. Real-time update patterns
4. Performance optimization techniques

## Active Experiments
1. Chart.js configuration strategies
2. Data processing approaches
3. Real-time update techniques
4. Performance optimizations

### Heatmap Enhancement (Latest)
1. Interactive Visualization:
   - Added interactive heatmap showing post activity by day and hour
   - Implemented smooth hover effects with neighbor cell highlighting
   - Added tooltip with post details on hover
   - Created portal-based tooltip system for better positioning

2. Data Processing:
   - Increased post analysis from 100 to 500 posts for better data representation
   - Implemented efficient post data batching
   - Enhanced data normalization for visualization
   - Added fallback strategies for sparse data

3. Visual Design:
   - Implemented modern flat design aesthetic
   - Added subtle transitions and animations
   - Created consistent color scheme for engagement levels
   - Enhanced accessibility with clear visual feedback

4. Technical Improvements:
   - Optimized render performance
   - Added proper TypeScript types
   - Implemented efficient data caching
   - Enhanced error handling

### Analysis System Updates
1. Data Structure:
   - Updated analysis data interface to include heatmap data
   - Enhanced post processing for better engagement metrics
   - Improved data persistence in Supabase
   - Added proper type validation

2. Re-analysis Feature:
   - Implemented re-analysis functionality for saved subreddits
   - Added proper error handling and loading states
   - Enhanced data refresh mechanism
   - Improved UI feedback during analysis

3. Database Integration:
   - Updated Supabase schema for new analysis data
   - Enhanced data synchronization
   - Improved cache management
   - Added proper error recovery

## Active Decisions
1. Using portal for tooltip rendering to avoid containment issues
2. Processing 500 posts for better data representation
3. Implementing flat design aesthetic for modern look
4. Using efficient data batching for API calls
5. Maintaining consistent data structure across components

## Next Steps
1. Monitor performance with increased post processing
2. Consider adding data migration for existing analyses
3. Implement additional heatmap customization options
4. Enhance tooltip content and interaction
5. Add export functionality for heatmap data

## Current Considerations
- Performance impact of processing more posts
- User experience during re-analysis
- Data consistency across components
- Tooltip positioning edge cases
- Mobile responsiveness of heatmap

## Dependencies
- Supabase database schema
- Reddit API integration
- React portal system
- TypeScript type system

## Recent Insights
- Portal-based tooltips provide better positioning control
- Processing more posts gives better activity insights
- Flat design aesthetic improves modern feel
- Efficient data batching reduces API load

## Code Structure
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

// Key components:
- HeatmapChart.tsx: Main visualization component
- AnalysisCard.tsx: Container for analysis display
- SavedList.tsx: Management of saved subreddits
```

## Current Status
- ✓ Heatmap visualization implemented
- ✓ Re-analysis functionality working
- ✓ Data persistence improved
- ✓ Tooltip system enhanced
- ✓ Performance optimized
- ✓ Error handling improved

### Analysis System Overhaul (Latest)
- Removed all engagement metrics from analysis input and scoring
- Focused analysis purely on marketing potential based on rules and content requirements
- Added better title template generation based on rule analysis
- Lowered AI temperature to 0.3 for more consistent results
- Updated system prompt to be more focused and explicit
- Added validation and transformation of AI output

Key components modified:
1. OpenRouter Service (`src/lib/openRouter.ts`):
   - Updated system prompt to focus only on rules and content requirements
   - Removed all engagement-related calculations
   - Added better title template generation based on rule analysis
   - Simplified scoring to only consider rule restrictions
   - Added validation and transformation of AI output

2. Analysis Worker (`src/workers/analysis.worker.ts`):
   - Removed all engagement metrics
   - Added proper type definitions
   - Focused input data on marketing-relevant information only
   - Improved content type detection

### Scoring System Changes
New scoring system based purely on rule restrictions:
- Base score: 75 points
- High impact rules (marketing/promotion related): -10 points each
- Medium impact rules (formatting/quality): -5 points each
- No engagement metrics influence
- Score capped between 0 and 100

### Title Template Generation
New system for generating title templates:
1. Analyzes rules for required formats
2. Detects tag requirements (e.g. [Category])
3. Identifies flair requirements
4. Provides default templates if no specific requirements found

### Content Type Detection
Improved content type detection:
1. Analyzes rules for content restrictions
2. Checks for explicit prohibitions
3. Validates against recent posts
4. Supports: text, image, video, link

## Active Decisions

### Analysis Focus
- Decision: Remove all engagement metrics from analysis
- Rationale: Engagement metrics were influencing marketing friendliness scores, leading to inaccurate results
- Impact: Scores now reflect purely how permissive or restrictive the subreddit is for marketing activities

### AI Configuration
- Temperature: Lowered to 0.3
- Rationale: More consistent and focused output
- Impact: Better title templates and more reliable analysis

### Error Handling
- Added better validation of AI output
- Improved error messages
- Added retry logic for API failures

## Next Steps
1. Monitor the effectiveness of the new scoring system
2. Gather feedback on title template quality
3. Consider adding more rule analysis patterns
4. Consider adding automated tests for the analysis system

## Known Issues
1. Some subreddits may still show unexpected scores
2. Title templates might need further refinement
3. Content type detection could be improved

## Recent Decisions Log
1. Removed engagement metrics completely
2. Simplified scoring to focus on rule restrictions
3. Added better title template generation
4. Lowered AI temperature for consistency

## Current Focus: Stripe Integration and Pricing Updates

### Recent Changes (February 24, 2025)

We have successfully updated the subscription pricing structure in both Stripe and our local database. The following changes have been implemented:

#### Pricing Tiers
- Starter: $19.99 (1999 cents) - `price_1QvyvlCtsTY6FiiZizercIly`
- Creator: $39.99 (3999 cents) - `price_1QvyvTCtsTY6FiiZ4xK1M82X`
- Pro: $47.99 (4799 cents) - `price_1QvyvaCtsTY6FiiZfyf3jfH2`
- Agency: $97.99 (9799 cents) - `price_1QvyvhCtsTY6FiiZpHBontp5`

#### Database Schema Updates
1. Created subscription_status ENUM type with states:
   - trialing
   - active
   - canceled
   - incomplete
   - incomplete_expired
   - past_due
   - unpaid
   - paused

2. Established tables:
   - `stripe_prices`: Stores Stripe price information
   - `subscriptions`: Manages user subscription details
   - `customer_subscriptions`: Links customers to their subscriptions

#### Migration Status
- Successfully executed migration `20250224103847_update_subscription_prices.sql`
- All price records confirmed updated in database
- Foreign key constraints properly established
- Dependencies handled with CASCADE operations

### Active Decisions
1. Using text type for Stripe IDs throughout the schema
2. Maintaining direct price ID references from Stripe
3. Supporting both subscription and customer_subscription models

### Next Steps
1. Verify subscription updates for existing customers
2. Implement subscription upgrade/downgrade logic
3. Set up webhook handlers for subscription events
4. Add subscription status monitoring
5. Implement usage tracking for subscription limits

### Stripe Integration Implementation
- Successfully implemented Stripe checkout flow with test mode products and prices
- Added dynamic pricing table that reflects Stripe products
- Implemented success message in Dashboard after successful subscription
- Configured proper test mode API keys and environment variables
- Verified end-to-end subscription flow working in test mode

### Recent Changes
1. Updated `src/pages/Pricing.tsx`:
   - Added dynamic price fetching from Stripe
   - Implemented checkout session creation
   - Added proper error handling for missing prices
   - Updated success URL to redirect to root with success parameter

2. Updated `src/pages/Dashboard.tsx`:
   - Added success message component for post-subscription
   - Implemented auto-hiding message after 5 seconds
   - Added URL cleanup to remove success parameter

### Next Steps
1. Implement subscription status checks
2. Add feature flags based on subscription tier
3. Set up webhook handling for subscription events
4. Add subscription management UI in user settings

### Active Decisions
- Using Stripe Checkout for payment processing
- Maintaining test/live mode separation in Stripe configuration
- Using root path (/) as dashboard landing page
- Implementing simple success message for good UX

### Current Status
- Basic Stripe integration complete and working in test mode
- Successfully processing test subscriptions
- Proper error handling for edge cases
- Clean user experience with feedback messages

### User Usage Stats Fix
- Fixed 404 errors with the Supabase RPC function `get_user_usage_stats`:
  1. Created new migration file `