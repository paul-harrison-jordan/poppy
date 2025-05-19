'use client';

import React, { useState } from 'react';
import { ProgressNotification, type Document } from '@/components/progress-notification';
import { usePathname } from 'next/navigation';

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

interface FormattedRow {
  RECIPIENT_EMAIL: string;
  GMV: string;
  NPS_VERBATIM: string;
  NPS_SCORE_RAW: string;
  SURVEY_END_DATE: string;
  row_number: number;
  KLAVIYO_ACCOUNT_ID: string;
}

interface SheetData {
  id: string;
  name: string;
  data: Array<{
    rowNumber: number;
    values: string[];
  }>;
}

function formatRows(sheetData: { sheet: SheetData }): FormattedRow[] {
  // Skip the header row (rowNumber 1)
  return sheetData.sheet.data.slice(2).map((row) => ({
    RECIPIENT_EMAIL: row.values[1],
    GMV: row.values[7],
    NPS_VERBATIM: row.values[13],
    NPS_SCORE_RAW: row.values[12],
    SURVEY_END_DATE: row.values[0],
    row_number: row.rowNumber,
    KLAVIYO_ACCOUNT_ID: row.values[5]
  }));
}


export default function SyncForm({ onComplete }: SyncFormProps) {
  const pathname = usePathname();
  const isSchedulePage = pathname === '/schedule';
  const [driveLink, setDriveLink] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [, setShowToast] = useState(false);
  const [, setToastMessage] = useState('');

  const handleSyncPRDs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    try {
      if (isSchedulePage) {
        const { documentId } = extractDriveIds(driveLink);
        const sheetResponse = await fetch('/api/fetch-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({  documentId: documentId }),
        });
        const sheetData = await sheetResponse.json();
        
        // Store the sheet ID in localStorage for the Scheduler component
        if (documentId) {
          localStorage.setItem('currentSheetId', documentId);
        }
        
        const formattedRows = formatRows(sheetData);
        
        // Process rows in batches of 100
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < formattedRows.length; i += batchSize) {
          batches.push(formattedRows.slice(i, i + batchSize));
        }

        
        // Process batches with concurrency limit
        const concurrencyLimit = 100; // Process 3 batches at a time
        const results = [];
        
        for (let i = 0; i < batches.length; i += concurrencyLimit) {
          const batchPromises = batches.slice(i, i + concurrencyLimit).map(async (batch, index) => {
            const batchNumber = i + index + 1;
            
            try {
              const embedResponse = await fetch('/api/embed-feedback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rows: batch }),
              });

              if (!embedResponse.ok) {
                throw new Error(`Failed to embed feedback batch ${batchNumber}`);
              }

              const embedResult = await embedResponse.json();
              return embedResult;
            } catch (error) {
              console.error(`Error processing batch ${batchNumber}:`, error);
              throw error;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        setShowToast(true);
        if (onComplete) {
          onComplete();
        }
      } else {
        // Original sync documents logic
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

            // Process chunks individually to avoid timeouts
            const embeddedChunksPromises = chunks.map(async (chunk: string) => {
              const embeddedChunk = await fetch('/api/embed-chunks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunks: [chunk], documentId }),
              });

              if (!embeddedChunk.ok) {
                console.error(`Failed to embed chunk for document: ${documentId}`);
                return null;
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
        
        // If localStorage item 'prds' has at least one item, set the sync docs onboarding as complete
        const prds = JSON.parse(localStorage.getItem('prds') || '[]');
        if (Array.isArray(prds) && prds.length > 0) {
          const prdDocIds = prds.map((doc: { id: string }) => doc.id);
          const existing = JSON.parse(localStorage.getItem('syncedDocs') || '[]');
          const merged = Array.from(new Set([...existing, ...prdDocIds]));
          localStorage.setItem('syncedDocs', JSON.stringify(merged));
        }
        
        if (successfulSyncs.length > 0) {
          setToastMessage('Documents synced successfully!');
          setShowToast(true);
          if (onComplete) {
            onComplete();
          }
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

      // Match both document and spreadsheet URLs
      const docMatch = url.pathname.match(/\/(?:document|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
      if (docMatch) documentId = docMatch[1];
    } catch {
      if (/^[A-Za-z0-9_-]{10,}$/.test(input)) {
        documentId = input;
      }
    }

    return { folderId, documentId };
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isSchedulePage ? 'Schedule' : 'Sync Documents'}
          </h2>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-300 p-6">
          <form onSubmit={handleSyncPRDs} className="space-y-4">
            <div>
              <label htmlFor="driveLink" className="block font-medium text-primary mb-1">
                {isSchedulePage ? 'Schedule Input' : 'Google Drive Link'}
              </label>
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  id="driveLink"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white/90 backdrop-blur-sm px-4 py-3 text-primary shadow-sm focus:border-poppy focus:outline-none focus:ring-1 focus:ring-poppy"
                  placeholder={isSchedulePage ? "Enter schedule details" : "Paste Google Drive folder or document URL"}
                  required
                  disabled={isSyncing}
                />
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy ${
                    isSyncing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Processing...' : isSchedulePage ? 'Submit' : 'Sync'}
                </button>
              </div>
            </div>
          </form>
          {!isSchedulePage && (
            <p className="text-gray-700 mt-4">
              Connect your Google Drive to sync your PRDs and other documents. This helps Poppy understand your product context better.
            </p>
          )}
        </div>
      </div>

      {!isSchedulePage && (
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
      )}
    </div>
  );
} 

