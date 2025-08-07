'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Folder, Check, Loader2, ChevronLeft, X, AlertCircle } from 'lucide-react';

interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    me: boolean;
  }>;
}

interface GoogleDriveDocument {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    me: boolean;
  }>;
}

interface SyncItem {
  id: string;
  name: string;
  type: 'folder' | 'document';
  status: 'pending' | 'chunking' | 'embedding' | 'upserting' | 'completed' | 'error';
  progress: number;
  message?: string;
  documents?: SyncItem[];
}

interface SyncConfirmationModalProps {
  folders: GoogleDriveFolder[];
  documents: GoogleDriveDocument[];
  onBack: () => void;
  onStartSync: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function SyncConfirmationModal({ 
  folders,
  documents,
  onBack,
  onStartSync,
  onClose,
  isOpen
}: SyncConfirmationModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [syncComplete, setSyncComplete] = useState(false);

  // Initialize sync items when modal opens
  useEffect(() => {
    if (isOpen && !isSyncing) {
      initializeSyncItems();
    }
  }, [isOpen, folders, documents, isSyncing]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeSyncItems = async () => {
    const items: SyncItem[] = [];

    // Add folders and fetch their documents
    for (const folder of folders) {
      try {
        const response = await fetch(`/api/google-drive-browse?folderId=${folder.id}&itemType=documents`);
        const result = await response.json();
        
        const folderDocs = (result.documents || []).map((doc: GoogleDriveDocument) => ({
          id: doc.id,
          name: doc.name,
          type: 'document' as const,
          status: 'pending' as const,
          progress: 0
        }));

        items.push({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          status: 'pending',
          progress: 0,
          documents: folderDocs
        });
      } catch (error) {
        console.error(`Error fetching documents for folder ${folder.name}:`, error);
        items.push({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          status: 'pending',
          progress: 0,
          documents: []
        });
      }
    }

    // Add individual documents
    for (const doc of documents) {
      items.push({
        id: doc.id,
        name: doc.name,
        type: 'document',
        status: 'pending',
        progress: 0
      });
    }

    setSyncItems(items);
  };

  const updateSyncProgress = (itemId: string, status: SyncItem['status'], progress: number, message?: string, isSubDocument?: boolean, parentId?: string) => {
    setSyncItems(prev => prev.map(item => {
      if (isSubDocument && parentId && item.id === parentId) {
        return {
          ...item,
          documents: item.documents?.map(doc => 
            doc.id === itemId ? { ...doc, status, progress, message } : doc
          )
        };
      } else if (item.id === itemId) {
        return { ...item, status, progress, message };
      }
      return item;
    }));
  };


  const handleStartSync = async () => {
    setIsSyncing(true);
    setOverallProgress(0);

    try {
      // Collect all documents to sync (from folders and individual documents)
      const allDocumentsToSync: Array<{ id: string; name: string; parentFolderId?: string }> = [];
      
      // Get documents from folders (use syncItems which has the fetched documents)
      for (const folder of syncItems.filter(item => item.type === 'folder')) {
        if (folder.documents) {
          folder.documents.forEach(doc => {
            allDocumentsToSync.push({
              id: doc.id,
              name: doc.name,
              parentFolderId: folder.id
            });
          });
        }
      }
      
      // Add individual documents (use syncItems for consistency)
      for (const document of syncItems.filter(item => item.type === 'document')) {
        allDocumentsToSync.push({
          id: document.id,
          name: document.name
        });
      }

      // Process all documents simultaneously - this enables parallel processing
      console.log(`🚀 Starting parallel sync for ${allDocumentsToSync.length} documents...`);
      
      // Track completed documents for real-time progress
      let completedCount = 0;
      
      const syncPromises = allDocumentsToSync.map(async (doc) => {
        const startTime = performance.now();
        try {
          // Update UI: Chunking phase
          updateSyncProgress(doc.id, 'chunking', 10, `Chunking ${doc.name}...`, !!doc.parentFolderId, doc.parentFolderId);
          
          // Step 1: Chunk the document
          const chunkResponse = await fetch('/api/chunk-docs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              documentId: doc.id,
              documentName: doc.name 
            }),
          });

          if (!chunkResponse.ok) {
            throw new Error(`Failed to chunk document: ${doc.name}`);
          }

          const chunksData = await chunkResponse.json();
          const chunks = chunksData.chunks;

          // Update UI: Embedding phase
          updateSyncProgress(doc.id, 'embedding', 40, `Embedding ${chunks.length} chunks...`, !!doc.parentFolderId, doc.parentFolderId);

          // Step 2: Embed all chunks in a single batch call (MAJOR PERFORMANCE IMPROVEMENT)
          const embedResponse = await fetch('/api/embed-chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chunks: chunks, // Pass ALL chunks in one request
              documentId: doc.id 
            }),
          });

          if (!embedResponse.ok) {
            throw new Error(`Failed to embed chunks for document: ${doc.name}`);
          }

          const embedData = await embedResponse.json();
          const formattedEmbeddings = embedData.formattedEmbeddings;

          // Update UI: Upserting phase
          updateSyncProgress(doc.id, 'upserting', 80, `Saving ${formattedEmbeddings.length} vectors...`, !!doc.parentFolderId, doc.parentFolderId);

          // Step 3: Upsert to Pinecone
          const upsertResponse = await fetch('/api/pinecone-upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              vectors: formattedEmbeddings,
              documentId: doc.id 
            }),
          });

          if (!upsertResponse.ok) {
            throw new Error(`Failed to upsert to Pinecone: ${doc.id}`);
          }

          // Update UI: Completed
          const endTime = performance.now();
          const duration = ((endTime - startTime) / 1000).toFixed(1);
          updateSyncProgress(
            doc.id, 
            'completed', 
            100, 
            `✅ Synced ${chunks.length} chunks in ${duration}s`, 
            !!doc.parentFolderId, 
            doc.parentFolderId
          );
          
          console.log(`✅ ${doc.name}: ${chunks.length} chunks synced in ${duration}s`);

          // Store in localStorage (same as /sync page)
          const storedPrds = localStorage.getItem('prds');
          const prds = storedPrds ? JSON.parse(storedPrds) : [];
          const existingPrd = prds.find((p: { id: string }) => p.id === doc.id);
          
          if (!existingPrd) {
            prds.push({
              title: doc.name,
              url: `https://docs.google.com/document/d/${doc.id}`,
              createdAt: new Date().toISOString(),
              id: doc.id
            });
            localStorage.setItem('prds', JSON.stringify(prds));
          }

          // Update overall progress as each document completes
          completedCount++;
          const progressPercent = Math.floor((completedCount / allDocumentsToSync.length) * 100);
          setOverallProgress(progressPercent);
          
          return { success: true, doc };
        } catch (error) {
          console.error(`❌ Error syncing document ${doc.name}:`, error);
          
          // Update progress even for failed documents
          completedCount++;
          const progressPercent = Math.floor((completedCount / allDocumentsToSync.length) * 100);
          setOverallProgress(progressPercent);
          
          updateSyncProgress(
            doc.id, 
            'error', 
            0, 
            error instanceof Error ? error.message : 'Sync failed', 
            !!doc.parentFolderId, 
            doc.parentFolderId
          );
          return { success: false, doc, error };
        }
      });

      // Wait for all documents to complete
      const results = await Promise.all(syncPromises);
      
      // Update overall progress
      const successfulSyncs = results.filter(r => r.success);
      setOverallProgress(100);
      setSyncComplete(true);

      // Update folder statuses based on their documents
      for (const folderItem of syncItems.filter(item => item.type === 'folder')) {
        const folderDocs = allDocumentsToSync.filter(d => d.parentFolderId === folderItem.id);
        const folderResults = results.filter(r => 
          folderDocs.some(fd => fd.id === r.doc.id)
        );
        
        const allSuccess = folderResults.every(r => r.success);
        if (allSuccess && folderResults.length > 0) {
          updateSyncProgress(folderItem.id, 'completed', 100, `All ${folderResults.length} documents synced`);
        } else if (folderResults.length > 0) {
          const successCount = folderResults.filter(r => r.success).length;
          updateSyncProgress(folderItem.id, 'error', 0, `${successCount}/${folderResults.length} documents synced`);
        }
      }

      // Store synced docs in localStorage (same as /sync page)
      const syncedDocIds = successfulSyncs.map(r => r.doc.id);
      if (syncedDocIds.length > 0) {
        const existing = JSON.parse(localStorage.getItem('syncedDocs') || '[]');
        const merged = Array.from(new Set([...existing, ...syncedDocIds]));
        localStorage.setItem('syncedDocs', JSON.stringify(merged));
      }

      // Log completion status
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        console.log(`✅ All ${results.length} documents synced successfully!`);
      } else {
        console.warn(`⚠️ Sync completed with ${results.filter(r => !r.success).length} failures out of ${results.length} total`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncComplete(true);
      
      // Update all items to error state
      syncItems.forEach(item => {
        updateSyncProgress(item.id, 'error', 0, 'Sync failed');
        if (item.documents) {
          item.documents.forEach(doc => {
            updateSyncProgress(doc.id, 'error', 0, 'Sync failed', true, item.id);
          });
        }
      });
      
      alert('Sync failed. Please try again.');
    }
  };

  const getStatusIcon = (status: SyncItem['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
      case 'chunking':
      case 'embedding':
      case 'upserting':
        return <Loader2 className="w-4 h-4 animate-spin text-poppy-primary" />;
      case 'completed':
        return <Check className="w-4 h-4 text-sprout-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: SyncItem['status'], message?: string) => {
    if (message) return message;
    
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'chunking':
        return 'Chunking content';
      case 'embedding':
        return 'Creating embeddings';
      case 'upserting':
        return 'Saving to database';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error occurred';
    }
  };

  const totalItems = syncItems.reduce((count, item) => {
    return count + 1 + (item.documents?.length || 0);
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-poppy-primary/5 to-lavender-secondary/5 p-6 border-b border-poppy-primary/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-poppy-primary/10 rounded-full flex items-center justify-center">
                <span className="text-poppy-primary font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isSyncing ? '⚡ Syncing Your Documents' : '✅ Review & Confirm Sync'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isSyncing 
                    ? `Processing ${totalItems} items: chunking, embedding, and storing in Pinecone`
                    : `Ready to sync ${totalItems} items to your Pinecone knowledge base`
                  }
                </p>
              </div>
            </div>
            {(!isSyncing || syncComplete) && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Overall Progress Bar */}
          {isSyncing && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-medium text-poppy-primary">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-poppy-primary to-poppy-primary-hover h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto">
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    {isSyncing && (
                      <>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Progress
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {syncItems.map((item) => (
                    <React.Fragment key={item.id}>
                      {/* Folder/Document Row */}
                      <tr className="transition-all hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            {item.type === 'folder' ? (
                              <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate" title={item.name}>
                                {item.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {item.type === 'folder' ? (
                            <>📁 Folder • {item.documents?.length || 0} docs</>
                          ) : (
                            <>📄 Document</>
                          )}
                        </td>
                        {isSyncing && (
                          <>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item.status)}
                                <span className={`font-medium ${
                                  item.status === 'completed' ? 'text-sprout-success' : 
                                  item.status === 'error' ? 'text-red-500' :
                                  'text-poppy-primary'
                                }`}>
                                  {getStatusText(item.status, item.message)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-poppy-primary h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                ></div>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Folder Documents (Indented) */}
                      {item.documents?.map((doc) => (
                        <tr key={`${item.id}-${doc.id}`} className="bg-gray-25 border-l-2 border-blue-200">
                          <td className="py-2 px-4 pl-12">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-800 truncate text-sm" title={doc.name}>
                                  {doc.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-xs text-gray-500">
                            📄 From folder
                          </td>
                          {isSyncing && (
                            <>
                              <td className="py-2 px-4 text-sm">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(doc.status)}
                                  <span className={`font-medium text-xs ${
                                    doc.status === 'completed' ? 'text-sprout-success' : 
                                    doc.status === 'error' ? 'text-red-500' :
                                    'text-poppy-primary'
                                  }`}>
                                    {getStatusText(doc.status, doc.message)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-4 text-sm">
                                <div className="w-20 bg-gray-200 rounded-full h-1">
                                  <div 
                                    className="bg-poppy-primary h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${doc.progress}%` }}
                                  ></div>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Individual Documents - Find from syncItems */}
                  {syncItems.filter(item => item.type === 'document').map((doc) => (
                    <tr key={doc.id} className="transition-all hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate" title={doc.name}>
                              {doc.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        📄 Document
                      </td>
                      {isSyncing && (
                        <>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <span className={`font-medium ${
                                doc.status === 'completed' ? 'text-sprout-success' : 
                                doc.status === 'error' ? 'text-red-500' :
                                'text-poppy-primary'
                              }`}>
                                {getStatusText(doc.status, doc.message)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="w-24 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-poppy-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${doc.progress}%` }}
                              ></div>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isSyncing && (
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Documents
              </button>
              
              <button
                onClick={handleStartSync}
                className="bg-gradient-to-r from-poppy-primary to-poppy-primary-hover text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                🚀 Start Sync ({totalItems} items)
              </button>
            </div>
          </div>
        )}
        
        {/* Sync Complete Footer */}
        {syncComplete && (
          <div className="bg-gradient-to-r from-sprout-success/5 to-poppy-primary/5 p-6 border-t border-sprout-success/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sprout-success/10 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-sprout-success" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sync Complete!</div>
                  <div className="text-sm text-gray-600">All documents have been processed and added to your knowledge base</div>
                </div>
              </div>
              
              <button
                onClick={onStartSync}
                className="bg-gradient-to-r from-sprout-success to-sprout-success-hover text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                ✓ Continue to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}