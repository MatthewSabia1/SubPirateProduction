#!/bin/bash

# Make sure we're in the project directory
cd "$(dirname "$0")"

# Add node_modules/.bin to PATH
export PATH="$PATH:$(pwd)/node_modules/.bin"

# Set environment variables
export NODE_ENV=development
export STRIPE_TEST_MODE=true

# Display a message
echo "Starting application with Replit configuration..."
echo "PATH now includes: $(pwd)/node_modules/.bin"

# Run the application in frontend-only mode (since Replit might block webhook ports)
node start.js --frontend-only --force % 