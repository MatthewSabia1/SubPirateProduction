# SubPirate on Replit

This guide explains how to successfully deploy and configure this application on Replit.

## Deployment Instructions

1. **Create a New Repl**
   - Go to [Replit](https://replit.com)
   - Click "Create Repl"
   - Select "Import from GitHub"
   - Enter your repository URL
   - Choose "Node.js" as the language

2. **Configure Secrets**
   - In the Replit sidebar, click on the "Secrets" tool (lock icon)
   - Add the following secrets from your `.env` file:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY` 
     - `VITE_STRIPE_SECRET_KEY`
     - `VITE_STRIPE_PROD_WEBHOOK_SECRET`
     - `VITE_CLERK_PUBLISHABLE_KEY`
     - `VITE_CLERK_SECRET_KEY`

3. **Run the Application**
   - Click the "Run" button in Replit
   - The initialization script will automatically:
     - Install dependencies
     - Check that environment variables are properly set
     - Build the application
     - Start the webhook server

4. **Update Stripe Webhook URL**
   - After deployment, your webhook endpoint will be available at:
     - `https://your-repl-name.your-username.repl.co/api/webhook`
   - Update this URL in your Stripe dashboard under Developers > Webhooks

5. **Verify Deployment**
   - Check the `/health` endpoint to verify all services are running correctly
   - Example: `https://your-repl-name.your-username.repl.co/health`

## Important Port Configuration

The webhook server runs on port 5001 internally, but this is mapped to port 80 externally in the Replit configuration. This means:

- The webhook endpoint is available at the root URL: `https://your-repl-name.your-username.repl.co/api/webhook`
- No need to specify a port in the URL when accessing from outside Replit

## Webhook Testing

To test that the webhook is working correctly:

1. Create a test event in the Stripe dashboard
2. Send the test event to your webhook endpoint 
3. Check the Replit logs to see if the event was received and processed

## Troubleshooting

Common issues:

1. **Database Connection Errors**
   - Double-check your Supabase credentials in Secrets
   - Ensure your Supabase project allows connections from Replit

2. **Stripe Webhook Verification Errors** 
   - Make sure the webhook secret is correctly set
   - Check if you're using the test or production webhook secret appropriately

3. **Application Not Responding**
   - Verify the application is running by checking the console logs
   - Check the `/health` endpoint to see detailed status information

## Redeployment

When making changes to your code:

1. Push changes to GitHub
2. In Replit, click on the Git tab and pull the latest changes
3. The `afterPull` hook will automatically rebuild your application

## Configuration Options

- The application runs the webhook server in production mode by default
- To modify the port settings, edit the `.replit` file's `ports` section
- The initialization script will alert you if any required environment variables are missing

## Additional Resources

- For more information, refer to the main `README.md` in this repository
- For Stripe webhook troubleshooting, check the Stripe documentation
- For Supabase issues, consult the Supabase documentation 