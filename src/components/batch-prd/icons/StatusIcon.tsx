import React from 'react';

type StatusType = 'seed' | 'bud' | 'bloom' | 'complete';

interface StatusIconProps {
  status: StatusType;
  className?: string;
  size?: number;
}

export default function StatusIcon({ status, className = '', size = 24 }: StatusIconProps) {
  const renderIcon = () => {
    switch (status) {
      case 'seed':
        // Empty circle (draft/pending)
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
          >
            <circle
              cx="12"
              cy="12"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        );

      case 'bud':
        // Half-filled circle (in progress)
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
          >
            <circle
              cx="12"
              cy="12"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M12 4 A 8 8 0 0 1 12 20 Z"
              fill="currentColor"
              opacity="0.6"
            />
          </svg>
        );

      case 'bloom':
        // Filled circle with petal burst (approved/ready)
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
          >
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="currentColor"
            />
            {/* Small petal bursts around the edge */}
            <circle cx="12" cy="3" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="19" cy="7" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="21" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="19" cy="17" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="12" cy="21" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="5" cy="17" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="3" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="5" cy="7" r="1.5" fill="currentColor" opacity="0.4" />
          </svg>
        );

      case 'complete':
        // Checkmark in circle (complete)
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
          >
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="currentColor"
            />
            <path
              d="M8 12l2.5 2.5L16 9"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      default:
        return null;
    }
  };

  return renderIcon();
}
