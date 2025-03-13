#!/bin/bash

# Make this script executable
chmod +x start-webhook.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting webhook server in production mode...${NC}"

# Explicitly set the required environment variables
echo -e "${GREEN}Setting environment variables...${NC}"

# Read Stripe secret key from env
STRIPE_SECRET_KEY="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"
STRIPE_WEBHOOK_SECRET="whsec_dBll9SUCMKGLdx76kwjN9K6xblokwOdK"
CLERK_SECRET_KEY="sk_live_2HMgbkEq5wXvR4zv0I0hLopf4jhIPk1Ax4Din1tcVN"
CLERK_WEBHOOK_SECRET="whsec_45bn8EghIOmlcHRp2S6c41YjEjg3oOSH"

# Run the webhook server with environment variables
NODE_ENV=production \
VITE_STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
VITE_STRIPE_PROD_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
VITE_CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
VITE_CLERK_WEBHOOK_SECRET="$CLERK_WEBHOOK_SECRET" \
node webhook-server.js 