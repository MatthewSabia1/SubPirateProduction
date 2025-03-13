import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
  indeterminate?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status, indeterminate }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">{status}</div>
        <div className="text-sm font-medium">{progress}%</div>
      </div>
      <div className="h-1 bg-[#111111] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ease-out bg-[#4CAF50] ${
            indeterminate ? 'animate-progress-indeterminate' : ''
          }`}
          style={{ 
            width: `${progress}%`,
            backgroundImage: indeterminate 
              ? 'linear-gradient(to right, transparent 0%, #4CAF50 50%, transparent 100%)' 
              : undefined
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;