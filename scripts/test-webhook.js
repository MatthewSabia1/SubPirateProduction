import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

// Get the local webhook endpoint URL
const WEBHOOK_PORT = process.env.PORT || 5173;
const WEBHOOK_ENDPOINT = `http://localhost:${WEBHOOK_PORT}/api/stripe/webhook`;

// Mock a Stripe event (this is a simplified version)
const mockEvent = {
  id: 'evt_test_webhook',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_mockSession',
      object: 'checkout.session',
      customer: 'cus_test123',
      subscription: 'sub_test123',
      payment_status: 'paid',
      metadata: {
        user_id: 'test_user_id'
      }
    }
  },
  created: Math.floor(Date.now() / 1000)
};

// Create a fake signature (in real use, Stripe creates this with a secret)
// Note: This signature won't validate, but will help test the basic request path
const mockSignature = 'test_signature';

async function testWebhook() {
  try {
    console.log(`Testing webhook endpoint: ${WEBHOOK_ENDPOINT}`);

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': mockSignature
      },
      body: JSON.stringify(mockEvent)
    });

    const responseData = await response.json();
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', responseData);
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is responding correctly');
    } else {
      console.log('❌ Webhook endpoint returned an error');
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook(); 