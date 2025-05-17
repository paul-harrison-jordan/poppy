'use client';

import { useSession } from 'next-auth/react';
import SyncForm from '@/components/SyncForm';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { RefreshCw } from 'lucide-react';

interface PRD {
  title: string;
  url: string;
  query?: string;
  createdAt?: string;
  id?: string;
}

interface PineconeEmbedding {
  id: string;
  values: number[];
  sparseValues?: {
    indices: number[];
    values: number[];
  };
  metadata: {
    text: string;
    documentId: string;
  };
}

export default function SyncPage() {
  const { data: session, status } = useSession();
  const [syncedPrds, setSyncedPrds] = useState<PRD[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [resyncingDoc, setResyncingDoc] = useState<string | null>(null);
  const [isResyncingAll, setIsResyncingAll] = useState(false);
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

  const handleResync = async (docId: string) => {
    try {
      setResyncingDoc(docId);
      
      // Get document content and chunk it
      const chunkResponse = await fetch('/api/chunk-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });

      if (!chunkResponse.ok) {
        throw new Error('Failed to chunk document');
      }

      const chunksData = await chunkResponse.json();
      const chunks = chunksData.chunks;

      // Process chunks individually to avoid timeouts
      const embeddedChunksPromises = chunks.map(async (chunk: string) => {
        const embeddedChunk = await fetch('/api/embed-chunks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunks: [chunk], documentId: docId }),
        });

        if (!embeddedChunk.ok) {
          throw new Error('Failed to embed chunk');
        }

        const embeddedChunkResponse = await embeddedChunk.json();
        return embeddedChunkResponse.formattedEmbeddings[0];
      });

      const embeddedChunksResults = await Promise.all(embeddedChunksPromises);
      const formattedEmbeddings = embeddedChunksResults.filter((result): result is PineconeEmbedding => result !== null);

      const sanitizedEmbeddings = formattedEmbeddings.map((embedding: PineconeEmbedding) => {
        const { id, values, sparseValues, metadata } = embedding;
        return { id, values, sparseValues, metadata };
      });

      // Resync the document
      const resyncResponse = await fetch('/api/resync-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: docId,
          formattedEmbeddings: sanitizedEmbeddings 
        }),
      });

      if (!resyncResponse.ok) {
        throw new Error('Failed to resync document');
      }

      // Refresh the list of synced documents
      refreshSyncedPrds();
    } catch (error) {
      console.error('Error resyncing document:', error);
      alert('Failed to resync document. Please try again.');
    } finally {
      setResyncingDoc(null);
    }
  };

  const handleResyncAll = async () => {
    if (!syncedPrds.length) return;
    
    try {
      setIsResyncingAll(true);
      
      // Process documents sequentially to avoid overwhelming the server
      for (const prd of syncedPrds) {
        if (!prd.id) continue;
        
        try {
          await handleResync(prd.id);
        } catch (error) {
          console.error(`Failed to resync document ${prd.title}:`, error);
          // Continue with next document even if one fails
        }
      }
    } finally {
      setIsResyncingAll(false);
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
          <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Build Context with <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Add documents to Poppy to help it understand how you think, write, and solve customer problems.</p>
        </div>
        <div className="flex justify-center">
          <SyncForm />
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
          <h2 className="text-2xl font-bold text-[#232426] px-6 pt-6">Documents</h2>
          <div className="flex justify-between items-center px-6 pt-6">
            <h3 className="text-sm text-[#BBC7B6]">
              Poppy will read these to get smarter.
            </h3>
            <button
              onClick={handleResyncAll}
              disabled={isResyncingAll || syncedPrds.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                isResyncingAll || syncedPrds.length === 0
                  ? 'bg-neutral/50 text-neutral/50 cursor-not-allowed'
                  : 'bg-poppy/10 text-poppy hover:bg-poppy/20'
              }`}
            >
              {isResyncingAll ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Resyncing All...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Resync All
                </>
              )}
            </button>
          </div>
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
                    <td className="px-6 py-4 flex items-center justify-between">
                      <a
                        href={prd.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#232426] font-semibold underline hover:text-[#EF6351] transition-colors duration-200"
                      >
                        {prd.title || 'Untitled PRD'}
                      </a>
                      <button
                        onClick={() => prd.id && handleResync(prd.id)}
                        disabled={resyncingDoc === prd.id || !prd.id}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                          resyncingDoc === prd.id
                            ? 'bg-neutral/50 text-neutral/50 cursor-not-allowed'
                            : 'bg-poppy/10 text-poppy hover:bg-poppy/20'
                        }`}
                      >
                        {resyncingDoc === prd.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Resyncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Resync
                          </>
                        )}
                      </button>
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