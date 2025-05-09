'use client';

import React, { useState } from 'react';
import { ProgressNotification, type Document } from '@/components/progress-notification';
import Toast from './Toast';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SyncFormProps {
  onComplete?: () => void;
}

interface GoogleDoc {
  id: string;
  name: string;
}

interface PineconeEmbedding {
  id: string;
  values: number[];
  sparseValues?: unknown;
  metadata?: Record<string, unknown>;
}

interface DriveIds {
  folderId?: string;
  documentId?: string;
}

export default function SyncForm({ onComplete }: SyncFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [driveLink, setDriveLink] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  const handleSyncPRDs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    try {
      const { folderId, documentId } = extractDriveIds(driveLink);

      const docsResponse = await fetch('/api/fetch-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driveFolderId: folderId, documentId: documentId }),
      });

      if (!docsResponse.ok) {
        throw new Error('Failed to fetch documents from folder');
      }

      const { documents: fetchedDocs } = await docsResponse.json();
      
      const initialDocs: Document[] = fetchedDocs.map((doc: GoogleDoc) => ({
        id: doc.id,
        name: doc.name,
        synced: false,
      }));
      setDocuments(initialDocs);

      const syncPromises = fetchedDocs.map(async (doc: GoogleDoc) => {
        try {
          const response = await fetch('/api/chunk-docs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: doc.id }),
          });

          if (!response.ok) {
            console.error(`Failed to sync document: ${doc.name}`);
            return null;
          }

          const chunksResponse = await response.json();
          const chunks = chunksResponse.chunks;
          const documentId = chunksResponse.id;

          const embeddedChunks = await fetch('/api/embed-chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chunks, documentId }),
          });

          if (!embeddedChunks.ok) {
            console.error(`Failed to embed document: ${documentId}`);
            return null;
          }

          const embeddedChunksResponse = await embeddedChunks.json();
          const formattedEmbeddings = embeddedChunksResponse.formattedEmbeddings;

          const sanitizedEmbeddings = formattedEmbeddings.map((embedding: PineconeEmbedding) => {
            const { id, values, sparseValues, metadata } = embedding;
            return { id, values, sparseValues, metadata };
          });

          const pineconeUpsert = await fetch('/api/pinecone-upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formattedEmbeddings: sanitizedEmbeddings, documentId }),
          });

          if (!pineconeUpsert.ok) {
            console.error(`Failed to upsert to Pinecone: ${documentId}`);
            return null;
          }

          setDocuments(prevDocs => 
            prevDocs.map(d => 
              d.id === doc.id ? { ...d, synced: true } : d
            )
          );

          const storedPrds = localStorage.getItem('prds');
          const prds = storedPrds ? JSON.parse(storedPrds) : [];
          prds.push({
            title: doc.name,
            url: `https://docs.google.com/document/d/${doc.id}`,
            createdAt: new Date().toISOString(),
            id: doc.id
          });
          localStorage.setItem('prds', JSON.stringify(prds));

          return doc.name;
        } catch (error) {
          console.error(`Error syncing document ${doc.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(syncPromises);
      const successfulSyncs = results.filter((doc): doc is string => doc !== null);
      
      if (successfulSyncs.length > 0) {
        setToastMessage('Documents synced successfully!');
        setShowToast(true);
        setShowReturnPrompt(true);
        if (onComplete) {
          onComplete();
        }
      }

    } catch (error) {
      console.error('Error in sync process:', error);
      setToastMessage('Failed to sync documents. Please try again.');
      setShowToast(true);
    } finally {
      setIsSyncing(false);
    }
  };

  function extractDriveIds(input: string): DriveIds {
    let folderId: string | undefined;
    let documentId: string | undefined;

    try {
      const url = new URL(input);

      const folderMatch = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
      if (folderMatch) folderId = folderMatch[1];

      const docMatch = url.pathname.match(/\/document\/d\/([A-Za-z0-9_-]+)/);
      if (docMatch) documentId = docMatch[1];
    } catch {
      if (/^[A-Za-z0-9_-]{10,}$/.test(input)) {
        documentId = input;
      }
    }

    return { folderId, documentId };
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6">
        <form onSubmit={handleSyncPRDs} className="space-y-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-2 text-center">
            Sync Documents
          </h1>
          <p className="text-sm text-gray-500 text-center mb-4">
            Connect your Google Drive to access and manage your PRDs. We&apos;ll use these documents to provide better context for your PRDs.
          </p>
          <div className="space-y-6">
            <div>
              <label htmlFor="driveLink" className="block font-medium text-gray-900 mb-1">
                Google Drive Link
              </label>
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  id="driveLink"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full rounded-xl border border-rose-100 bg-white/90 backdrop-blur-sm px-4 py-3 text-gray-800 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200"
                  placeholder="Paste Google Drive folder or document URL"
                  required
                  disabled={isSyncing}
                />
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-200 ${
                    isSyncing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}

      {showReturnPrompt && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6 text-center">
          <p className="text-gray-700 mb-4">Great! You&apos;ve synced your documents. Ready to continue with the setup?</p>
          <button
            onClick={() => router.push('/onboarding')}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            Return to Setup
          </button>
        </div>
      )}

      <div className="relative">
        <ProgressNotification
          isLoading={isSyncing}
          documents={documents}
          onComplete={() => {
            setDocuments([]);
            setIsSyncing(false);
          }}
          position="top-center"
        />
      </div>
    </div>
  );
} 
