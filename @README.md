# SubPirate

A comprehensive Reddit marketing analysis tool that helps users discover, analyze, and manage marketing opportunities across different subreddits.

## Recent Updates

### User Registration Fix
- Automatic Profile Creation: Added database trigger to create user profiles automatically upon signup
- Registration Error Resolution: Fixed "Database error saving new user" issue during account creation
- Database Trigger Function: Implemented SQL function that connects auth.users table with public.profiles table

### Admin Panel
- Comprehensive admin dashboard with key metrics and insights
- Complete user management interface with role assignment
- Detailed user information view with activity tracking
- Special user creation tools for admin and gift accounts
- Protected routes with admin-only access
- Tab-based navigation system for admin functions
- Integrated with existing role management system
- Modern, responsive interface consistent with application design

### User Role Management System
- Implemented a complete user role system with admin and gift roles
- Added database functions and triggers for role-based subscriptions
- Created CLI tools for managing user roles
- Enhanced subscription tier system to support multiple role types
- Implemented unique constraints and fixed SQL migration errors
- Added specialized UI elements for different user roles in Settings page
- Created role management commands in package.json

### Subscription Requirement on Signup
- Implemented mandatory subscription requirement for new users
- Enhanced routing logic to direct new users to subscription page
- Improved error handling during subscription verification
- Added safeguards for environment-specific customer IDs
- Enhanced subscription checking across multiple database tables
- Implemented graceful handling of Stripe test/live mode mismatches

### Stripe Production Setup
- Production-ready Stripe integration with environment detection
- Automatic switching between test and production modes based on domain and build environment
- Comprehensive verification tools for production readiness
- Enhanced webhook handling with environment-specific secrets
- Detailed production setup guide in docs/stripe-production-setup.md

### NSFW Content Support
- Full support for all Reddit content types
- Enhanced image handling system
- No content filtering
- Improved fallback system for thumbnails and previews

### Image Loading System
- Progressive image loading with multiple fallbacks
- Support for Reddit's special thumbnail values
- Enhanced error handling and recovery
- Automatic placeholder generation

### Calendar Improvements
- Better post display in calendar view
- Enhanced modal image handling
- Improved post details fetching
- Comprehensive error logging

## Features

### Admin Panel
- **Dashboard Metrics**: Display of total users, revenue, and usage statistics
- **User Management**:
  - Complete user table with search functionality
  - Role management (admin, gift, regular users)
  - Password reset functionality
  - User deletion with confirmation
  - Visual indicators for different user types
- **User Details View**:
  - Comprehensive user profile information
  - Subscription details and status tracking
  - Usage statistics and activity history
  - Connected Reddit accounts overview
  - Projects and saved subreddits listing
- **Admin Tools**:
  - Special user creation interface
  - Role assignment for existing users
  - Automatic password reset email generation
  - Detailed role descriptions and documentation
- **Technical Features**:
  - Protected routes with admin-only access
  - Tab-based navigation system
  - Mobile-responsive design
  - Clear loading states and error handling

### User Role System
- Three-tier role system:
  - Regular users: Access based on subscription tier
  - Admin users: Full access to all features including admin-only features
  - Gift users: Free access to Pro-level features
- Role management via CLI:
  - Set or remove admin status
  - Grant or revoke gift access
- Automated subscription management:
  - Database triggers for role changes
  - Automatic feature access updates
  - Role-specific UI elements
- Custom subscription tiers for each role

### Subscriptions & Payments
- Mandatory subscription requirement for all users
- Seamless Stripe integration for handling subscriptions
- Multiple subscription tiers with feature access control
- Automatic subscription status verification
- Webhook-based event processing
- Development and production environment separation
- Handling of cross-environment customer IDs

### Content Display
- Display all Reddit content types without filtering
- Robust image loading with multiple fallbacks
- Support for NSFW content and thumbnails
- Comprehensive error handling

### Calendar View
- View and manage Reddit posts
- Multiple view options (month, week, day)
- Post filtering and sorting
- Detailed post information

### Project Management
- Organize marketing campaigns
- Team collaboration
- Performance tracking
- Content planning

## Technical Details

### User Role Management
```typescript
// FeatureAccessContext.tsx
const checkAdminStatus = useCallback(async (userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('is_admin', { user_id: userId });
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
}, []);

const checkGiftStatus = useCallback(async (userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('is_gift_user', { user_id: userId });
    
    if (error) {
      console.error('Error checking gift user status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Exception checking gift user status:', error);
    return false;
  }
}, []);
```

### Database Triggers
```sql
-- Automatic subscription management for special roles
CREATE OR REPLACE FUNCTION public.handle_special_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If a user's role is changed to 'admin' or 'gift'
    IF (NEW.role IN ('admin', 'gift')) AND (OLD.role IS NULL OR OLD.role != NEW.role) THEN
        -- Insert a special subscription record
        INSERT INTO public.customer_subscriptions (
            user_id, 
            status, 
            stripe_customer_id, 
            stripe_subscription_id, 
            stripe_price_id, 
            current_period_start, 
            current_period_end,
            cancel_at_period_end
        )
        VALUES (
            NEW.id, 
            'active', 
            NEW.role || '_' || NEW.id, 
            NEW.role || '_subscription', 
            NEW.role || '_price', 
            CURRENT_TIMESTAMP, 
            CURRENT_TIMESTAMP + INTERVAL '100 years',
            FALSE
        )
        ON CONFLICT (user_id, stripe_subscription_id) 
        DO UPDATE SET
            status = 'active',
            current_period_end = CURRENT_TIMESTAMP + INTERVAL '100 years',
            cancel_at_period_end = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Role Management CLI
```javascript
// set-admin.js
async function setUserRole() {
  try {
    // Find the user by email
    const { data: userData } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', userEmail)
      .single();

    const userId = userData.id;
    let role = 'user'; // Default role if removing
    
    if (!removeFlag) {
      // Set the specific role based on flags
      role = giftFlag ? 'gift' : 'admin';
    }
    
    // Use the set_user_role function
    const { error: updateError } = await supabase
      .rpc('set_user_role', { user_id: userId, new_role: role });

    // Format a nice message
    let actionMessage;
    if (removeFlag) {
      actionMessage = `removed from ${giftFlag ? 'gift' : 'admin'} status`;
    } else {
      actionMessage = `set as ${role}`;
    }
    
    console.log(`User ${userEmail} (${userId}) has been ${actionMessage}`);
  } catch (error) {
    console.error('Exception setting user role:', error);
  }
}
```

### Subscription Verification
```typescript
// Robust subscription checking across multiple database tables
// First check the subscriptions table
const { data: subscriptionData, error: subscriptionError } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active')
  .single();

// If no subscription found, check customer_subscriptions table
if (!subscriptionData) {
  const { data: customerSubscriptionData } = await supabase
    .from('customer_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .or('status.eq.active,status.eq.trialing')
    .single();
    
  // User has an active subscription
  if (customerSubscriptionData) {
    return true;
  }
}
```

### Environment Detection
```typescript
// Automatic environment detection for Stripe
const isDevelopmentHost = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('.vercel.app'));

const isProduction = 
  process.env.NODE_ENV === 'production' && 
  !isDevelopmentHost;

// Use appropriate API keys based on environment
const stripeKey = isProduction 
  ? process.env.VITE_STRIPE_SECRET_KEY 
  : process.env.VITE_STRIPE_TEST_SECRET_KEY;
```

### Image Handling
```typescript
// Image loading priority
1. High-quality preview image
2. Thumbnail
3. Media embed thumbnail
4. Generated placeholder
```

### Error Recovery
```typescript
// Progressive fallback system
1. Try primary image source
2. Attempt fallback sources
3. Use generated placeholder
4. Log errors for debugging
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/subpirate.git
```

2. Install dependencies
```bash
cd subpirate
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

## Configuration

### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Reddit API Configuration
VITE_REDDIT_APP_ID=your_reddit_app_id
VITE_REDDIT_APP_SECRET=your_reddit_app_secret

# Stripe Configuration - Development/Test
VITE_STRIPE_TEST_SECRET_KEY=sk_test_...
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_TEST_WEBHOOK_SECRET=whsec_...

# Stripe Configuration - Production
VITE_STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_BASE_URL=https://subpirate.com
```

### Reddit API Setup
1. Create a Reddit application at https://www.reddit.com/prefs/apps
2. Set up OAuth2 credentials
3. Configure redirect URI

### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Set up products and prices in the Stripe Dashboard
3. Configure webhooks for subscription event handling
4. Run the verification script before production deployment:
```bash
npm run stripe:verify
```

## Development

### Stripe Development Tools
```bash
npm run stripe:sync      # Sync Stripe products with local database
npm run stripe:verify    # Verify Stripe production setup
npm run stripe:webhook   # Set up webhook endpoint
npm run dev:webhook      # Run dev server with webhook forwarding
```

### Running Tests
```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
```

### Building for Production
```bash
npm run build
```

### Deploying to Production
1. Configure environment variables in Vercel
2. Verify Stripe production setup
3. Build and deploy the application
4. Test the production environment with a small purchase

### Linting
```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers directly.

## Acknowledgments

- Reddit API for providing the data
- Supabase for backend services
- OpenRouter AI for analysis capabilities
- Stripe for payment processing 