#!/usr/bin/env node

/**
 * Check Stripe Mode for a Domain
 * 
 * This script simulates the environment detection logic from your app
 * to determine which Stripe mode (test or production) would be used
 * for a given domain.
 */

import chalk from 'chalk';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(chalk.cyan('=== SubPirate Stripe Mode Checker ==='));
console.log(chalk.cyan('This script will check which Stripe mode would be used for a domain\n'));

rl.question(chalk.yellow('Enter the domain to check (e.g., subpirate.com, localhost:5173): '), (domain) => {
  // Extract just the hostname part
  const hostname = domain.replace(/https?:\/\//, '').split(':')[0];
  
  // Simulate the environment detection logic from src/lib/stripe/client.ts
  const isProductionBuild = true; // We assume a production build
  const isDevelopmentHost = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' ||
    hostname.includes('.vercel.app');
  
  const isProduction = isProductionBuild && !isDevelopmentHost;
  const useTestMode = !isProduction;
  
  console.log(chalk.blue('\nEnvironment Detection:'));
  console.log(`Production Build: ${chalk.green('Yes')} (assumed for this test)`);
  console.log(`Development Host: ${isDevelopmentHost ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`Hostname: ${chalk.cyan(hostname)}`);
  
  console.log(chalk.blue('\nResult:'));
  if (useTestMode) {
    console.log(chalk.yellow('🔍 This domain would use TEST MODE Stripe keys'));
    console.log(chalk.gray('    Secret Key: VITE_STRIPE_TEST_SECRET_KEY'));
    console.log(chalk.gray('    Publishable Key: VITE_STRIPE_TEST_PUBLISHABLE_KEY'));
    console.log(chalk.gray('    Webhook Secret: VITE_STRIPE_TEST_WEBHOOK_SECRET'));
  } else {
    console.log(chalk.green('💳 This domain would use PRODUCTION MODE Stripe keys'));
    console.log(chalk.gray('    Secret Key: VITE_STRIPE_SECRET_KEY'));
    console.log(chalk.gray('    Publishable Key: VITE_STRIPE_PUBLISHABLE_KEY'));
    console.log(chalk.gray('    Webhook Secret: VITE_STRIPE_PROD_WEBHOOK_SECRET'));
  }
  
  if (isDevelopmentHost) {
    console.log(chalk.yellow('\nDomain appears to be a development host, which will trigger test mode.'));
    console.log(chalk.yellow('To use production mode, access your app via your production domain.'));
  } else {
    console.log(chalk.green('\nDomain appears to be a production host, which will trigger production mode.'));
    console.log(chalk.green('Make sure you are running a production build for this to take effect.'));
  }
  
  rl.close();
}); 