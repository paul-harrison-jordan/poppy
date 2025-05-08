'use client';

import React, { useState } from 'react';
import { ProgressNotification, type Document } from '@/components/progress-notification';

interface SyncFormProps {
  onSyncComplete?: () => void;
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

export default function SyncForm({ onSyncComplete }: SyncFormProps) {
  const [driveLink, setDriveLink] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  const handleSyncPRDs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    try {

      // 2) Regex-match the ID in the pathname
      //    Matches either "…/d/<id>" or "…/folders/<id>"
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
      
      // Initialize documents state with all documents marked as not synced
      const initialDocs: Document[] = fetchedDocs.map((doc: GoogleDoc) => ({
        id: doc.id,
        name: doc.name,
        synced: false,
      }));
      setDocuments(initialDocs);

      // Create an array of promises for each document sync
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

          // Update the document's sync status
          setDocuments(prevDocs => 
            prevDocs.map(d => 
              d.id === doc.id ? { ...d, synced: true } : d
            )
          );

          // Store the document name in prds localStorage
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

      // Wait for all sync operations to complete
      const results = await Promise.all(syncPromises);
      
      // Filter out any failed syncs
      const successfulSyncs = results.filter((doc): doc is string => doc !== null);
      
      if (successfulSyncs.length > 0) {
        onSyncComplete?.();
      }

    } catch (error) {
      console.error('Error in sync process:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  function extractDriveIds(input: string): DriveIds {
    let folderId: string | undefined;
    let documentId: string | undefined;

    try {
      const url = new URL(input);

      // Extract folder ID
      const folderMatch = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
      console.log(folderMatch);
      if (folderMatch) folderId = folderMatch[1];

      // Extract document ID
      const docMatch = url.pathname.match(/\/document\/d\/([A-Za-z0-9_-]+)/);
      if (docMatch) documentId = docMatch[1];
    } catch {
      // Not a URL, check if input is a raw ID
      if (/^[A-Za-z0-9_-]{10,}$/.test(input)) {
        // Could be either, but let's assume documentId for this case
        documentId = input;
      }
    }

    return { folderId, documentId };
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSyncPRDs} className="flex items-center gap-2">
        <input
          type="text"
          id="url"
          value={driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
          className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
          placeholder="Paste Google Drive folder or document URL or ID"
          required
          disabled={isSyncing}
        />
        <button
          type="submit"
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSyncing 
              ? 'bg-[#BBC7B6] cursor-not-allowed' 
              : 'bg-[#EF6351] hover:bg-[#d94d38] focus:ring-[#EF6351]'
          }`}
          disabled={isSyncing}
        >
          <svg className="w-5 h-5 rotate-[-90deg]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </form>

      {syncStatus && (
        <div className="text-sm text-[#232426]">
          {syncStatus}
        </div>
      )}

      <div className="relative">
        <ProgressNotification
          isLoading={isSyncing}
          documents={documents}
          onComplete={() => {
            setDocuments([]); // Clear documents after completion
            setSyncStatus(''); // Clear status message
            setIsSyncing(false); // Ensure syncing state is set to false
          }}
          position="top-center"
        />
        </div>
    </div>
  );
} 
