import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleWebhookEvent } from '../../../../lib/stripe/webhook';

// Create a Stripe instance with your api key
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '');

// This is your webhook secret for stripe
const webhookSecret = process.env.NODE_ENV === 'production'
  ? process.env.VITE_STRIPE_WEBHOOK_SECRET_LIVE
  : process.env.VITE_STRIPE_WEBHOOK_SECRET;

// This is needed because the Stripe webhook sends a raw body, not JSON
export const config = {
  api: {
    bodyParser: false,
  },
};

// Use NextJs Edge Runtime for better performance
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // Get the signature from the header
  const signature = req.headers.get('stripe-signature');
  const host = req.headers.get('host') || 'unknown';
  const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST';
  
  console.log(`[${mode}] Stripe webhook received from ${host}`);

  try {
    const body = await req.text();
    
    console.log(`Webhook body length: ${body.length} bytes`);
    
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET. Please add to environment variables.');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature' },
        { status: 400 }
      );
    }

    // Verify that the request is from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`Webhook signature verified successfully. Event type: ${event.type}`);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Now that we've verified the request is valid, we can process the event
    console.log(`Processing webhook event: ${event.type} with ID: ${event.id}`);
    
    // Log key data about the event 
    const eventDescription = getEventSummary(event);
    console.log(`Event summary: ${eventDescription}`);
    
    // Pass to our webhook handler
    try {
      await handleWebhookEvent(body, signature, webhookSecret);
      console.log(`Successfully processed webhook event: ${event.type}`);
      
      return NextResponse.json({ received: true });
    } catch (error: any) {
      console.error(`Error processing webhook event: ${error.message}`);
      return NextResponse.json(
        { error: `Webhook processing error: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(`General webhook error: ${error.message}`);
    return NextResponse.json(
      { error: `General webhook error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper function to get a concise summary of the event
function getEventSummary(event: Stripe.Event): string {
  try {
    const { type, data } = event;
    const object = data.object as any;
    
    switch (type) {
      case 'checkout.session.completed':
        return `Checkout completed for session ${object.id}, customer: ${object.customer}, subscription: ${object.subscription}, user: ${object.metadata?.user_id || 'unknown'}`;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return `Subscription ${type.split('.')[2]} - ID: ${object.id}, customer: ${object.customer}, status: ${object.status}`;
        
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        return `Invoice ${type.split('.')[1]} - ID: ${object.id}, customer: ${object.customer}, amount: ${object.amount_paid}, subscription: ${object.subscription}`;
        
      default:
        return `${type} event received`;
    }
  } catch (error) {
    return "Error generating event summary";
  }
} 