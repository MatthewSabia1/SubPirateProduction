'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function PricingError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Pricing page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-[#C69B7B] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-400 mb-8">
            We encountered an error while loading the pricing information.
            Please try again later or contact support if the problem persists.
          </p>
          <button
            onClick={reset}
            className="bg-[#C69B7B] text-white px-6 py-3 rounded-md font-medium hover:bg-[#B38A6A] active:bg-[#A37959] transition-colors duration-150"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
} 