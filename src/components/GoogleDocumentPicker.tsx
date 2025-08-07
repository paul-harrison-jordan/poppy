'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Folder, Check, Loader2 } from 'lucide-react';

interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  type: 'document' | 'folder' | 'other';
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    me: boolean;
  }>;
  syncStatus?: 'pending' | 'syncing' | 'completed' | 'error';
  syncMessage?: string;
  documents?: GoogleDriveItem[];
  expanded?: boolean;
}

interface GoogleDocumentPickerProps {
  onDocumentsSelected: (documents: GoogleDriveItem[]) => void;
  onSyncRequested: (selectedItems: GoogleDriveItem[]) => void;
  selectedDocumentIds?: string[];
  syncingItems?: GoogleDriveItem[];
  expandedFolders?: Record<string, { documents: GoogleDriveItem[], expanded: boolean }>;
}

export default function GoogleDocumentPicker({ 
  onDocumentsSelected, 
  onSyncRequested,
  selectedDocumentIds = [], 
  syncingItems: _syncingItems = [],
  expandedFolders: _expandedFolders = {}
}: GoogleDocumentPickerProps) {
  const [documents, setDocuments] = useState<GoogleDriveItem[]>([]);
  const [folders, setFolders] = useState<GoogleDriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<GoogleDriveItem[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'folders'>('documents');
  const [docsPageToken, setDocsPageToken] = useState<string | null>(null);
  const [foldersPageToken, setFoldersPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize with selected documents
  useEffect(() => {
    if (selectedDocumentIds.length > 0) {
      const selected = documents.filter(doc => selectedDocumentIds.includes(doc.id));
      setSelectedItems(selected);
    }
  }, [selectedDocumentIds, documents]);


  // Fetch recent documents and folders on component mount
  useEffect(() => {
    fetchInitialItems();
  }, []);

  const fetchInitialItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch recent documents
      const docsResponse = await fetch('/api/google-drive-browse?pageSize=10&itemType=documents');
      const docsResult = await docsResponse.json();
      
      if (!docsResponse.ok) {
        throw new Error(docsResult.error || 'Failed to fetch documents');
      }
      
      // Fetch recent folders  
      const foldersResponse = await fetch('/api/google-drive-browse?pageSize=10&itemType=folders');
      const foldersResult = await foldersResponse.json();
      
      if (!foldersResponse.ok) {
        throw new Error(foldersResult.error || 'Failed to fetch folders');
      }
      
      // Handle the API response
      setDocuments(docsResult.documents || []);
      setDocsPageToken(docsResult.nextPageToken);
      
      setFolders(foldersResult.folders || []);
      setFoldersPageToken(foldersResult.nextPageToken);
      
    } catch (err: unknown) {
      console.error('Error fetching Google Drive items:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = async () => {
    if (loadingMore) return;
    
    setLoadingMore(true);
    
    try {
      if (activeTab === 'documents' && docsPageToken) {
        const response = await fetch(`/api/google-drive-browse?pageSize=10&itemType=documents&pageToken=${docsPageToken}`);
        const result = await response.json();
        
        if (response.ok) {
          setDocuments(prev => [...prev, ...(result.documents || [])]);
          setDocsPageToken(result.nextPageToken);
        }
      } else if (activeTab === 'folders' && foldersPageToken) {
        const response = await fetch(`/api/google-drive-browse?pageSize=10&itemType=folders&pageToken=${foldersPageToken}`);
        const result = await response.json();
        
        if (response.ok) {
          setFolders(prev => [...prev, ...(result.folders || [])]);
          setFoldersPageToken(result.nextPageToken);
        }
      }
    } catch (err) {
      console.error('Error loading more items:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleItemSelection = async (item: GoogleDriveItem) => {
    const isSelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
    let newSelection: GoogleDriveItem[];
    
    if (isSelected) {
      newSelection = selectedItems.filter(selectedItem => selectedItem.id !== item.id);
    } else {
      // If it's a folder, fetch its documents before adding to selection
      if (item.type === 'folder') {
        try {
          const response = await fetch(`/api/google-drive-browse?folderId=${item.id}&itemType=documents`);
          const result = await response.json();
          
          if (response.ok) {
            const folderWithDocs = {
              ...item,
              documents: result.documents || [],
              expanded: true
            };
            newSelection = [...selectedItems, folderWithDocs];
          } else {
            // If we can't fetch docs, just add the folder without docs
            newSelection = [...selectedItems, { ...item, documents: [], expanded: false }];
          }
        } catch (error) {
          console.error('Error fetching folder documents:', error);
          // If we can't fetch docs, just add the folder without docs
          newSelection = [...selectedItems, { ...item, documents: [], expanded: false }];
        }
      } else {
        newSelection = [...selectedItems, item];
      }
    }
    
    setSelectedItems(newSelection);
    onDocumentsSelected(newSelection);
  };

  const handleSelectAll = async () => {
    const currentItems = activeTab === 'documents' ? documents : folders;
    const currentlySelected = selectedItems.filter(item => 
      currentItems.some(currentItem => currentItem.id === item.id)
    );
    
    if (currentlySelected.length === currentItems.length) {
      // Deselect all from current tab
      const newSelection = selectedItems.filter(item => 
        !currentItems.some(currentItem => currentItem.id === item.id)
      );
      setSelectedItems(newSelection);
      onDocumentsSelected(newSelection);
    } else {
      // Select all from current tab
      const otherItems = selectedItems.filter(item => 
        !currentItems.some(currentItem => currentItem.id === item.id)
      );
      
      // For folders, we need to fetch documents for each folder
      if (activeTab === 'folders') {
        const foldersWithDocs = await Promise.all(
          currentItems.map(async (folder) => {
            try {
              const response = await fetch(`/api/google-drive-browse?folderId=${folder.id}&itemType=documents`);
              const result = await response.json();
              
              if (response.ok) {
                return {
                  ...folder,
                  documents: result.documents || [],
                  expanded: true
                };
              } else {
                return { ...folder, documents: [], expanded: false };
              }
            } catch (error) {
              console.error(`Error fetching documents for folder ${folder.name}:`, error);
              return { ...folder, documents: [], expanded: false };
            }
          })
        );
        
        const newSelection = [...otherItems, ...foldersWithDocs];
        setSelectedItems(newSelection);
        onDocumentsSelected(newSelection);
      } else {
        // For documents, just add them directly
        const newSelection = [...otherItems, ...currentItems];
        setSelectedItems(newSelection);
        onDocumentsSelected(newSelection);
      }
    }
  };

  const handleSyncNow = async () => {
    console.log('Sync button clicked. Selected items:', selectedItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      mimeType: item.mimeType
    })));
    
    setIsSyncing(true);
    
    // Start the sync process
    onSyncRequested(selectedItems);
  };



  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)} day${Math.floor(diffInDays) === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const currentItems = activeTab === 'documents' ? documents : folders;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-red-600 font-medium mb-2">Connection Error</div>
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-poppy-primary/10 shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-poppy-primary/5 to-lavender-secondary/5 p-6 border-b border-poppy-primary/10">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Select Your Recent Files</h3>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'documents'
                ? 'bg-white text-poppy-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'folders'
                ? 'bg-white text-poppy-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Folder className="w-4 h-4" />
            Folders ({folders.length})
          </button>
        </div>

        {/* Selection Controls */}
        <div className="space-y-3">
          {/* Select All & Selection Counter */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-poppy-primary hover:bg-poppy-primary/10 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              {(() => {
                const currentItems = activeTab === 'documents' ? documents : folders;
                const currentlySelected = selectedItems.filter(item => 
                  currentItems.some(currentItem => currentItem.id === item.id)
                );
                return currentlySelected.length === currentItems.length && currentItems.length > 0 
                  ? `Deselect all ${activeTab}` 
                  : `Select all ${activeTab}`;
              })()}
            </button>
            
            {selectedItems.length > 0 && (
              <div className="text-sm text-gray-600">
                {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
              </div>
            )}
          </div>

          {/* Sync Button */}
          {selectedItems.length > 0 && (
            <div className="bg-gradient-to-r from-poppy-primary to-poppy-primary-hover rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-medium">
                  🚀 Ready to sync {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-white/90 text-sm">
                  {selectedItems.filter(item => item.type === 'document').length} document{selectedItems.filter(item => item.type === 'document').length === 1 ? '' : 's'} • {selectedItems.filter(item => item.type === 'folder').length} folder{selectedItems.filter(item => item.type === 'folder').length === 1 ? '' : 's'}
                </div>
              </div>
              <button
                onClick={handleSyncNow}
                className="w-full bg-white text-poppy-primary font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Sync Docs Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-poppy-primary" />
            <span className="ml-3 text-gray-600">Loading your recent {activeTab}...</span>
          </div>
        ) : isSyncing ? (
          <div className="p-6">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">Syncing your selected items...</span>
              </div>
              <p className="text-blue-600 text-sm mt-1">
                This may take a few minutes. Each document will be processed, chunked, embedded, and saved to your knowledge base.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider w-1/2">
                      Item
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {selectedItems.map((item, index) => {
                    // For folders, show the folder and its documents
                    if (item.type === 'folder') {
                      const folderDocs = item.documents || [];
                      return (
                        <React.Fragment key={`${item.id}-${index}`}>
                          {/* Folder row */}
                          <tr className="transition-all hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate" title={item.name}>
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    📁 Folder • {folderDocs.length} document{folderDocs.length === 1 ? '' : 's'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                {item.syncStatus === 'pending' && (
                                  <>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <span className="text-gray-600">Pending</span>
                                  </>
                                )}
                                {item.syncStatus === 'syncing' && (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-poppy-primary" />
                                    <span className="text-poppy-primary font-medium">Syncing</span>
                                  </>
                                )}
                                {item.syncStatus === 'completed' && (
                                  <>
                                    <Check className="w-4 h-4 text-sprout-success" />
                                    <span className="text-sprout-success font-medium">Completed</span>
                                  </>
                                )}
                                {item.syncStatus === 'error' && (
                                  <>
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="text-red-500 font-medium">Error</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.syncMessage || ''}
                            </td>
                          </tr>
                          
                          {/* Folder documents rows (indented) */}
                          {folderDocs.map((doc) => (
                            <tr key={`${item.id}-${doc.id}`} className="bg-gray-25 border-l-2 border-blue-200">
                              <td className="py-2 px-4 pl-12">
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-800 truncate text-sm" title={doc.name}>
                                      {doc.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      📄 Document from folder
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-4 text-sm">
                                <div className="flex items-center gap-2">
                                  {doc.syncStatus === 'pending' && (
                                    <>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                      <span className="text-gray-600">Pending</span>
                                    </>
                                  )}
                                  {doc.syncStatus === 'syncing' && (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-poppy-primary" />
                                      <span className="text-poppy-primary font-medium">Syncing</span>
                                    </>
                                  )}
                                  {doc.syncStatus === 'completed' && (
                                    <>
                                      <Check className="w-3 h-3 text-sprout-success" />
                                      <span className="text-sprout-success font-medium">Done</span>
                                    </>
                                  )}
                                  {doc.syncStatus === 'error' && (
                                    <>
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      <span className="text-red-500 font-medium">Failed</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-600">
                                {doc.syncMessage || ''}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    } else {
                      // Regular document row
                      return (
                        <tr key={`${item.id}-${index}`} className="transition-all hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate" title={item.name}>
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  📄 Document
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              {item.syncStatus === 'pending' && (
                                <>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span className="text-gray-600">Pending</span>
                                </>
                              )}
                              {item.syncStatus === 'syncing' && (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-poppy-primary" />
                                  <span className="text-poppy-primary font-medium">Syncing</span>
                                </>
                              )}
                              {item.syncStatus === 'completed' && (
                                <>
                                  <Check className="w-4 h-4 text-sprout-success" />
                                  <span className="text-sprout-success font-medium">Completed</span>
                                </>
                              )}
                              {item.syncStatus === 'error' && (
                                <>
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-red-500 font-medium">Error</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {item.syncMessage || ''}
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {currentItems.length > 0 ? (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        {activeTab === 'documents' ? 'Document' : 'Folder'}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Last Updated</th>
                      {isSyncing && (
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Sync Status</th>
                      )}
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Select</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {currentItems.map((item) => {
                      const isSelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
                      
                      return (
                        <tr
                          key={item.id}
                          className={`transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-poppy-primary/5 border-l-4 border-poppy-primary'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={(e) => {
                            // Prevent double-clicking if clicking on the checkbox cell
                            if ((e.target as HTMLElement).closest('td:last-child')) {
                              return;
                            }
                            toggleItemSelection(item);
                          }}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {activeTab === 'documents' ? (
                                <FileText className={`w-5 h-5 flex-shrink-0 ${
                                  isSelected ? 'text-poppy-primary' : 'text-green-500'
                                }`} />
                              ) : (
                                <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className={`font-medium truncate ${
                                  isSelected ? 'text-poppy-primary' : 'text-gray-900'
                                }`} title={item.name}>
                                  {item.name}
                                </div>
                                {item.owners?.some(owner => owner.me) && (
                                  <div className="text-xs text-gray-500 mt-1">👤 You own this</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {item.modifiedTime ? formatDate(item.modifiedTime) : 'Unknown'}
                          </td>
                          {isSyncing && (
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                {item.syncStatus === 'pending' && (
                                  <>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <span className="text-gray-600">Pending</span>
                                  </>
                                )}
                                {item.syncStatus === 'syncing' && (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-poppy-primary" />
                                    <span className="text-poppy-primary font-medium">{item.syncMessage || 'Syncing...'}</span>
                                  </>
                                )}
                                {item.syncStatus === 'completed' && (
                                  <>
                                    <Check className="w-4 h-4 text-sprout-success" />
                                    <span className="text-sprout-success font-medium">Completed</span>
                                  </>
                                )}
                                {item.syncStatus === 'error' && (
                                  <>
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="text-red-500 font-medium">{item.syncMessage || 'Error'}</span>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4 text-center" onClick={(e) => {
                            e.stopPropagation();
                            toggleItemSelection(item);
                          }}>
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${
                              isSelected 
                                ? 'bg-poppy-primary border-poppy-primary' 
                                : 'border-gray-300 hover:border-poppy-primary'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                {activeTab === 'documents' ? (
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                ) : (
                  <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                )}
                <div className="text-gray-600 font-medium">
                  No recent {activeTab} found
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  {activeTab === 'documents' 
                    ? 'Try creating some Google Docs first' 
                    : 'Create some folders in Google Drive to organize your documents'
                  }
                </div>
              </div>
            )}
            
            {/* Load More Button */}
            {((activeTab === 'documents' && docsPageToken) || (activeTab === 'folders' && foldersPageToken)) && (
              <div className="text-center py-4 border-t border-gray-200">
                <button
                  onClick={loadMoreItems}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm text-poppy-primary hover:bg-poppy-primary/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : `Load more ${activeTab}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}