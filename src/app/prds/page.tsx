'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';

interface PRD {
  title: string;
  url: string;
  query?: string;
  createdAt?: string;
  id?: string;
}

export default function PRDsPage() {
  const [prds, setPrds] = useState<PRD[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('savedPRD');
    if (stored) {
      try {
        const parsedPrds = JSON.parse(stored);
        // Filter out any invalid PRD objects
        const validPrds = parsedPrds.filter((prd: PRD) => prd && typeof prd === 'object' && prd.id);
        setPrds(validPrds);
      } catch (error) {
        console.error('Error parsing PRDs from localStorage:', error);
        setPrds([]);
      }
    }
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!id) {
      console.error('Cannot delete PRD: ID is missing');
      setToastMessage('Failed to delete PRD: ID is missing');
      setShowToast(true);
      return;
    }
    setDeletingId(id);
    try {
      // Call API to delete from Google Drive
      await fetch('/api/delete-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      // Remove from localStorage
      const updated = prds.filter((prd) => prd.id !== id);
      setPrds(updated);
      localStorage.setItem('savedPRD', JSON.stringify(updated));
      // Show success toast
      setToastMessage(`"${title}" has been deleted`);
      setShowToast(true);
    } catch (error) {
      console.error('Error deleting PRD:', error);
      setToastMessage('Failed to delete PRD');
      setShowToast(true);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64 flex items-center justify-center min-h-screen bg-[#FFFAF3]">
        <div className="max-w-3xl w-full px-4 py-8">
          <h1 className="text-2xl font-bold text-[#232426] mb-6">Your PRDs</h1>
          <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E9DCC6]">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#232426]">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#232426]">Created At</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-[#232426] uppercase tracking-wider">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DCC6]">
                {prds.length === 0 ? (
                  <tr>
                    <td className="px-6 py-4 text-[#EF6351] text-center font-semibold" colSpan={3}>
                      No PRDs found.
                    </td>
                  </tr>
                ) : (
                  prds.map((prd, idx) => (
                    <tr 
                      key={idx}
                      className={`transition-all duration-200 ${
                        deletingId === prd.id ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <a
                          href={prd.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#232426] font-semibold underline hover:text-[#EF6351] transition-colors duration-200"
                        >
                          {prd.title || 'Untitled PRD'}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-[#232426]">
                        {prd.createdAt ? new Date(prd.createdAt).toLocaleString() : ''}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => prd.id && handleDelete(prd.id, prd.title || 'Untitled PRD')}
                          className="group transition-all duration-200 p-2 rounded-full hover:bg-[#FFF5F3]"
                          title="Delete PRD"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 inline transition-all duration-200 text-[#E9DCC6] group-hover:text-[#EF6351] group-hover:scale-110" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
          type="error"
        />
      )}
    </div>
  );
} 