import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createBillingPortalSession } from '@/lib/stripe/client';
import { getSubscriptionStatus } from '@/lib/stripe/subscription';

async function manageSubscription() {
  'use server';
  
  const subscription = await getSubscriptionStatus();
  if (!subscription) {
    redirect('/pricing');
  }

  const session = await createBillingPortalSession({
    customerId: subscription.stripe_customer_id,
    returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/account/billing`,
  });
  
  redirect(session.url);
}

export default async function BillingPage() {
  const subscription = await getSubscriptionStatus();

  if (!subscription) {
    redirect('/pricing');
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Subscription Status</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {subscription.status}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">Billing Period</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(subscription.current_period_start).toLocaleDateString()} to{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>

            {subscription.trial_end && (
              <div>
                <h3 className="font-medium">Trial Period</h3>
                <p className="text-sm text-muted-foreground">
                  Ends on {new Date(subscription.trial_end).toLocaleDateString()}
                </p>
              </div>
            )}

            {subscription.cancel_at_period_end && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Your subscription will end on{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <form action={manageSubscription}>
            <Button type="submit">
              Manage Subscription
            </Button>
          </form>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            View your past invoices and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Access your payment history and invoices through the customer portal
          </p>
        </CardContent>
        <CardFooter>
          <form action={manageSubscription}>
            <Button type="submit" variant="outline">
              View Payment History
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
} 