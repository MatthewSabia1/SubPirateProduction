import React from 'react';
import { Check } from 'lucide-react';

interface PricingCardProps {
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  onSelect: () => void;
  buttonText?: string;
}

export function PricingCard({
  name,
  description,
  price,
  features,
  isPopular,
  onSelect,
  buttonText = 'Get Started',
}: PricingCardProps) {
  return (
    <div className={`relative rounded-2xl bg-[#050505] border ${
      isPopular ? 'border-[#C69B7B]' : 'border-[#333333]'
    } p-8 h-full flex flex-col`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-[#C69B7B] text-white px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-white">${price}</span>
          <span className="text-gray-400 ml-2">/month</span>
        </div>
      </div>

      <div className="flex-grow">
        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
              <span className="ml-3 text-gray-300" dangerouslySetInnerHTML={{ __html: feature }}></span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onSelect}
        className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-150 ${
          isPopular
            ? 'bg-[#C69B7B] text-white hover:bg-[#B38A6A] active:bg-[#A37959]'
            : 'bg-[#0f0f0f] text-white hover:bg-[#1A1A1A] border border-[#333333] active:bg-[#222222]'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
} 