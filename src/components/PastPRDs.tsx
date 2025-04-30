'use client';

import { useState, useEffect } from 'react';

interface PRD {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

export default function PastPRDs() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prds, setPrds] = useState<PRD[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('savedPRD');
    if (stored) {
      try {
        const parsedPrds = JSON.parse(stored);
        setPrds(parsedPrds);
      } catch (error) {
        console.error('Error parsing PRDs:', error);
      }
    }
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      // Remove from state
      const updatedPrds = prds.filter(prd => prd.id !== id);
      setPrds(updatedPrds);
      
      // Update localStorage
      localStorage.setItem('savedPRD', JSON.stringify(updatedPrds));

      // Update sidebar counter
      window.dispatchEvent(new CustomEvent('prdCountUpdated', {
        detail: { count: updatedPrds.length }
      }));
    } catch (error) {
      console.error('Error deleting PRD:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (prds.length === 0) return null;

  return (
    <div className="mt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-lg border border-[#E9DCC6] hover:bg-[#FFFAF3] transition-colors"
      >
        <span className="text-lg font-semibold text-[#232426]">Past PRDs</span>
        <svg
          className={`w-5 h-5 text-[#232426] transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E9DCC6]">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-[#232426] w-1/2">Title</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-[#232426] w-1/3">Created At</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[#232426] uppercase tracking-wider w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DCC6]">
              {prds.map((prd) => (
                <tr 
                  key={prd.id}
                  className={`transition-all duration-200 ${
                    deletingId === prd.id ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <span className="text-sm text-[#232426] font-semibold">
                      {prd.title}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-[#232426]">
                    {new Date(prd.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <a
                        href={prd.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1.5 rounded-full bg-[#EF6351] text-white hover:bg-[#d94d38] transition-colors"
                        title="View in Google Docs"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleDelete(prd.id)}
                        disabled={deletingId === prd.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-full text-[#E9DCC6] hover:text-[#EF6351] hover:bg-[#FFF5F3] transition-colors"
                        title="Delete"
                      >
                        <svg 
                          className="w-4 h-4"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 