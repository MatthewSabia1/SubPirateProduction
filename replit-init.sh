#!/bin/bash

# Make this script executable
chmod +x replit-init.sh
chmod +x replit-start.sh

# Make sure webhook-server.js is executable
chmod +x webhook-server.js
chmod +x start.js

# Log initialization start
echo "Starting Replit initialization for SubPirate..."
echo "Current directory: $(pwd)"

# Check for Replit environment variables
if [ -n "$REPL_ID" ] && [ -n "$REPL_OWNER" ]; then
  echo "Detected Replit environment: $REPL_OWNER/$REPL_SLUG"
else
  echo "Warning: Not running in a standard Replit environment"
fi

# Check if required environment variables are available
check_env_vars() {
  echo "Checking environment variables..."
  
  # Check for essential Supabase variables
  if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "⚠️ Warning: Supabase environment variables not found in Replit secrets!"
    echo "Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets tab."
  else
    echo "✅ Supabase environment variables found."
  fi
  
  # Check for essential Stripe variables
  if [ -z "$VITE_STRIPE_SECRET_KEY" ] || [ -z "$VITE_STRIPE_PROD_WEBHOOK_SECRET" ]; then
    echo "⚠️ Warning: Stripe environment variables not found in Replit secrets!"
    echo "Please add VITE_STRIPE_SECRET_KEY and VITE_STRIPE_PROD_WEBHOOK_SECRET in the Secrets tab."
  else
    echo "✅ Stripe environment variables found."
  fi
  
  # Check for Clerk variables if using Clerk
  if [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ] || [ -z "$VITE_CLERK_SECRET_KEY" ]; then
    echo "⚠️ Warning: Clerk environment variables not found in Replit secrets!"
    echo "Please add VITE_CLERK_PUBLISHABLE_KEY and VITE_CLERK_SECRET_KEY in the Secrets tab."
  else
    echo "✅ Clerk environment variables found."
  fi
}

# Create a simplified landing page as a backup if the main one doesn't work
create_simplified_landing_page() {
  SIMPLIFIED_PAGE="src/pages/SimpleLandingPage.tsx"
  
  if [ ! -f "$SIMPLIFIED_PAGE" ]; then
    echo "Creating simplified landing page as a backup..."
    mkdir -p "src/pages"
    cat > "$SIMPLIFIED_PAGE" << 'EOF'
import React from 'react';
import { Link } from 'react-router-dom';

// Simple landing page that doesn't depend on any complex imports
const SimpleLandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="font-bold text-2xl">SubPirate</div>
          <nav className="hidden md:flex space-x-8">
            <Link to="/pricing" className="hover:text-blue-400 transition">Pricing</Link>
            <Link to="/login" className="hover:text-blue-400 transition">Login</Link>
          </nav>
          <div className="flex space-x-4">
            <Link to="/login" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Dominate on Reddit with SubPirate
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Analyze subreddits, track performance, and level up your Reddit strategy.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/login"
                className="px-8 py-4 rounded-md bg-blue-600 hover:bg-blue-700 transition font-bold text-lg"
              >
                Start Free Trial
              </Link>
              <Link
                to="/pricing"
                className="px-8 py-4 rounded-md bg-gray-800 hover:bg-gray-700 transition font-bold text-lg"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16">
              Powerful Features for Reddit Success
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: 'Subreddit Analysis',
                  description: 'Get deep insights into any subreddit\'s posting patterns and audience'
                },
                {
                  title: 'Content Strategy',
                  description: 'Plan your content with data-driven recommendations'
                },
                {
                  title: 'Performance Tracking',
                  description: 'Track how your posts are performing across multiple subreddits'
                },
                {
                  title: 'Audience Insights',
                  description: 'Understand your audience to create more engaging content'
                },
                {
                  title: 'Competitor Analysis',
                  description: 'See how your strategy compares to competitors'
                },
                {
                  title: 'Content Calendar',
                  description: 'Plan and schedule your posts for maximum impact'
                }
              ].map((feature, i) => (
                <div key={i} className="bg-gray-700 p-8 rounded-lg">
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="container mx-auto text-center text-gray-400">
          <p>© 2024 SubPirate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default SimpleLandingPage;
EOF
    echo "✅ Created simplified landing page at $SIMPLIFIED_PAGE"
  fi

  # Update App.tsx to use SimpleLandingPage if needed
  APP_FILE="src/App.tsx"
  if [ -f "$APP_FILE" ] && grep -q "import LandingPage from './pages/LandingPage'" "$APP_FILE"; then
    echo "Updating App.tsx to ensure it can use the simplified landing page..."
    
    # Check if ErrorBoundary is imported, if not add it
    if ! grep -q "import { ErrorBoundary }" "$APP_FILE"; then
      sed -i '1s/^/import { ErrorBoundary } from "react-error-boundary";\n/' "$APP_FILE"
    fi
    
    # Add the SimpleLandingPage import if not already present
    if ! grep -q "import SimpleLandingPage from './pages/SimpleLandingPage'" "$APP_FILE"; then
      sed -i 's/import LandingPage from .\/pages\/LandingPage./import LandingPage from .\/pages\/LandingPage.;\nimport SimpleLandingPage from .\/pages\/SimpleLandingPage.;/' "$APP_FILE"
    fi
    
    # Add a fallback in case LandingPage fails to render
    if ! grep -q "ErrorBoundary fallbackRender" "$APP_FILE"; then
      sed -i 's/<Route path="/" element={<LandingPage \/>} \/>/<Route path="/" element={<ErrorBoundary fallbackRender={() => <SimpleLandingPage \/>}><LandingPage \/><\/ErrorBoundary>} \/>/' "$APP_FILE"
    fi
    
    echo "✅ Updated App.tsx with fallback landing page"
  else
    echo "⚠️ Could not update App.tsx - file not found or LandingPage import not detected"
  fi
}

# Create a .env file if it doesn't exist
create_env_file() {
  if [ ! -f ".env" ]; then
    echo "Creating .env file from environment variables..."
    
    # Create .env file with values from Replit secrets
    cat > .env << EOF
# Supabase
VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
VITE_CLERK_SECRET_KEY=${VITE_CLERK_SECRET_KEY}

# Stripe
VITE_STRIPE_SECRET_KEY=${VITE_STRIPE_SECRET_KEY}
VITE_STRIPE_PROD_WEBHOOK_SECRET=${VITE_STRIPE_PROD_WEBHOOK_SECRET}

# Environment
NODE_ENV=development
STRIPE_TEST_MODE=true
REPLIT_ENVIRONMENT=true
EOF
    
    echo "✅ Created .env file"
  else
    echo "⚠️ .env file already exists, not overwriting"
  fi
}

# Install essential packages only if they're missing
install_essential_packages() {
  echo "Checking for essential packages..."
  
  # Install http-server as a fallback server option
  if ! npm list http-server >/dev/null 2>&1; then
    echo "Installing http-server as fallback server..."
    npm install --no-save http-server
  fi
  
  # Check package.json for TypeScript
  if ! npm list typescript >/dev/null 2>&1; then
    echo "TypeScript not found in node_modules, installing..."
    npm install --no-save typescript
  fi
}

# Ensure Node.js modules are installed
echo "Installing dependencies..."
npm install

# Install essential packages
install_essential_packages

# Run environment check
check_env_vars

# Create .env file from Replit secrets
create_env_file

# Create simplified landing page as fallback
create_simplified_landing_page

# Build the application
echo "Building application..."
npm run build

# Set proper permissions
echo "Setting permissions..."
if [ -f ".scripts/update_structure.sh" ]; then
  chmod +x .scripts/update_structure.sh
  # Update project documentation
  echo "Updating project documentation..."
  ./.scripts/update_structure.sh
fi

# Create health check endpoint for Replit
HEALTH_CHECK_FILE="public/health-check.html"
if [ ! -f "$HEALTH_CHECK_FILE" ]; then
  echo "Creating health check endpoint..."
  mkdir -p public
  cat > "$HEALTH_CHECK_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
  <title>SubPirate Health Check</title>
  <meta charset="utf-8">
</head>
<body>
  <h1>SubPirate is running</h1>
  <p>Status: OK</p>
  <p>Server time: <script>document.write(new Date().toISOString())</script></p>
</body>
</html>
EOF
  echo "✅ Created health check endpoint at $HEALTH_CHECK_FILE"
fi

echo "Replit initialization complete!"
if [ -n "$REPL_SLUG" ] && [ -n "$REPL_OWNER" ]; then
  echo "Application should be available at: https://${REPL_SLUG}.${REPL_OWNER}.repl.co"
fi 