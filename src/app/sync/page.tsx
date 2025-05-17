'use client';

import { useSession } from 'next-auth/react';
import SyncForm from '@/components/SyncForm';
import { useEffect, useState } from 'react';
import { ProgressNotification, type Document as SyncDocument } from '@/components/progress-notification';
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
  const [resyncDocuments, setResyncDocuments] = useState<SyncDocument[]>([]);
  const [isResyncing, setIsResyncing] = useState(false);

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

  const handleResyncAll = async () => {
    const storedIds = JSON.parse(localStorage.getItem('syncedDocs') || '[]');
    if (!Array.isArray(storedIds) || storedIds.length === 0) return;

    const prds = JSON.parse(localStorage.getItem('prds') || '[]');
    const docs: SyncDocument[] = storedIds.map((id: string) => ({
      id,
      name: prds.find((p: { id: string; title: string }) => p.id === id)?.title || 'Document',
      synced: false,
    }));

    setResyncDocuments(docs);
    setIsResyncing(true);

    for (const id of storedIds) {
      try {
        const res = await fetch('/api/resync-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: id }),
        });
        if (res.ok) {
          setResyncDocuments(prev => prev.map(d => d.id === id ? { ...d, synced: true } : d));
        }
      } catch (err) {
        console.error('Error resyncing document', err);
      }
    }

    setIsResyncing(false);
  };

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
          <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Build Context with <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Add documents to Poppy to help it understand how you think, write, and solve customer problems.</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <SyncForm />
          <button
            onClick={handleResyncAll}
            disabled={isResyncing}
            className={`px-4 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy ${isResyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isResyncing ? 'Resyncing...' : 'Resync All Documents'}
          </button>
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
        <ProgressNotification
          isLoading={isResyncing}
          documents={resyncDocuments}
          onComplete={() => {
            setResyncDocuments([]);
            setIsResyncing(false);
          }}
          position="top-center"
        />
      </div>
    </AppShell>
  );
}
