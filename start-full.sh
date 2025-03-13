#!/bin/bash

# Make this script executable
chmod +x start-full.sh

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
echo -e "${YELLOW}Production Starter${NC}\n"

# Explicitly set the required environment variables
echo -e "${GREEN}Setting environment variables...${NC}"

# Define environment variables
export VITE_CLERK_PUBLISHABLE_KEY="pk_live_Y2xlcmsuc3VicGlyYXRlLmNvbSQ"
export VITE_STRIPE_PUBLISHABLE_KEY="pk_live_51QgkjUCtsTY6FiiZEuKmcLJ0puKyQR5CBbFlzlpH4PRz39HdOqJRBiHTATur6NsZztt1UzTBEtFAGccELK4PdfxR00KpShCKyh"
export VITE_STRIPE_SECRET_KEY="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"
export VITE_STRIPE_PROD_WEBHOOK_SECRET="whsec_dBll9SUCMKGLdx76kwjN9K6xblokwOdK"
export VITE_CLERK_SECRET_KEY="sk_live_2HMgbkEq5wXvR4zv0I0hLopf4jhIPk1Ax4Din1tcVN"
export VITE_CLERK_WEBHOOK_SECRET="whsec_45bn8EghIOmlcHRp2S6c41YjEjg3oOSH"

# Check if build exists
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}Build directory not found. Building the application...${NC}"
  npm run build:production
fi

# Start the application with concurrently
echo -e "${GREEN}Starting the application in production mode...${NC}"
echo -e "${YELLOW}Frontend will be available at: http://localhost:5173${NC}"
echo -e "${YELLOW}Webhook server will be available at: http://localhost:5001${NC}"

# Start both servers
concurrently \
  "VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY npm run serve" \
  "NODE_ENV=production VITE_STRIPE_SECRET_KEY=$VITE_STRIPE_SECRET_KEY VITE_STRIPE_PROD_WEBHOOK_SECRET=$VITE_STRIPE_PROD_WEBHOOK_SECRET VITE_CLERK_SECRET_KEY=$VITE_CLERK_SECRET_KEY VITE_CLERK_WEBHOOK_SECRET=$VITE_CLERK_WEBHOOK_SECRET node webhook-server.js" 