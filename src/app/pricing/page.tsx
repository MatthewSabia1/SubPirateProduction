import React from 'react';
import { PricingCard } from '../../components/pricing/PricingCard';
import { getActiveProducts, getActivePrices, createCheckoutSession } from '../../lib/stripe/client';
import type { Stripe } from 'stripe';

interface PricingPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

interface Plan {
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  priceId?: string;
}

async function PricingPage({ searchParams }: PricingPageProps) {
  const products = await getActiveProducts();
  const prices = await getActivePrices();

  const plans: Plan[] = [
    {
      name: 'Starter',
      description: 'Essential features for getting started with Reddit marketing',
      price: 19,
      features: [
        'Analyze up to 10 subreddits per month',
        'Basic marketing friendliness scores',
        'Export data in CSV format',
        'Email support',
      ],
      priceId: prices.find((p: Stripe.Price) => p.unit_amount === 1900)?.id,
    },
    {
      name: 'Creator',
      description: 'Perfect for content creators and growing brands',
      price: 34,
      features: [
        'Analyze up to 50 subreddits per month',
        'Advanced marketing friendliness scores',
        'Custom tracking metrics',
        'Export data in multiple formats',
        'Priority email support',
      ],
      isPopular: true,
      priceId: prices.find((p: Stripe.Price) => p.unit_amount === 3400)?.id,
    },
    {
      name: 'Pro',
      description: 'Advanced features for professional marketers',
      price: 49,
      features: [
        'Unlimited subreddit analysis',
        'Advanced analytics and reporting',
        'Team collaboration features',
        'API access',
        'Custom tracking metrics',
        'Priority 24/7 support',
      ],
      priceId: prices.find((p: Stripe.Price) => p.unit_amount === 4900)?.id,
    },
    {
      name: 'Agency',
      description: 'Full platform access for marketing teams and agencies',
      price: 97,
      features: [
        'Everything in Pro, plus:',
        'Multiple team workspaces',
        'Advanced team permissions',
        'Custom integrations',
        'Dedicated account manager',
        'Training and onboarding',
      ],
      priceId: prices.find((p: Stripe.Price) => p.unit_amount === 9700)?.id,
    },
  ];

  async function handleSelectPlan(priceId: string) {
    'use server';
    
    const session = await createCheckoutSession({
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get started with SubPirate today. Choose the plan that best fits your needs.
            All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              description={plan.description}
              price={plan.price}
              features={plan.features}
              isPopular={plan.isPopular}
              onSelect={() => plan.priceId && handleSelectPlan(plan.priceId)}
            />
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Enterprise Solutions
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Need a custom solution? We offer tailored plans for large organizations
            with specific requirements.
          </p>
          <a
            href="mailto:enterprise@subpirate.com"
            className="inline-flex items-center justify-center px-6 py-3 border border-[#333333] rounded-md text-white hover:bg-[#1A1A1A] transition-colors duration-150"
          >
            Contact Sales
          </a>
        </div>

        <div className="mt-20 bg-[#050505] border border-[#333333] rounded-2xl p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be
                reflected in your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-400">
                We accept all major credit cards (Visa, Mastercard, American Express)
                and PayPal.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-400">
                Yes, we offer a 14-day money-back guarantee. If you're not satisfied
                with our service, we'll refund your payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingPage; 