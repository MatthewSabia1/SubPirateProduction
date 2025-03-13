#!/usr/bin/env bash

# Set your Stripe API key from .env.production file
STRIPE_API_KEY=$(grep STRIPE_SECRET_KEY .env.production | cut -d '=' -f2)

# Set your webhook endpoint - update this to your actual webhook URL
WEBHOOK_URL="https://subpirate.com/api/stripe/webhook"

# Check if STRIPE_API_KEY was found
if [ -z "$STRIPE_API_KEY" ]; then
  echo "Error: STRIPE_SECRET_KEY not found in .env.production file"
  exit 1
fi

echo "Using Stripe API key (first 8 chars): ${STRIPE_API_KEY:0:8}..."
echo "Webhook URL: $WEBHOOK_URL"

# Create the webhook endpoint for product and price events
echo "Creating webhook endpoint..."
RESPONSE=$(curl -s -X POST "https://api.stripe.com/v1/webhook_endpoints" \
  -H "Authorization: Bearer $STRIPE_API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "url=$WEBHOOK_URL" \
  -d "enabled_events[]=product.created" \
  -d "enabled_events[]=product.updated" \
  -d "enabled_events[]=product.deleted" \
  -d "enabled_events[]=price.created" \
  -d "enabled_events[]=price.updated" \
  -d "enabled_events[]=price.deleted" \
  -d "description=SubPirate webhook for product and price events")

# Extract webhook ID and secret
WEBHOOK_ID=$(echo $RESPONSE | grep -o '"id": "[^"]*' | cut -d'"' -f4)
WEBHOOK_SECRET=$(echo $RESPONSE | grep -o '"secret": "[^"]*' | cut -d'"' -f4)

if [ -z "$WEBHOOK_ID" ]; then
  echo "Error creating webhook. Response:"
  echo $RESPONSE
  exit 1
fi

echo "Webhook created successfully!"
echo "Webhook ID: $WEBHOOK_ID"
echo "Webhook Secret: $WEBHOOK_SECRET"
echo "Make sure to add the webhook secret to your environment variables as VITE_STRIPE_WEBHOOK_SECRET"

# List enabled events to confirm
echo -e "\nEnabled events:"
curl -s -X GET "https://api.stripe.com/v1/webhook_endpoints/$WEBHOOK_ID" \
  -H "Authorization: Bearer $STRIPE_API_KEY" | grep -o '"enabled_events": \[[^]]*' | sed 's/"enabled_events": \[//g' | tr -d '"' | tr ',' '\n' | sed 's/^/- /g'

echo -e "\nDone!" 