'use client';

import { useSession } from 'next-auth/react';
import SyncForm from '@/components/SyncForm';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';

interface PRD {
  title: string;
  url: string;
  query?: string;
  createdAt?: string;
  id?: string;
}

export default function SyncPage() {
  const { data: session, status } = useSession();
  const [syncedPrds, setSyncedPrds] = useState<PRD[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const refreshSyncedPrds = () => {
    const stored = localStorage.getItem('prds');
    if (stored) {
      try {
        const parsedPrds = JSON.parse(stored);
        // Filter out any invalid PRD objects

        setSyncedPrds(parsedPrds);
      } catch (error) {
        console.error('Error parsing PRDs from localStorage:', error);
        setSyncedPrds([]);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      refreshSyncedPrds();
    }
  }, []);

  const totalPages = Math.ceil(syncedPrds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPrds = syncedPrds.slice(startIndex, endIndex);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto space-y-10">
        <div className="text-center mt-8">
          <h1 className="text-4xl font-semibold text-primary font-sans tracking-tight mb-2">Sync Documents with <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Connect and manage your product docs, specs, and resources to keep Poppy up to date and context-aware.</p>
        </div>
        <div className="flex justify-center">
          <SyncForm />
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
          <h2 className="text-2xl font-bold text-[#232426] px-6 pt-6">Documents</h2>
          <h3 className="text-sm text-[#BBC7B6] mb-6 px-6 pt-6">
           Poppy will read these to get smarter.
          </h3>
          <table className="min-w-full divide-y divide-[#E9DCC6]">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#232426]">Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DCC6]">
              {syncedPrds.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-[#EF6351] text-center font-semibold">No documents found.</td>
                </tr>
              ) : (
                currentPrds.map((prd, idx) => (
                  <tr key={idx}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E9DCC6]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                    ${currentPage === 1 
                      ? 'text-[#E9DCC6] cursor-not-allowed' 
                      : 'text-[#232426] hover:text-[#EF6351]'}`}
                >
                  Previous
                </button>
                <span className="text-sm text-[#232426]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                    ${currentPage === totalPages 
                      ? 'text-[#E9DCC6] cursor-not-allowed' 
                      : 'text-[#232426] hover:text-[#EF6351]'}`}
                >
                  Next
                </button>
              </div>
              <div className="text-sm text-[#232426]">
                Showing {startIndex + 1}-{Math.min(endIndex, syncedPrds.length)} of {syncedPrds.length} PRDs
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
} 