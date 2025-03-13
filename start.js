#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer } from 'net';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set default ports
const PORT = process.env.PORT || 5000;
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 5001;

// Check for Replit environment
const isReplit = process.env.REPLIT_ENVIRONMENT === 'true' || process.env.REPL_ID;
const isReplitDeployment = process.env.REPLIT_DEPLOYMENT === '1';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Display banner
console.log(`${colors.cyan}
███████╗██╗   ██╗██████╗ ██████╗ ██╗██████╗  █████╗ ████████╗███████╗
██╔════╝██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
███████╗██║   ██║██████╔╝██████╔╝██║██████╔╝███████║   ██║   █████╗  
╚════██║██║   ██║██╔══██╗██╔═══╝ ██║██╔══██╗██╔══██║   ██║   ██╔══╝  
███████║╚██████╔╝██████╔╝██║     ██║██║  ██║██║  ██║   ██║   ███████╗
╚══════╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
${colors.reset}`);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  production: args.includes('--production') || args.includes('--prod'),
  build: args.includes('--build'),
  webhookOnly: args.includes('--webhook-only'),
  frontendOnly: args.includes('--frontend-only'),
  help: args.includes('--help'),
  force: args.includes('--force')
};

// Log Replit environment status
if (isReplit) {
  console.log(`${colors.yellow}Running in Replit environment${colors.reset}`);
  if (isReplitDeployment) {
    console.log(`${colors.green}Replit Deployment detected${colors.reset}`);
  }
}

// Show help if requested
if (options.help) {
  console.log(`
Usage: node start.js [options]

Options:
  --production, --prod   Run in production mode
  --build                Build before starting
  --webhook-only         Run only the webhook server
  --frontend-only        Run only the frontend server
  --force                Force start even if ports are in use or env vars are missing
  --help                 Show this help message
  `);
  process.exit(0);
}

// Check if .env file exists, if not, suggest running setup
if (!fs.existsSync(path.join(__dirname, '.env'))) {
  console.log(`${colors.yellow}No .env file found. You should run the setup script first:${colors.reset}`);
  console.log('  npm run setup');
  
  if (!options.force) {
    console.log(`${colors.yellow}Exiting. Use --force to start anyway.${colors.reset}`);
    process.exit(1);
  }
}

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Some other error occurred
        console.error(`${colors.red}Error checking port ${port}:${colors.reset}`, err.message);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      // Close the server once we know it's available
      server.close(() => {
        resolve(true);
      });
    });
    
    try {
      server.listen(port, '0.0.0.0');
    } catch (err) {
      console.error(`${colors.red}Exception checking port ${port}:${colors.reset}`, err.message);
      resolve(false);
    }
  });
}

// Function to find an available port
async function findAvailablePort(startPort, maxAttempts = 10) {
  let port = startPort;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    console.log(`${colors.yellow}Checking port ${port} availability...${colors.reset}`);
    if (await isPortAvailable(port)) {
      console.log(`${colors.green}Port ${port} is available.${colors.reset}`);
      return port;
    }
    
    console.log(`${colors.yellow}Port ${port} is in use, trying next port.${colors.reset}`);
    port++;
    attempts++;
  }
  
  console.log(`${colors.yellow}Warning: Could not find an available port after ${maxAttempts} attempts.${colors.reset}`);
  
  if (options.force) {
    console.log(`${colors.yellow}Using original port ${startPort} due to --force option.${colors.reset}`);
    return startPort; 
  } else {
    console.log(`${colors.red}Could not find an available port. Use --force to try anyway.${colors.reset}`);
    console.log(`${colors.yellow}Try manually killing the process: kill -9 $(lsof -ti:${startPort})${colors.reset}`);
    process.exit(1);
  }
}

// Check for required environment variables based on mode
function checkEnvironmentVariables() {
  const mode = options.production ? 'production' : 'development';
  console.log(`${colors.yellow}Checking environment variables for ${mode} mode...${colors.reset}`);
  
  const requiredVars = [
    'VITE_SUPABASE_URL', 
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  if (!options.frontendOnly) {
    requiredVars.push(
      'VITE_CLERK_SECRET_KEY', 
      options.production ? 'VITE_STRIPE_SECRET_KEY' : 'VITE_STRIPE_TEST_SECRET_KEY',
      options.production ? 'VITE_STRIPE_PROD_WEBHOOK_SECRET' : 'VITE_STRIPE_TEST_WEBHOOK_SECRET'
    );
  }
  
  if (!options.webhookOnly) {
    requiredVars.push(
      'VITE_CLERK_PUBLISHABLE_KEY',
      options.production ? 'VITE_STRIPE_PUBLISHABLE_KEY' : 'VITE_STRIPE_TEST_PUBLISHABLE_KEY'
    );
  }
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`${colors.red}Missing required environment variables:${colors.reset}`);
    missingVars.forEach(varName => console.log(`  - ${varName}`));
    console.log(`${colors.yellow}Please run 'npm run setup' to configure these variables.${colors.reset}`);
    
    // Continue anyway if --force is used
    if (!options.force) {
      console.log(`${colors.yellow}Exiting. Use --force to start anyway.${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.log(`${colors.green}All required environment variables are set.${colors.reset}`);
  }
}

// Build the application if needed
async function buildApp() {
  if (options.build || !fs.existsSync(path.join(__dirname, 'dist'))) {
    console.log(`${colors.yellow}Building the application...${colors.reset}`);
    try {
      const buildCommand = options.production ? 'npm run build:production' : 'npm run build';
      execSync(buildCommand, { stdio: 'inherit' });
      console.log(`${colors.green}Build completed successfully.${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Build failed:${colors.reset}`, error.message);
      process.exit(1);
    }
  }
}

// Try to kill any process using a specific port
async function killProcessOnPort(port) {
  if (process.platform !== 'win32') {
    try {
      console.log(`${colors.yellow}Attempting to kill process on port ${port}...${colors.reset}`);
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      // Wait briefly for the process to be killed
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await isPortAvailable(port);
    } catch (error) {
      console.log(`${colors.yellow}Could not kill process on port ${port}.${colors.reset}`);
      return false;
    }
  }
  return false;
}

// Start the webhook server
async function startWebhookServer() {
  let webhookPort = parseInt(WEBHOOK_PORT, 10);
  let isAvailable = await isPortAvailable(webhookPort);
  
  // If the port is not available, try to kill the process using it
  if (!isAvailable && !options.force) {
    console.log(`${colors.yellow}Port ${webhookPort} is in use.${colors.reset}`);
    
    // Try to kill the process
    const killed = await killProcessOnPort(webhookPort);
    
    // If killing failed, find another port
    if (!killed) {
      const newPort = await findAvailablePort(webhookPort + 1);
      console.log(`${colors.yellow}Using alternative port ${newPort} for webhook server.${colors.reset}`);
      webhookPort = newPort;
    } else {
      console.log(`${colors.green}Successfully freed port ${webhookPort}.${colors.reset}`);
    }
  }
  
  console.log(`${colors.yellow}Starting webhook server on port ${webhookPort}...${colors.reset}`);
  
  const env = {
    ...process.env,
    NODE_ENV: options.production ? 'production' : 'development',
    PORT: webhookPort,
  };
  
  return new Promise((resolve) => {
    const webhookServer = spawn('node', ['webhook-server.js'], {
      stdio: 'pipe',
      env
    });
    
    let errorOccurred = false;
    const loggingServer = setupServerLogging(webhookServer, 'Webhook');
    
    // Additional error handling for port issues
    webhookServer.stderr.on('data', (data) => {
      // Check if this is a port in use error
      if (data.toString().includes('EADDRINUSE') && !errorOccurred) {
        errorOccurred = true;
        console.log(`${colors.red}Port ${webhookPort} is already in use despite our checks.${colors.reset}`);
        console.log(`${colors.yellow}Trying to find another port...${colors.reset}`);
        
        // Kill the current process
        webhookServer.kill();
        
        // Try to restart with a different port
        findAvailablePort(webhookPort + 1).then(newPort => {
          console.log(`${colors.green}Found available port: ${newPort}${colors.reset}`);
          const newEnv = { ...env, PORT: newPort };
          
          const newWebhookServer = spawn('node', ['webhook-server.js'], {
            stdio: 'pipe',
            env: newEnv
          });
          
          const newLoggingServer = setupServerLogging(newWebhookServer, 'Webhook');
          resolve({ server: newLoggingServer, port: newPort });
        }).catch(err => {
          console.error(`${colors.red}Failed to restart webhook server:${colors.reset}`, err);
          process.exit(1);
        });
      }
    });
    
    // Allow a short delay for any immediate startup errors
    setTimeout(() => {
      if (!errorOccurred) {
        resolve({ server: loggingServer, port: webhookPort });
      }
    }, 1000);
  });
}

// Start the frontend server
function startFrontendServer() {
  console.log(`${colors.yellow}Starting frontend server on port ${CLIENT_PORT}...${colors.reset}`);
  
  // Use npm run serve for production or Replit deployment, npm run dev for development
  const useServe = options.production || (isReplit && fs.existsSync(path.join(__dirname, 'dist')));
  const command = useServe ? 'serve' : 'dev';
  
  // Ensure we bind to 0.0.0.0 in Replit environment
  const hostArg = isReplit ? '0.0.0.0' : 'localhost';
  
  const args = command === 'dev' 
    ? ['run', command, '--', '--host', hostArg, '--port', CLIENT_PORT, '--strictPort'] 
    : ['run', command];
  
  // In Replit, we can use a direct Vite command if we're in serve mode
  if (isReplit && useServe) {
    console.log(`${colors.yellow}Using Vite preview in Replit environment${colors.reset}`);
    args[1] = 'vite';
    args[2] = 'preview';
    args.push('--host', hostArg, '--port', CLIENT_PORT);
  }
  
  const frontendServer = spawn('npm', args, {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: CLIENT_PORT,
      VITE_DEV_SERVER_HOST: hostArg,
      FORCE_COLOR: 'true' // Enable colorized output
    }
  });
  
  return setupServerLogging(frontendServer, 'Frontend');
}

// Helper function to set up logging for spawned processes
function setupServerLogging(server, prefix) {
  // Log server output with prefix
  server.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`${colors.green}[${prefix}]${colors.reset} ${line}`));
  });
  
  server.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.error(`${colors.red}[${prefix} Error]${colors.reset} ${line}`));
  });
  
  server.on('close', (code) => {
    console.log(`${colors.yellow}${prefix} server exited with code ${code}${colors.reset}`);
    // Exit the main process if server exits and we're not in a mode that can continue without it
    if ((prefix === 'Frontend' && !options.webhookOnly) || 
        (prefix === 'Webhook' && !options.frontendOnly)) {
      process.exit(code);
    }
  });
  
  return server;
}

// Start Stripe webhook listener in development mode
function startStripeListener(webhookPort) {
  if (options.production || options.frontendOnly) {
    return null;
  }
  
  console.log(`${colors.yellow}Starting Stripe webhook listener...${colors.reset}`);
  
  const stripeListener = spawn('stripe', ['listen', '--forward-to', `http://localhost:${webhookPort}/api/stripe/webhook`], {
    stdio: 'pipe',
    env: process.env
  });
  
  // Log Stripe listener output with prefix
  stripeListener.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`${colors.cyan}[Stripe]${colors.reset} ${line}`));
  });
  
  stripeListener.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.error(`${colors.red}[Stripe Error]${colors.reset} ${line}`));
  });
  
  return stripeListener;
}

// Handle process termination
function setupCleanupHandlers(processes) {
  const cleanup = () => {
    console.log(`${colors.yellow}Shutting down processes...${colors.reset}`);
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill();
      }
    });
  };
  
  // Handle termination signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

// Main function to start the application
async function startApp() {
  console.log(`${colors.yellow}Starting in ${options.production ? 'PRODUCTION' : 'DEVELOPMENT'} mode${colors.reset}`);
  
  // Check environment variables
  checkEnvironmentVariables();
  
  // Build if needed
  if (!options.webhookOnly && (options.build || isReplitDeployment)) {
    await buildApp();
  }
  
  const processes = [];
  let webhookPort = WEBHOOK_PORT;
  
  // Start servers based on options
  if (!options.frontendOnly) {
    try {
      const webhookResult = await startWebhookServer();
      processes.push(webhookResult.server);
      webhookPort = webhookResult.port;
      
      // Start Stripe listener in development mode (but not in Replit deployment)
      if (!options.production && !isReplitDeployment) {
        const stripeListener = startStripeListener(webhookPort);
        if (stripeListener) processes.push(stripeListener);
      }
    } catch (error) {
      console.error(`${colors.red}Failed to start webhook server:${colors.reset}`, error);
      if (!options.force) process.exit(1);
    }
  }
  
  if (!options.webhookOnly) {
    const frontendServer = startFrontendServer();
    processes.push(frontendServer);
  }
  
  // Setup cleanup handlers for graceful exit
  setupCleanupHandlers(processes);
  
  console.log(`${colors.green}All services started.${colors.reset}`);
  
  const host = isReplit ? '0.0.0.0' : 'localhost';
  
  if (!options.webhookOnly) {
    if (isReplit && isReplitDeployment) {
      console.log(`${colors.yellow}Frontend URL: Check your Replit URL${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Frontend URL: http://${host}:${CLIENT_PORT}${colors.reset}`);
    }
  }
  
  if (!options.frontendOnly) {
    console.log(`${colors.yellow}Webhook server URL: http://${host}:${webhookPort}${colors.reset}`);
  }
}

// Start the application
startApp().catch(error => {
  console.error(`${colors.red}Failed to start application:${colors.reset}`, error);
  process.exit(1);
});