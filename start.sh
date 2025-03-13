#!/bin/bash

# Make the script executable
chmod +x start.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Display banner
echo -e "${CYAN}"
echo "███████╗██╗   ██╗██████╗ ██████╗ ██╗██████╗  █████╗ ████████╗███████╗"
echo "██╔════╝██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗╚══██╔══╝██╔════╝"
echo "███████╗██║   ██║██████╔╝██████╔╝██║██████╔╝███████║   ██║   █████╗  "
echo "╚════██║██║   ██║██╔══██╗██╔═══╝ ██║██╔══██╗██╔══██║   ██║   ██╔══╝  "
echo "███████║╚██████╔╝██████╔╝██║     ██║██║  ██║██║  ██║   ██║   ███████╗"
echo "╚══════╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝"
echo -e "${NC}"
echo -e "${YELLOW}Starter Script${NC}\n"

# Default environment
ENV="development"
BUILD=false
WEBHOOK_ONLY=false
FRONTEND_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod|--production)
      ENV="production"
      shift
      ;;
    --build)
      BUILD=true
      shift
      ;;
    --webhook-only)
      WEBHOOK_ONLY=true
      shift
      ;;
    --frontend-only)
      FRONTEND_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: ./start.sh [options]"
      echo "Options:"
      echo "  --production, --prod   Run in production mode"
      echo "  --build                Build before starting"
      echo "  --webhook-only         Run only the webhook server"
      echo "  --frontend-only        Run only the frontend server"
      echo "  --help                 Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build if requested
if [ "$BUILD" = true ]; then
  echo -e "${YELLOW}Building the application...${NC}"
  if [ "$ENV" = "production" ]; then
    npm run build:production
  else
    npm run build
  fi
fi

# Set environment variables based on environment
if [ "$ENV" = "production" ]; then
  echo -e "${YELLOW}Starting in PRODUCTION mode${NC}"
  # Load Clerk and Stripe environment variables from .env file if they exist
  if [ -f .env ]; then
    echo -e "${GREEN}Loading environment variables from .env file...${NC}"
    # Extract needed environment variables
    CLERK_PUB_KEY=$(grep -E "^VITE_CLERK_PUBLISHABLE_KEY" .env | cut -d= -f2)
    STRIPE_PUB_KEY=$(grep -E "^VITE_STRIPE_PUBLISHABLE_KEY" .env | cut -d= -f2)
    STRIPE_SECRET_KEY=$(grep -E "^VITE_STRIPE_SECRET_KEY" .env | cut -d= -f2 || grep -E "^VITE_STRIPE_TEST_SECRET_KEY" .env | cut -d= -f2)
    STRIPE_WEBHOOK_SECRET=$(grep -E "^VITE_STRIPE_PROD_WEBHOOK_SECRET" .env | cut -d= -f2 || grep -E "^VITE_STRIPE_TEST_WEBHOOK_SECRET" .env | cut -d= -f2)
    CLERK_SECRET_KEY=$(grep -E "^VITE_CLERK_SECRET_KEY" .env | cut -d= -f2)
    CLERK_WEBHOOK_SECRET=$(grep -E "^VITE_CLERK_WEBHOOK_SECRET" .env | cut -d= -f2)
    
    # Export variables
    export VITE_CLERK_PUBLISHABLE_KEY="$CLERK_PUB_KEY"
    export VITE_STRIPE_PUBLISHABLE_KEY="$STRIPE_PUB_KEY"
    export VITE_STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
    export VITE_STRIPE_PROD_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
    export VITE_CLERK_SECRET_KEY="$CLERK_SECRET_KEY"
    export VITE_CLERK_WEBHOOK_SECRET="$CLERK_WEBHOOK_SECRET"
  fi
  
  # Verify required environment variables are set
  if [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ] || [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ] || [ -z "$VITE_STRIPE_SECRET_KEY" ] || [ -z "$VITE_STRIPE_PROD_WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}Warning: Some required environment variables are not set.${NC}"
    echo "Make sure the following are defined in your environment or .env file:"
    echo "- VITE_CLERK_PUBLISHABLE_KEY"
    echo "- VITE_STRIPE_PUBLISHABLE_KEY"
    echo "- VITE_STRIPE_SECRET_KEY"
    echo "- VITE_STRIPE_PROD_WEBHOOK_SECRET"
  fi
  
  # Start the application
  if [ "$WEBHOOK_ONLY" = true ]; then
    echo -e "${GREEN}Starting webhook server only...${NC}"
    NODE_ENV=production npm run start:webhook
  elif [ "$FRONTEND_ONLY" = true ]; then
    echo -e "${GREEN}Starting frontend server only...${NC}"
    npm run serve
  else
    echo -e "${GREEN}Starting full application...${NC}"
    npm run start
  fi
else
  echo -e "${YELLOW}Starting in DEVELOPMENT mode${NC}"
  
  # Start the application
  if [ "$WEBHOOK_ONLY" = true ]; then
    echo -e "${GREEN}Starting webhook server only...${NC}"
    NODE_ENV=development npm run webhook
  elif [ "$FRONTEND_ONLY" = true ]; then
    echo -e "${GREEN}Starting frontend server only...${NC}"
    npm run dev
  else
    echo -e "${GREEN}Starting full application...${NC}"
    npm run dev:webhook
  fi
fi 