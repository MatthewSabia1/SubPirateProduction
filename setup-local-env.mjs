import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\n==== Clerk Production Setup Guide ====\n');

console.log('To configure Clerk for the Replit environment:');
console.log('\n1. Log in to your Clerk Dashboard: https://dashboard.clerk.com/');
console.log('2. Select your application');
console.log('3. Go to "Settings" > "Domains"');
console.log('4. Add these domains to your allowed domains list:');
console.log(`   - ${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
console.log(`   - ${process.env.REPL_ID}-00-*.*.repl.co`);
console.log('5. Save your changes');

console.log('\nCurrent domain configuration:');

// Get publishable key from environment variables
const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;

if (publishableKey) {
  console.log(`Publishable Key: ${publishableKey.substring(0, 12)}...`);

  try {
    // Try to decode domain from key if it's domain-encoded
    if (publishableKey.startsWith('pk_live_')) {
      const base64Part = publishableKey.slice(8);
      try {
        const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
        if (decoded.includes('.')) {
          console.log(`\nDetected domain: ${decoded}`);
          console.log('This is a production key.');
          console.log('Make sure to add your Replit domains to the allowed domains list in Clerk dashboard.');
        }
      } catch (e) {
        console.log('Could not decode domain from key.');
      }
    }
  } catch (e) {
    console.log('Error analyzing key:', e.message);
  }
} else {
  console.log('Publishable key not found in environment variables');

  // Try to read directly from .env file
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const publishableKeyLine = envContent.split('\n').find(line => 
      line.trim().startsWith('VITE_CLERK_PUBLISHABLE_KEY=')
    );

    if (publishableKeyLine) {
      const keyFromFile = publishableKeyLine.split('=')[1].trim();
      console.log(`Found key in .env file: ${keyFromFile.substring(0, 12)}...`);
    } else {
      console.log('Publishable key not found in .env file');
    }
  } catch (e) {
    console.log('Could not read .env file:', e.message);
  }
}

console.log('\n===========================================\n');
console.log('After updating your Clerk configuration, restart your development server.');