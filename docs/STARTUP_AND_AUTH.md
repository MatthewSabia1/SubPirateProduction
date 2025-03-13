# Startup, API Workflows and Clerk Integration

This document provides an in-depth overview of the startup process, API workflows, and the Clerk authentication integration for the SubPirate application, including a deep dive into the protected routes and authentication flows.

## Startup Process

- **Build Phase:**
  - The application is built using the command `npm run build`. This process compiles the TypeScript sources and leverages Vite 5.x for fast and optimized bundling.
  - The build process produces a production-ready bundle (typically in a `dist/` directory).

- **Startup Execution:**
  - The application is started with `npm run start`, which executes the `start.js` script.
  - **`start.js` Responsibilities:**
    - *Environment Loading:* Uses `dotenv` to load configuration from a `.env` file.
    - *Environment Verification:* Checks for required environment variables. In development mode, it verifies variables for Supabase, Clerk, and Stripe (both test and production keys based on the mode).
    - *Port Management:* Checks for port availability, finds alternative ports if necessary, and even attempts to kill existing processes on the desired port.
    - *Conditional Build:* If the application has not been built (or if the `--build` flag is provided), it triggers the build process before starting servers.
    - *Server Initialization:*
      - **Webhook Server:** Starts a dedicated webhook server on a designated port to process Stripe events (e.g., subscription updates, invoice events).
      - **Frontend Server:** Launches the frontend server, using either `npm run dev` for development or serving a production build.
    - *Stripe Listener (Development Mode):* In development, a Stripe CLI webhook listener is launched to forward events to the local webhook server.

## API Workflows

- The main backend server, defined in `server.js`, is built with Express.js and handles:
  - **Health Check Endpoint:** Accessible via `/health` to monitor API, database, and service statuses.
  - **Stripe Webhook Endpoint:** Located at `/api/stripe/webhook`, this endpoint processes incoming Stripe events after verifying the webhook signature.
    - *Event Processing:* Based on the type of event, the server updates subscription information, processes invoice events, and synchronizes data with Supabase.
- API workflow design ensures robust error handling and logging for traceability.

## Clerk Authentication Integration and Protected Routes

- **Overview:**
  - The application leverages Clerk for user authentication. Clerk is integrated on the frontend via the `ClerkProvider` (configured in `src/App.tsx`) to manage multi-session authentication and signup/signin flows.
  
- **Clerk Configuration:**
  - **Production Keys:**
    - Public Key: `pk_live_Y2xlcmsuc3VicGlyYXRlLmNvbSQ`
    - Secret Key: `sk_live_2HMgbkEq5wXvR4zv0I0hLopf4jhIPk1Ax4Din1tcVN`
    - Signing Secret: `whsec_45bn8EghIOmlcHRp2S6c41YjEjg3oOSH`
    - Webhook URL: `https://SubPirate.com/api/webhooks/clerk`
    
  - **Test Mode Keys:**
    - Public Key: `pk_test_ZXhjaXRpbmctYnVsbC0yNS5jbGVyay5hY2NvdW50cy5kZXYk`
    - Secret Key: `sk_test_a9ZdQk1sObDHO4C9J9aW3YNbtAl3JKiIvxImKQJZnZ`
  
  - The application detects the environment and uses the appropriate keys:
    - In production: Production keys are used with the domain SubPirate.com
    - In development: Test mode keys are used, or auth is bypassed using development mode techniques

  - Warnings are emitted in development mode when keys are missing or when production keys are mistakenly used.
  - The Clerk provider wraps the React application ensuring that authentication state is globally available for secured components.

- **Protected Routes and Authentication Flow:**
  - **Routing Setup:**
    - The application uses React Router (via `BrowserRouter`) to manage all routes.
    - **PrivateRoute Component:** 
      - This component (defined in `src/App.tsx`) wraps protected routes. It uses custom hooks (e.g., `useClerkAuth` and `useUserSync`) to determine if a user is authenticated.
      - In local development, authentication checks can be bypassed (allowing easier testing) by detecting local host conditions.
      - The component redirects unauthenticated users to the login page (`/login`) and also triggers subscription checks and Reddit account validations for authenticated users.
    - **Public Routes:** Some routes, like the landing page, pricing, and legal pages, are accessible without authentication.
    - **Development Mode Bypass:** For local testing, a special `LoginDevMode.tsx` component was created to bypass Clerk authentication entirely.
  
  - **Error and Fallback Handling:**
    - An error boundary in `src/App.tsx` captures any authentication or routing errors and displays a fallback UI.
    - When configuration issues occur (e.g., missing Clerk keys), the app renders clear configuration error messages, ensuring that the user is promptly informed.
  
  - **Session Synchronization and Multi-Session Support:**
    - The integration supports multi-session auth, ensuring that user data is synchronized in real-time across different app parts using Clerk's hooks and Supabase synchronization.
  
  - **React Hooks in Auth Flow:**
    - Several React hooks are conditionally or unconditionally executed to handle authentication flow:
      - Detect checkout success in URL parameters and set subscription state accordingly
      - Check subscription status for authenticated users
      - Verify and refresh Reddit account status
      - Handle redirects to subscription page for users without active subscriptions
    - Hooks are carefully structured to avoid React's warning about conditional hook execution

- **Deep Dive Summary:**
  - The Clerk authentication system is tightly integrated with both the global state (via context providers) and route protection (via the `PrivateRoute` component).
  - The use of fallback components and error boundaries ensures a smooth user experience even in error states.
  - Protected routes are dynamically managed based on user authentication status, subscription status, and additional checks (like Reddit account linkage).
  - Development mode provides a streamlined experience with auth bypasses to facilitate easier local testing.
  - The application maintains separate production and test keys, with mechanisms to detect and use the appropriate set.

## Summary

This documentation provides a comprehensive view into:
- The multi-phase startup process, which includes building, environment verification, server initialization, and port management.
- The robust API workflows that ensure reliable data synchronization and error handling.
- An in-depth exploration of the Clerk authentication integration and protected routes, including the actual keys used in production and test environments.
- Development mode modifications that bypass authentication for easier local testing.

Future updates to these processes will be documented in this and other related documentation files as the application evolves.
