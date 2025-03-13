# Setting Up Reddit API for Local Development

This guide explains how to set up a Reddit API application for local development testing with SubPirate.

## Creating a Reddit API App

1. **Log in to your Reddit account**
   - Visit [Reddit](https://www.reddit.com) and log in to your account
   - If you don't have an account, you'll need to create one

2. **Navigate to Reddit's App Preferences**
   - Go to [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
   - Scroll down to the "Developed Applications" section at the bottom

3. **Create a new application**
   - Click the "Create App" or "Create Another App" button
   - Fill in the application details:
     - **Name**: `SubPirate Dev` (or any name that identifies this as your local development app)
     - **App Type**: Select "Web App"
     - **Description**: `Local development instance of SubPirate`
     - **About URL**: `http://localhost:5173` (your local development URL)
     - **Redirect URI**: `http://localhost:5173/auth/reddit/callback`
     - **Permissions**: No additional permissions needed for basic functionality

4. **Create App**
   - Click "Create App" button

5. **Save your credentials**
   - After creation, Reddit will display your:
     - **Client ID**: Located under the app name (typically a string of ~20 characters)
     - **Secret**: Displayed as "secret"
   - Save both these values securely. You'll need them for your environment configuration.

## Configuration in SubPirate

1. **Update your .env file**
   - The credentials have already been integrated in the `.env` file:

```
# Reddit API Configuration for Local Development
VITE_REDDIT_APP_ID=c7WFX2z6bljFC-4OOolZJQ
VITE_REDDIT_APP_SECRET=ixHE3Rh_RqoGmNuQTQS3GL2WrVLqxw
```

2. **Restart your development server**
   - After any changes to environment variables, stop and restart your local server to load them

## Important Notes

- **Security**: Never commit your Reddit API credentials to version control
- **Scope**: The local development app will only work with the redirect URI specified
- **Rate Limits**: Reddit API has rate limits (600 requests per 10 minutes per OAuth client)
- **Testing**: When testing, use your own Reddit account to avoid reaching limits
- **Local Development**: This setup is specifically for local development (localhost)

## Troubleshooting

If you encounter authentication issues:

1. Verify your Client ID and Secret are correct
2. Ensure the redirect URI exactly matches `http://localhost:5173/auth/reddit/callback`
3. Check that your Reddit account is verified (email verification)
4. Clear browser cookies/cache if you encounter persistent issues
5. Ensure your development server is running on port 5173
