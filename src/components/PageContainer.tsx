import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  fullHeight?: boolean;
  className?: string;
}

export default function PageContainer({ 
  children, 
  fullHeight = false, 
  className = ''
}: PageContainerProps) {
  return (
    <div 
      className={`bg-gray-900 ${fullHeight ? 'min-h-screen' : ''} ${className}`}
    >
      {children}
    </div>
  );
} 