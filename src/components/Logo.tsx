import React from 'react';
import fullLogo from '../brand_assets/SubPirate_light_logo_full_text.svg';
import iconLogo from '../brand_assets/SubPirate_light_icon_logo.svg';

interface LogoProps {
  iconOnly?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function Logo({ iconOnly = false, className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: iconOnly ? 'h-6 w-6' : 'h-6',
    md: iconOnly ? 'h-8 w-8' : 'h-8',
    lg: iconOnly ? 'h-10 w-10' : 'h-10',
    xl: iconOnly ? 'h-12 w-12' : 'h-12',
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={iconOnly ? iconLogo : fullLogo} 
        alt="SubPirate Logo" 
        className={sizeClasses[size]} 
      />
    </div>
  );
}

export default Logo;