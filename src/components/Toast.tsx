'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: 'success' | 'error';
}

export default function Toast({ message, onClose, type = 'success' }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation to complete
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-[#BBC7B6]' : 'bg-[#EF6351]';

  return (
    <div
      className={`fixed top-4 right-4 transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className={`${bgColor} text-white px-4 py-2 rounded-lg shadow-lg`}>
        {message}
      </div>
    </div>
  );
} 