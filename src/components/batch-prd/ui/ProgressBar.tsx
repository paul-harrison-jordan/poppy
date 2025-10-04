import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'bloom' | 'default';
  className?: string;
  showPercentage?: boolean;
}

export default function ProgressBar({
  value,
  variant = 'bloom',
  className = '',
  showPercentage = false
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full h-2 bg-warmGray-200 rounded-full overflow-hidden">
        {/* Progress fill with gradient */}
        <div
          className={`h-full transition-all duration-500 ease-smooth ${
            variant === 'bloom'
              ? 'bg-gradient-to-r from-batch-terracotta to-sprout'
              : 'bg-batch-terracotta'
          }`}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-batch-charcoal-light mt-1 text-right">
          {Math.round(clampedValue)}%
        </div>
      )}
    </div>
  );
}
