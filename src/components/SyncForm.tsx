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

export default function SyncForm({ onSyncComplete }: SyncFormProps) {
  const [folderId, setFolderId] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  const handleSyncPRDs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    try {
      // First, fetch all documents from the folder
      const docsResponse = await fetch('/api/fetch-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId }),
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
          const response = await fetch('/api/sync-prds', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentId: doc.id }),
          });

          if (!response.ok) {
            console.error(`Failed to sync document: ${doc.name}`);
            return null;
      }

      const data = await response.json();
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
            title: data.documentName,
            url: `https://docs.google.com/document/d/${doc.id}`,
            createdAt: new Date().toISOString(),
            id: doc.id
          });
          localStorage.setItem('prds', JSON.stringify(prds));

          return data.documentName;
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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSyncPRDs} className="flex items-center gap-2">
        <input
          type="text"
          id="folderId"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
          placeholder="Add Drive Folder ID so we can use it to train ChatPRD"
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
