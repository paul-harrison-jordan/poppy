'use client';

import { useSession } from 'next-auth/react';
import Navigation from '@/components/Navigation';
import Sidebar from '@/components/Sidebar';
import SyncForm from '@/components/SyncForm';
import { useEffect, useState } from 'react';

export default function SyncPage() {
  const { data: session, status } = useSession();
  const [syncedPrds, setSyncedPrds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const refreshSyncedPrds = () => {
    const stored = localStorage.getItem('syncedPrds');
    if (stored) {
      setSyncedPrds(JSON.parse(stored));
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('syncedPrds');
      console.log('Raw stored data:', stored);
      if (stored) {
        console.log('Parsed stored data:', JSON.parse(stored));
        setSyncedPrds(JSON.parse(stored));
      }
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
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64 flex items-center justify-center min-h-screen bg-[#FFFAF3]">
        <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
            <div className="w-full max-w-4xl space-y-8">
            <SyncForm onSyncComplete={refreshSyncedPrds} />
            {/* Synced PRDs Table - match width with other cards */}
            <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
              <h2 className="text-2xl font-bold text-[#232426] mb-6 px-6 pt-6">Synced PRDs</h2>
              <table className="min-w-full divide-y divide-[#E9DCC6]">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#232426]">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9DCC6]">
                  {syncedPrds.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-[#EF6351] text-center font-semibold">No synced PRDs found.</td>
                    </tr>
                  ) : (
                    currentPrds.map((name, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 text-[#232426]">{name}</td>
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
        </div>
      </div>
    </div>
  );
} 