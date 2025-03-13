#!/usr/bin/env node

/**
 * Test script to verify Stripe environment detection
 * 
 * This script simulates different environments to verify that
 * our Stripe client correctly detects whether to use test or production mode.
 */

require('dotenv').config();

const chalk = require('chalk');
const axios = require('axios');

console.log(chalk.blue('SubPirate Stripe Environment Test'));
console.log(chalk.blue('================================\n'));

// Check environment variables
console.log(chalk.yellow('Checking environment variables:'));
const envVars = [
  'VITE_STRIPE_SECRET_KEY',
  'VITE_STRIPE_TEST_SECRET_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_TEST_PUBLISHABLE_KEY',
  'VITE_STRIPE_WEBHOOK_SECRET',
  'VITE_STRIPE_TEST_WEBHOOK_SECRET',
  'VITE_STRIPE_PROD_WEBHOOK_SECRET',
  'VITE_STRIPE_BASE_URL'
];

let missingVars = 0;
envVars.forEach(varName => {
  if (process.env[varName]) {
    const maskedValue = process.env[varName].substring(0, 8) + '...';
    console.log(chalk.green(`✓ ${varName} is set`), chalk.gray(`(${maskedValue})`));
  } else {
    console.log(chalk.red(`✗ ${varName} is missing`));
    missingVars++;
  }
});

if (missingVars > 0) {
  console.log(chalk.yellow(`\n${missingVars} environment variables are missing. Some tests may fail.`));
} else {
  console.log(chalk.green('\nAll environment variables are set!'));
}

// Mock different environments
console.log('\n' + chalk.yellow('Simulating different environments:'));

// Function to simulate environment detection logic
function detectEnvironment(isProd, hostname) {
  const isProductionBuild = isProd;
  const isDevelopmentHost = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' ||
    hostname.includes('.vercel.app');
  
  const isProduction = isProductionBuild && !isDevelopmentHost;
  const useTestMode = !isProduction;
  
  const stripeMode = useTestMode ? 'TEST' : 'PRODUCTION';
  const stripeKey = useTestMode 
    ? (process.env.VITE_STRIPE_TEST_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || 'missing')
    : (process.env.VITE_STRIPE_SECRET_KEY || 'missing');
  
  return {
    build: isProd ? 'production' : 'development',
    host: hostname,
    mode: stripeMode,
    keyType: stripeKey.startsWith('sk_test_') ? 'TEST' : stripeKey.startsWith('sk_live_') ? 'PRODUCTION' : 'UNKNOWN',
    webhookSecret: useTestMode
      ? (process.env.VITE_STRIPE_TEST_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET || 'missing')
      : (process.env.VITE_STRIPE_PROD_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET || 'missing')
  };
}

// Test cases
const testCases = [
  { isProd: false, hostname: 'localhost', expectedMode: 'TEST', description: 'Local development' },
  { isProd: true, hostname: 'localhost', expectedMode: 'TEST', description: 'Production build on localhost' },
  { isProd: true, hostname: 'feature-branch.vercel.app', expectedMode: 'TEST', description: 'Vercel preview' },
  { isProd: true, hostname: 'subpirate.com', expectedMode: 'PRODUCTION', description: 'Production domain' }
];

testCases.forEach(test => {
  const result = detectEnvironment(test.isProd, test.hostname);
  const passedMode = result.mode === test.expectedMode;
  const keyMatches = (result.mode === 'TEST' && result.keyType === 'TEST') || 
                     (result.mode === 'PRODUCTION' && result.keyType === 'PRODUCTION');
  
  console.log('\n' + chalk.cyan(`Case: ${test.description}`));
  console.log(`  Build: ${result.build}, Host: ${result.host}`);
  console.log(`  Expected mode: ${test.expectedMode}, Actual: ${result.mode} ${passedMode ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Key type: ${result.keyType} ${keyMatches ? chalk.green('✓') : chalk.red('✗')}`);
  
  if (!passedMode || !keyMatches) {
    console.log(chalk.red('  ⚠️ Environment detection issue detected!'));
  }
});

console.log('\n' + chalk.blue('Test completed!')); 