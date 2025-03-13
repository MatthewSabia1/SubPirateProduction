import React from 'react';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { FeatureKey } from '../lib/subscription/features';

interface FeatureGateProps {
  /**
   * The feature key required to access this content
   */
  feature: FeatureKey;
  
  /**
   * Content to display if the user has access to the feature
   */
  children: React.ReactNode;
  
  /**
   * Optional content to display if the user doesn't have access
   */
  fallback?: React.ReactNode;
  
  /**
   * Whether to render nothing (instead of fallback) when access is denied
   */
  renderNothing?: boolean;
}

/**
 * A component that conditionally renders content based on feature access
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  renderNothing = false 
}: FeatureGateProps) {
  const { hasAccess, isLoading } = useFeatureAccess();
  
  // While loading, show a minimal loading state or nothing
  if (isLoading) {
    return renderNothing ? null : (
      <div className="animate-pulse h-6 bg-gray-800 rounded w-full max-w-[200px]"></div>
    );
  }
  
  // If user has access, render the children
  if (hasAccess(feature)) {
    return <>{children}</>;
  }
  
  // Otherwise, render the fallback or nothing
  if (renderNothing) {
    return null;
  }
  
  return fallback ? (
    <>{fallback}</>
  ) : (
    <div className="text-sm text-gray-500 py-2 px-3 border border-gray-800 rounded-md">
      This feature requires a higher subscription tier.
      <a href="/pricing" className="text-blue-500 hover:text-blue-400 ml-2 underline">
        Upgrade
      </a>
    </div>
  );
} 