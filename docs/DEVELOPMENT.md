# Development Setup Guide

## Vite Configuration

To enable access from Replit domains, you need to manually add the following configuration to your `vite.config.ts` file:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Add your Replit domain to allowedHosts
    allowedHosts: [
      '539ce157-d8f0-44fe-9a2c-ce90b10f8490-00-l2txdr4jbfce.worf.replit.dev',
      // You can also use a wildcard pattern for all Replit domains
      '.repl.co'
    ]
  }
});
```

After making this change:
1. Save the file
2. The development server will automatically restart
3. The application should now be accessible through your Replit domain

## Environment Variables

The following environment variables are required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_STRIPE_SECRET_KEY`
- `VITE_STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL`

Make sure these are properly set in your `.env` file before starting the application.

## Starting the Application

The application consists of three main services:
1. API Server (Port 5000)
2. Client Development Server (Port 5173)
3. Webhook Server (Port 5001)

Use the start script to run all services:
```bash
node start.js
```

## Health Checks

You can verify the services are running by accessing:
- API Server: http://localhost:5000/health
- Webhook Server: http://localhost:5001/health
- Client Server: http://localhost:5173
