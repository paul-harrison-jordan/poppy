import { useState } from 'react';

interface ReferenceFormProps {
  onSubmit: (url: string) => void;
}

export default function ReferenceForm({ onSubmit }: ReferenceFormProps) {
  const [referenceUrl, setReferenceUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!referenceUrl.trim()) {
      setError('Please enter a valid Google Drive URL');
      return;
    }
    setError('');
    onSubmit(referenceUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
          className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
          placeholder="Enter Google Drive URL..."
        />
        <button
          onClick={handleSubmit}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
            ${referenceUrl.trim() ? 'bg-[#EF6351] text-white hover:bg-[#d94d38] cursor-pointer focus:ring-[#EF6351]' : 'bg-[#E9DCC6] text-white cursor-not-allowed'}
          `}
          disabled={!referenceUrl.trim()}
        >
          <svg
            className="w-5 h-5 transition-transform duration-300 rotate-[-90deg]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
} 