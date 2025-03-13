#!/usr/bin/env node

/**
 * Migration script to help copy test products to production
 * 
 * This script helps migrate your Stripe test mode configuration to production.
 * It reads products and prices from test mode and provides commands to recreate them in production.
 * 
 * IMPORTANT: This script does NOT automatically create anything in production.
 * It generates commands that you can review and run manually.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const chalk = require('chalk');

// Set up Stripe clients for test and production
const testApiKey = process.env.VITE_STRIPE_TEST_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
const prodApiKey = process.env.VITE_STRIPE_SECRET_KEY;

if (!testApiKey || !testApiKey.startsWith('sk_test_')) {
  console.error(chalk.red('Error: Test API key is missing or invalid. It should start with sk_test_'));
  process.exit(1);
}

if (!prodApiKey) {
  console.error(chalk.red('Error: Production API key is missing.'));
  console.log(chalk.yellow('Note: It is okay if you are just exporting test data and not planning to import yet.'));
} else if (!prodApiKey.startsWith('sk_live_')) {
  console.warn(chalk.yellow('Warning: Production API key does not start with sk_live_. Are you sure it is a production key?'));
}

const stripeTest = new Stripe(testApiKey, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// Only initialize production client if we have a valid key
let stripeProd = null;
if (prodApiKey && prodApiKey.startsWith('sk_live_')) {
  stripeProd = new Stripe(prodApiKey, {
    apiVersion: '2025-02-24.acacia', 
    typescript: true,
  });
}

async function main() {
  console.log(chalk.blue('SubPirate Stripe Migration Helper'));
  console.log(chalk.blue('================================\n'));
  
  try {
    const outputDir = path.join(__dirname, '..', 'stripe-migration');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(chalk.yellow('Fetching products from test environment...\n'));
    
    // Fetch all active products from test
    const products = await stripeTest.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    
    console.log(chalk.green(`Found ${products.data.length} active products in test mode\n`));
    
    // Prepare migration data
    const migrationData = {
      products: [],
      prices: [],
      commands: {
        createProducts: [],
        createPrices: [],
        curlCommands: [],
      }
    };
    
    // Process products and prepare migration commands
    for (const product of products.data) {
      console.log(chalk.cyan(`Processing product: ${product.name} (${product.id})`));
      
      // Add product to migration data
      migrationData.products.push({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        images: product.images,
        active: product.active,
      });
      
      // Create CLI command for creating this product
      const createProductCommand = `stripe products create \
--name="${product.name}" \
${product.description ? `--description="${product.description}" ` : ''}\
${Object.keys(product.metadata || {}).map(key => `--metadata=${key}=${product.metadata[key]}`).join(' ')} \
--live`;
      
      migrationData.commands.createProducts.push(createProductCommand);
      
      // Create curl command for creating this product
      const curlProductCommand = `curl https://api.stripe.com/v1/products \\
  -u sk_live_...your_live_key... \\
  -d name="${product.name}" ${product.description ? `\\
  -d description="${product.description}" ` : ''}${
    Object.keys(product.metadata || {}).length > 0 
      ? Object.keys(product.metadata).map(key => `\\
  -d metadata[${key}]="${product.metadata[key]}"`).join(' ') 
      : ''
  }`;
      
      migrationData.commands.curlCommands.push({
        type: 'product',
        name: product.name,
        command: curlProductCommand
      });
      
      // Fetch and process prices for this product
      const prices = await stripeTest.prices.list({
        product: product.id,
        active: true,
      });
      
      console.log(chalk.gray(`  Found ${prices.data.length} active prices`));
      
      for (const price of prices.data) {
        console.log(chalk.gray(`  - Price: ${price.nickname || price.id} (${price.currency} ${price.unit_amount / 100} / ${price.recurring?.interval || 'one-time'})`));
        
        // Add price to migration data
        migrationData.prices.push({
          id: price.id,
          productId: product.id,
          nickname: price.nickname,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring: price.recurring,
          metadata: price.metadata,
        });
        
        // Create CLI command for creating this price
        const createPriceCommand = `stripe prices create \
--product={LIVE_PRODUCT_ID_FOR_${product.id}} \
--currency=${price.currency} \
--unit-amount=${price.unit_amount} \
${price.nickname ? `--nickname="${price.nickname}" ` : ''}\
${price.recurring ? `--recurring[interval]=${price.recurring.interval} --recurring[interval_count]=${price.recurring.interval_count} ` : ''}\
${Object.keys(price.metadata || {}).map(key => `--metadata=${key}=${price.metadata[key]}`).join(' ')} \
--live`;
        
        migrationData.commands.createPrices.push(createPriceCommand);
        
        // Create curl command for creating this price
        const curlPriceCommand = `curl https://api.stripe.com/v1/prices \\
  -u sk_live_...your_live_key... \\
  -d product="{LIVE_PRODUCT_ID_FOR_${product.id}}" \\
  -d currency="${price.currency}" \\
  -d unit_amount=${price.unit_amount} ${price.nickname ? `\\
  -d nickname="${price.nickname}" ` : ''}${price.recurring ? `\\
  -d recurring[interval]="${price.recurring.interval}" \\
  -d recurring[interval_count]=${price.recurring.interval_count} ` : ''}${
    Object.keys(price.metadata || {}).length > 0 
      ? Object.keys(price.metadata).map(key => `\\
  -d metadata[${key}]="${price.metadata[key]}"`).join(' ') 
      : ''
  }`;
        
        migrationData.commands.curlCommands.push({
          type: 'price',
          productId: product.id,
          name: price.nickname || `${price.currency} ${price.unit_amount / 100}`,
          command: curlPriceCommand
        });
      }
    }
    
    // Write migration data to files
    const migrationDataPath = path.join(outputDir, 'migration-data.json');
    fs.writeFileSync(
      migrationDataPath, 
      JSON.stringify(migrationData, null, 2)
    );
    console.log(chalk.green(`\nMigration data written to ${migrationDataPath}`));
    
    // Write CLI commands to separate files
    const productCommandsPath = path.join(outputDir, 'create-products.sh');
    fs.writeFileSync(
      productCommandsPath, 
      `#!/bin/bash\n\n# Commands to create products in Stripe production\n\n${migrationData.commands.createProducts.join('\n\n')}\n`
    );
    console.log(chalk.green(`Product creation commands written to ${productCommandsPath}`));
    
    const priceCommandsPath = path.join(outputDir, 'create-prices.sh');
    fs.writeFileSync(
      priceCommandsPath, 
      `#!/bin/bash\n\n# Commands to create prices in Stripe production\n# IMPORTANT: Replace {LIVE_PRODUCT_ID_FOR_xxx} with actual production product IDs\n\n${migrationData.commands.createPrices.join('\n\n')}\n`
    );
    console.log(chalk.green(`Price creation commands written to ${priceCommandsPath}`));
    
    const curlCommandsPath = path.join(outputDir, 'curl-commands.md');
    fs.writeFileSync(
      curlCommandsPath,
      `# Stripe API Curl Commands\n\n` +
      `These commands can be used to manually recreate your Stripe configuration in production.\n\n` +
      `## Products\n\n` +
      migrationData.commands.curlCommands
        .filter(cmd => cmd.type === 'product')
        .map(cmd => `### ${cmd.name}\n\`\`\`bash\n${cmd.command}\n\`\`\`\n`)
        .join('\n') +
      `\n## Prices\n\n` +
      `**IMPORTANT**: Replace \`{LIVE_PRODUCT_ID_FOR_xxx}\` with the actual production product IDs.\n\n` +
      migrationData.commands.curlCommands
        .filter(cmd => cmd.type === 'price')
        .map(cmd => `### ${cmd.name} (for product ${cmd.productId})\n\`\`\`bash\n${cmd.command}\n\`\`\`\n`)
        .join('\n')
    );
    console.log(chalk.green(`Curl commands written to ${curlCommandsPath}`));
    
    // Write a README file with instructions
    const readmePath = path.join(outputDir, 'README.md');
    fs.writeFileSync(
      readmePath,
      `# Stripe Migration Instructions\n\n` +
      `This directory contains files to help migrate your Stripe configuration from test to production.\n\n` +
      `## Files\n\n` +
      `- \`migration-data.json\`: Complete export of your test products and prices\n` +
      `- \`create-products.sh\`: Shell commands to create products using the Stripe CLI\n` +
      `- \`create-prices.sh\`: Shell commands to create prices using the Stripe CLI\n` +
      `- \`curl-commands.md\`: Alternative curl commands for API requests\n\n` +
      `## Migration Process\n\n` +
      `1. **Create Products**: Run the commands in \`create-products.sh\` or use the Stripe Dashboard\n` +
      `2. **Note Product IDs**: For each product created in production, note its ID\n` +
      `3. **Update Price Commands**: In \`create-prices.sh\`, replace placeholder product IDs with actual ones\n` +
      `4. **Create Prices**: Run the updated commands in \`create-prices.sh\`\n` +
      `5. **Verify**: Check the Stripe Dashboard to ensure everything was created correctly\n` +
      `6. **Sync Database**: Run \`npm run stripe:sync\` to update your database with the production data\n\n` +
      `## Important Notes\n\n` +
      `- Always review commands before executing them\n` +
      `- Test a small transaction in production before going live\n` +
      `- Ensure webhooks are properly configured for production\n`
    );
    console.log(chalk.green(`Readme written to ${readmePath}`));
    
    console.log(chalk.blue('\nMigration preparation complete!'));
    console.log(chalk.yellow(`\nNext steps:\n1. Review the files in ${outputDir}\n2. Follow the instructions in README.md to migrate your data to production`));
    
  } catch (error) {
    console.error(chalk.red('Error during migration preparation:'), error);
    process.exit(1);
  }
}

main(); 