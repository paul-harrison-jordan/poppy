import React from 'react';
import StatusIcon from '../icons/StatusIcon';

type Stage = 'profile' | 'features' | 'review' | 'complete';

interface StageIndicatorProps {
  currentStage: Stage;
  className?: string;
}

const stages: { key: Stage; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'features', label: 'Features' },
  { key: 'review', label: 'Review' },
  { key: 'complete', label: 'PRDs' }
];

export default function StageIndicator({ currentStage, className = '' }: StageIndicatorProps) {
  const currentIndex = stages.findIndex(s => s.key === currentStage);

  const getStageStatus = (index: number): 'seed' | 'bud' | 'bloom' => {
    if (index < currentIndex) return 'bloom';
    if (index === currentIndex) return 'bud';
    return 'seed';
  };

  return (
    <nav
      className={`flex items-center justify-center gap-3 ${className}`}
      aria-label="Progress through batch PRD stages"
    >
      {stages.map((stage, index) => {
        const status = getStageStatus(index);
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <React.Fragment key={stage.key}>
            {/* Stage item */}
            <div className="flex flex-col items-center gap-1">
              <StatusIcon
                status={status}
                className={`transition-colors ${
                  isComplete
                    ? 'text-sprout'
                    : isActive
                    ? 'text-batch-terracotta'
                    : 'text-warmGray-300'
                }`}
                size={24}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isComplete || isActive
                    ? 'text-batch-charcoal'
                    : 'text-warmGray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>

            {/* Arrow connector */}
            {index < stages.length - 1 && (
              <svg
                width="20"
                height="12"
                viewBox="0 0 20 12"
                fill="none"
                className={`transition-colors ${
                  index < currentIndex ? 'text-warmGray-400' : 'text-warmGray-200'
                }`}
              >
                <path
                  d="M0 6h18m0 0l-4-4m4 4l-4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
