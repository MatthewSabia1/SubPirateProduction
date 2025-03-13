import React from 'react';

export interface ProgressCircleProps {
  percentage: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export function ProgressCircle({
  percentage,
  size = 100,
  strokeWidth = 10,
  color = '#4F46E5',
  backgroundColor = '#E5E7EB'
}: ProgressCircleProps) {
  // Ensure percentage is between 0-100
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  
  // Calculate SVG parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dash = (circumference * normalizedPercentage) / 100;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="transform rotate-[-90deg]"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {/* Percentage text */}
      <div 
        className="absolute inset-0 flex items-center justify-center font-medium text-center"
        style={{ fontSize: `${size * 0.2}px` }}
      >
        {Math.round(normalizedPercentage)}%
      </div>
    </div>
  );
} 