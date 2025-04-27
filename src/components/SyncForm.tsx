'use client';

import React, { useState } from 'react';

interface SyncFormProps {
  onSyncComplete?: () => void;
}

export default function SyncForm({ onSyncComplete }: SyncFormProps) {
  const [folderId, setFolderId] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncedDocuments, setSyncedDocuments] = useState<string[]>([]);

  const handleSyncPRDs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sync-prds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync PRDs');
      }

      const data = await response.json();
      console.log('API Response:', data);
      setSyncStatus('Synced successfully');
      setSyncedDocuments(data.documents || []);
      // Store synced PRD names in localStorage
      if (data.syncedPrds && Array.isArray(data.syncedPrds)) {
        console.log('Synced PRDs from API:', data.syncedPrds);
        const stored = localStorage.getItem('syncedPrds');
        const existingPRDs = stored ? JSON.parse(stored) : [];
        const updatedPRDs = [...existingPRDs, ...data.syncedPrds];
        console.log('Updated PRDs:', updatedPRDs);
        localStorage.setItem('syncedPrds', JSON.stringify(updatedPRDs));
        console.log('Stored in localStorage:', localStorage.getItem('syncedPrds'));
        onSyncComplete?.();
      }
    } catch (error) {
      console.error('Error syncing PRDs:', error);
      setSyncStatus('Failed to sync PRDs');
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSyncPRDs} className="flex items-center gap-2">
        <input
          type="text"
          id="folderId"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
          placeholder="Add Drive Folder ID so we can use it to train ChatPRD"
          required
        />
        <button
          type="submit"
          className="w-10 h-10 rounded-full bg-[#EF6351] flex items-center justify-center text-white shadow-md hover:bg-[#d94d38] focus:outline-none focus:ring-2 focus:ring-[#EF6351] focus:ring-offset-2"
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

      {syncedDocuments.length > 0 && false && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-[#232426]">Synced Documents:</h3>
          <ul className="mt-2 space-y-1">
            {syncedDocuments.map((doc, index) => (
              <li key={index} className="text-sm text-[#232426]">
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 