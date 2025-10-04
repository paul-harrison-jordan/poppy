import React from 'react';

interface RadialSeedIconProps {
  className?: string;
  size?: 16 | 24 | 32 | 64;
}

export default function RadialSeedIcon({ className = '', size = 32 }: RadialSeedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center seed */}
      <circle cx="16" cy="16" r="3" fill="currentColor" />

      {/* Radiating seeds in petal formation */}
      <circle cx="16" cy="6" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="24.5" cy="10.5" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="26" cy="19" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="19" cy="26" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="10" cy="26" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="6" cy="19" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="7.5" cy="10.5" r="2" fill="currentColor" opacity="0.7" />

      {/* Subtle connecting lines (radial burst) */}
      <line x1="16" y1="16" x2="16" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="16" y1="16" x2="22.5" y2="11.5" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="16" y1="16" x2="24" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="16" y1="16" x2="19" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="16" y1="16" x2="10" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="16" y1="16" x2="8" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="16" y1="16" x2="9.5" y2="11.5" stroke="currentColor" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}
