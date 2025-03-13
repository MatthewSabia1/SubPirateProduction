import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from 'dotenv';
import fs from 'fs';

const execAsync = promisify(exec);

// Load environment variables
config();

// Function to append webhook secret to .env if not already present
function updateEnvFile(webhookSecret: string) {
  const envPath = '.env';
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('VITE_STRIPE_WEBHOOK_SECRET=')) {
    const updatedContent = `${envContent.trim()}\nVITE_STRIPE_WEBHOOK_SECRET=${webhookSecret}\n`;
    fs.writeFileSync(envPath, updatedContent);
    console.log('\nAdded VITE_STRIPE_WEBHOOK_SECRET to .env file');
  } else {
    console.log('\nVITE_STRIPE_WEBHOOK_SECRET already exists in .env file');
    const lines = envContent.split('\n');
    const secretLine = lines.find(line => line.startsWith('VITE_STRIPE_WEBHOOK_SECRET='));
    const currentSecret = secretLine?.split('=')[1];
    
    if (currentSecret !== webhookSecret) {
      console.log(`Warning: Current webhook secret (${currentSecret}) differs from the new one (${webhookSecret})`);
      console.log('You may want to update it manually in your .env file');
    }
  }
}

async function setupStripeWebhook() {
  try {
    console.log('Setting up Stripe webhook...');
    console.log('This will forward Stripe events to your local development server');
    
    // Start the Stripe CLI webhook listener
    console.log('\nStarting Stripe CLI webhook listener...');
    const { stdout } = await execAsync('stripe listen --forward-to localhost:5173/api/stripe/webhook');
    
    // Extract the webhook signing secret
    const match = stdout.match(/whsec_[a-zA-Z0-9]+/);
    if (!match) {
      throw new Error('Failed to extract webhook signing secret');
    }
    
    const webhookSecret = match[0];
    console.log('\nWebhook signing secret:', webhookSecret);
    
    // Update .env file with the webhook secret
    updateEnvFile(webhookSecret);
    
    console.log('\nWebhook is now forwarding Stripe events to your local server');
    console.log('You can test the webhook by creating a checkout session in your app');
    console.log('\nPress Ctrl+C to stop the webhook listener');
    
    // Keep the process running to continue forwarding webhooks
    process.on('SIGINT', () => {
      console.log('\nStopping webhook listener...');
      process.exit();
    });
  } catch (error) {
    console.error('Error setting up webhook:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure you have the Stripe CLI installed: https://stripe.com/docs/stripe-cli');
    console.log('2. Make sure you\'re logged in to your Stripe account: stripe login');
    console.log('3. Check if the webhook endpoint URL is correct in the script');
    process.exit(1);
  }
}

setupStripeWebhook(); 