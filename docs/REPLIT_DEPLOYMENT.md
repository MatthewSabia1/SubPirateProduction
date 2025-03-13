# Deploying SubPirate on Replit

This guide explains how to properly deploy the SubPirate application on Replit.

## Prerequisites

Before you begin, make sure you have:

1. A Replit account
2. A GitHub repository with your SubPirate code
3. Access to the following external services:
   - Supabase (for database)
   - Clerk (for authentication)
   - Stripe (for payments)

## Initial Setup

### 1. Import from GitHub

1. In Replit, click "Create Repl"
2. Select "Import from GitHub"
3. Paste your GitHub repository URL
4. Select "Node.js" as the language
5. Click "Import from GitHub"

### 2. Configure Environment Variables

All sensitive information should be stored as Replit Secrets:

1. In your Repl, click on "Secrets"
2. Add the following secrets:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PROD_WEBHOOK_SECRET=your_stripe_webhook_secret
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_CLERK_SECRET_KEY=your_clerk_secret_key
```

### 3. Configure OAuth Redirect URLs

For Clerk and Reddit OAuth to work properly, you need to update your redirect URLs:

#### Clerk Dashboard
1. Go to your Clerk Dashboard
2. Navigate to "JWT Templates"
3. Add your Replit domain: `https://yourapp.yourusername.repl.co` to allowed origins

#### Reddit Developer Portal
1. Go to your Reddit application in the developer portal
2. Update the redirect URI to include: `https://yourapp.yourusername.repl.co/auth/reddit/callback`

## Deployment Configuration

SubPirate is configured to work with Replit through several key files:

### .replit

This file tells Replit how to run your application. Key settings:
- `entrypoint = "start.js"` - The main file that starts the application
- `run = "./replit-start.sh"` - The script that runs when "Run" is clicked
- Port configurations for proper external access

### replit-start.sh

This script handles:
- Installing dependencies if needed
- Building the application
- Starting the server in the correct mode
- Providing fallback options if the main start command fails

### vite.config.ts

Optimized for Replit with:
- Correct base path for asset loading
- Proper host configurations
- Chunk splitting for performance
- Environment detection

## Running the Application

When you click "Run" in Replit, the following happens:

1. Dependencies are installed (if needed)
2. The application is built
3. The frontend server starts in development mode
4. The application becomes accessible at your Replit URL

## Troubleshooting

### Application Won't Start

Check the following:
- Make sure all required secrets are set
- Check the console for specific error messages
- Try running `npm install` manually, then `npm run build`

### Database Connection Issues

- Verify your Supabase URL and Anon Key are correct
- Make sure your Supabase instance is running and accessible
- Check if your RLS policies are preventing connections

### Authentication Problems

- Verify Clerk keys are correct
- Ensure redirect URLs are properly configured
- Check browser console for CORS errors

### White Screen / Application Not Loading

- Check if the build process completed successfully
- Try running `npm run build` manually
- Inspect network requests in browser dev tools

## Running in Production Mode

To run the application in production mode:

1. Edit `.replit` file
2. Change `NODE_ENV = "development"` to `NODE_ENV = "production"`
3. Update the workflow tasks to use:
   `args = "node start.js --production --frontend-only --force"`
4. Click "Run" to restart with the new configuration

## Webhook Handling

Since Replit can have limitations with long-running webhook listeners:

1. Configure your Stripe webhook to point to your Replit domain:
   `https://yourapp.yourusername.repl.co/api/stripe/webhook`
2. Use the "Always On" feature of Replit to keep your webhook handler active

## Database Migration

For Supabase schema updates:
1. Create migrations in SQL files
2. Run them through Supabase CLI or dashboard

Remember that Replit's free tier may have limitations for long-running applications. Consider upgrading to a paid plan for production deployments. 