# SubPirate

***CRITICAL UPDATE: MARCH 11, 2024 at 8:30pm - PLEASE PULL THIS CHANGE IN REPLIT!***

SubPirate is a sophisticated Reddit marketing analysis tool designed to identify subreddits conducive to marketing activities. It provides a comprehensive analysis of subreddit rules, posting patterns, and content engagement to determine if a subreddit is marketing-friendly.

## Recent Updates

### Critical Replit Configuration Fix (NEW - March 11, 2024 at 8:30pm)
- **Exact Working Configuration**: Reverted to proven working configuration from commit 3e1414038709ecfb
- **Nix Channel Corrected**: Changed to stable-22_11 (not 24_05) which is compatible with the application
- **Simplified Start Script**: Using minimal replit-start.sh that runs in frontend-only mode
- **Development Environment**: Set NODE_ENV to development for Replit compatibility
- **Original Entrypoint**: Kept webhook-server.js as entrypoint while using ./replit-start.sh for deployment
- **IMPORTANT**: Please pull these changes immediately if your Replit deployment is broken

### Replit Configuration Restoration (NEW - March 11, 2024)
- **Restored Working Configuration**: Reverted .replit and replit.nix files to known working versions
- **Fixed Nix Channel**: Restored correct Nix channel (stable-24_05) for proper package compatibility
- **Essential Dependencies**: Re-added critical dependencies (stripe-cli, lsof) that were missing
- **Direct Entrypoint**: Changed entrypoint back to webhook-server.js for more reliable startup
- **Complete Port Configuration**: Restored all necessary port mappings for proper service communication
- **These changes fix deployment issues on Replit by reverting to a known working configuration**

### Timestamp Update (NEW - March 11, 2024 at 7:25pm)
- Updated timestamp to verify GitHub-to-Replit synchronization
- Ensuring correct Git branch configuration for Replit deployment
- Confirming GitHub changes are properly reflected in Replit
- This update specifically tests the Replit deployment process

### Timestamp Update (NEW - March 11, 2024 at 7:10pm)
- This is a test update to verify GitHub synchronization with Replit
- Changes should automatically appear on the Replit server after pushing to GitHub
- The automatic git hook should pull these changes and update the deployment

### Enhanced Replit Deployment (NEW)
- **Improved Fallback Mechanisms**: Added multi-level fallback server options for maximum reliability on Replit
- **Automatic Health Check Endpoint**: Created health check endpoint for better Replit deployment monitoring
- **Webhook Server Auto-Start**: Webhooks now automatically start in deployment environment
- **Improved Error Handling**: Enhanced diagnostic information and recovery during startup
- **Environment Detection**: Better detection and adaptation to Replit deployment environment
- **Optimized Host Configuration**: Server now properly binds to 0.0.0.0 for Replit compatibility
- **Git Integration**: Ensured all Replit configuration files are properly committed to the repository
- **See [Replit Deployment Guide](docs/REPLIT_DEPLOYMENT.md) for complete instructions**

### Replit Deployment Support
- **Optimized Replit Configuration**: Added specialized configuration files for seamless Replit deployment
- **Comprehensive Deployment Guide**: Created detailed documentation for deploying on Replit
- **Environment Detection**: Application now automatically detects and adapts to Replit environment
- **Performance Optimizations**: Implemented chunk splitting and other optimizations for better performance on Replit

### Development Environment Authentication Fix (NEW)
- **Fixed Reddit Account Connection**: Implemented mock Clerk user in development mode to resolve "User not authenticated" errors when connecting Reddit accounts
- **Enhanced Local Development**: Created robust authentication bypass for test environment that maintains full functionality
- **Simplified Testing Workflow**: Developers can now test Reddit account features without real Clerk authentication
- **Consistent Development Experience**: Provided identical user experience in test and production environments

### Improved Reddit Account Connection Flow
- **Enhanced Modal Behavior**: Updated Reddit account connection modal to only appear after users have authenticated and have an active subscription
- **Context-Aware Display**: Prevented modal from appearing on public pages (landing, pricing, login)
- **Improved User Experience**: Modal now only displays once per page load in backend/dashboard areas
- **Better State Management**: Enhanced modal dismissal and page navigation tracking

### Stripe Price ID Fix
- **Checkout Session Fix**: Updated fallback price IDs to match actual IDs in Stripe account
- **Consistent Integration**: Ensured proper price ID usage across the application
- **Error Prevention**: Fixed checkout session creation failures caused by invalid price IDs
- **Reliable Payment Flow**: Verified working integration with Stripe API using correct price IDs

### User Registration Fix
- **Automatic Profile Creation**: Added database trigger to create user profiles automatically upon signup
- **Registration Error Resolution**: Fixed "Database error saving new user" issue during account creation
- **Database Trigger Function**: Implemented SQL function that connects auth.users table with public.profiles table

### Subscription Requirement on Signup (NEW)
- **Mandatory subscription for new users**: All new users are now required to select and subscribe to a plan immediately after signup
- **Enhanced subscription verification**: Improved checks across multiple database tables for consistent subscription status verification
- **Robust error handling**: Added try-catch safety mechanisms throughout the authentication flow for resilient subscription verification
- **Environment-specific customer handling**: Improved handling of Stripe test vs. live mode customer IDs
- **Redirect flow improvements**: Fixed routing and redirect issues for users with active subscriptions

### Stripe Production Setup
- **Production-ready integration**: Complete Stripe integration with environment detection
- **Enhanced webhook handling**: Secure webhook processing with environment-specific configurations
- **Customer ID synchronization**: Proper handling of customer IDs between test and live environments
- **Error recovery mechanisms**: Graceful degradation for subscription verification failures

### NSFW Content Support
- Proper handling of NSFW content in all views
- Enhanced image loading system for Reddit content

### Image Loading System
- New RedditImage component for handling CORS-protected images
- Improved fallbacks for unavailable images
- Enhanced error handling for image loading

### Calendar Enhancements
- Improved post scheduling interface
- Better handling of Reddit data in calendar view

## Features

### Subscriptions & Payments
- **Mandatory subscription requirement**: New users must select a subscription plan to access the application
- **Seamless Stripe integration**: Secure payment processing with subscription management
- **Multiple subscription tiers**: Options for different user needs
- **Checkout session creation**: Easy payment process with secure handling
- **Customer portal access**: Self-service subscription management
- **Environment detection**: Automatic test/live mode detection based on domain
- **Error recovery**: Robust handling of customer ID mismatches between environments

### Subreddit Analysis
- **Marketing friendliness score**: Analyze whether a subreddit is conducive to marketing
- **Rule analysis**: Identify exploitable gaps in subreddit rules
- **Moderator activity patterns**: Evaluate mod presence and enforcement
- **Content engagement metrics**: Understand what performs well
- **Marketing strategy recommendations**: Tailored advice for marketing approach

### Content Display
- **Post data visualization**: Clean UI for viewing Reddit content
- **NSFW content support**: Proper handling of all content types
- **Image loading with fallbacks**: Reliable content display
- **Calendar view**: Schedule and organize posts

### Project Management
- **Organize by projects**: Group subreddits for targeted campaigns
- **Save and categorize**: Build a library of marketing-friendly subreddits
- **Reddit account integration**: Connect and manage multiple accounts
- **Post scheduling**: Plan your content calendar

## Technical Details

### Authentication System
- **Multi-provider auth**: Email/password, Google, GitHub
- **Secure session management**: Token-based authentication
- **Protected routes**: Access control based on authentication status
- **Subscription verification**: Route protection based on subscription status

### Database & Storage
- **Supabase backend**: PostgreSQL database with real-time capabilities
- **Relational data model**: Efficiently store user data, subreddits, and analysis results
- **Query optimization**: Fast data retrieval for responsive UI

### Frontend
- **React with TypeScript**: Type-safe component development
- **Tailwind CSS**: Responsive design with utility-first styling
- **ShadcnUI components**: Consistent UI design language
- **State management**: Context API for application state

### API Integration
- **Reddit API**: Fetch subreddit data and post content
- **OpenAI integration**: AI-powered subreddit analysis
- **Stripe API**: Payment processing and subscription management

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/subpirate.git

# Navigate to the project directory
cd subpirate

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start the development server
npm run dev
```

## Configuration

Create a `.env.local` file with the following:

```
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Reddit
VITE_REDDIT_CLIENT_ID=your_reddit_client_id
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret
VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback

# OpenAI API
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_MODEL=gpt-4-turbo

# Stripe Keys
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact us at support@subpirate.com.

## Simplified Start-up Process

We've optimized the start-up process to make it easier to run the application:

### First-Time Setup

When setting up the project for the first time, run:

```bash
# Install dependencies
npm install

# Set up environment variables
npm run setup
```

The setup utility will guide you through configuring all necessary environment variables.

### Running the Application

```bash
# Development mode
npm start

# Production mode
npm start -- --production

# Only start the webhook server
npm start -- --webhook-only

# Only start the frontend
npm start -- --frontend-only

# Build before starting
npm start -- --build
```

Additional options:
- `--force`: Start even if some environment variables are missing
- `--help`: Display all available options

This simplified process replaces the multiple shell scripts previously used for different environments.

## Deployment Options

### Vercel Deployment

SubPirate is now optimized for production deployment on Vercel. The project includes a dedicated `production-vercel` branch with specific configurations for Vercel:

1. **Enhanced vercel.json**: Properly configured routes for API endpoints and webhooks
2. **Environment Variables**: Support for Vercel's environment variable system
3. **Webhook Handling**: Correct setup for Stripe webhook processing
4. **Domain Detection**: Automatic environment detection based on domain

For detailed instructions, see the [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md).

### Replit Deployment

SubPirate is fully optimized for deployment on Replit. Follow these steps to deploy your own instance:

### Prerequisites

1. **Replit Account**: Create a free account at [replit.com](https://replit.com)
2. **GitHub Repository**: Fork or clone the SubPirate repository
3. **API Keys**: Prepare your Supabase, Clerk, and Stripe API keys

### Deployment Steps

1. **Create a New Repl**:
   - Choose "Import from GitHub"
   - Paste your repository URL
   - Select Node.js as the language

2. **Configure Environment Variables**:
   - Add all required secrets in the Replit Secrets tab
   - Required secrets include Supabase, Clerk, and Stripe credentials

3. **Run the Application**:
   - Replit will automatically run the initialization script
   - The application will build and start automatically

4. **Verify Deployment**:
   - Check the webview to ensure the application is running
   - Visit the health check endpoint at `/health-check.html`
   - Test the webhook server at the configured endpoint

### Troubleshooting

If you encounter issues during deployment:

1. **Check Logs**: Review the Replit console for error messages
2. **Verify Secrets**: Ensure all environment variables are correctly set
3. **Restart Server**: Use the "Stop" and "Run" buttons to restart the application
4. **Rebuild**: Run `npm run build` manually if needed

### Automatic Updates

The repository is configured to automatically pull changes from GitHub. When you push updates to your repository, Replit will:

1. Pull the latest changes
2. Run the initialization script
3. Rebuild the application if necessary
4. Restart the servers with the updated code

*Note: This documentation was updated on March 11, 2024. This update is a test to verify GitHub syncing is working properly.*

## Deployment

### Replit Deployment

SubPirate can be deployed directly to Replit. The project includes specialized configuration files for smooth deployment:

1. `.replit` - Configures the Replit environment, ports, and run commands
2. `replit.nix` - Specifies package dependencies for the Nix environment
3. `replit-init.sh` - Initializes the project when pulled from GitHub
4. `replit-start.sh` - Handles the application startup process

To deploy on Replit:

1. Import the GitHub repository into Replit
2. Set up the required environment variables in the Secrets tab:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_SECRET_KEY`
   - `VITE_STRIPE_PROD_WEBHOOK_SECRET`
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_CLERK_SECRET_KEY`
3. Run the project, and the initialization scripts will handle the setup automatically

#### Troubleshooting Replit Deployment

If you encounter issues with Replit deployment:

1. Check the `logs` directory for detailed output from each service
2. Ensure all required environment variables are set in the Secrets tab
3. Try running `./replit-init.sh` manually to reset the environment
4. If the application fails to build, it will automatically fall back to development mode
