'use client';

import React, { useState, useEffect } from 'react';
import { Folder, Check, Loader2, ChevronRight } from 'lucide-react';

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

interface FolderSelectorProps {
  onFoldersSelected: (folders: GoogleDriveFolder[]) => void;
  onNext: (selectedFolders: GoogleDriveFolder[]) => void;
  selectedFolderIds?: string[];
}

export default function FolderSelector({ 
  onFoldersSelected, 
  onNext,
  selectedFolderIds = [] 
}: FolderSelectorProps) {
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<GoogleDriveFolder[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Initialize with selected folder IDs
  useEffect(() => {
    if (selectedFolderIds.length > 0) {
      const selected = folders.filter(folder => selectedFolderIds.includes(folder.id));
      setSelectedFolders(selected);
    }
  }, [selectedFolderIds, folders]);

  // Fetch folders on component mount
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async (token?: string) => {
    const isLoadingMore = !!token;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        pageSize: '10',
        itemType: 'folders'
      });
      
      if (token) {
        params.append('pageToken', token);
      }
      
      const response = await fetch(`/api/google-drive-browse?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch folders');
      }
      
      const newFolders = result.folders || [];
      
      if (isLoadingMore) {
        setFolders(prev => [...prev, ...newFolders]);
      } else {
        setFolders(newFolders);
      }
      
      setPageToken(result.nextPageToken);
      setHasMore(!!result.nextPageToken);
      
    } catch (err: unknown) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (isLoadingMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMoreFolders = () => {
    if (pageToken && !loadingMore) {
      fetchFolders(pageToken);
    }
  };

  const toggleFolderSelection = (folder: GoogleDriveFolder) => {
    const isSelected = selectedFolders.some(selected => selected.id === folder.id);
    let newSelection: GoogleDriveFolder[];
    
    if (isSelected) {
      newSelection = selectedFolders.filter(selected => selected.id !== folder.id);
    } else {
      newSelection = [...selectedFolders, folder];
    }
    
    setSelectedFolders(newSelection);
    onFoldersSelected(newSelection);
  };

  const handleSelectAll = () => {
    const currentlySelected = selectedFolders.filter(selected => 
      folders.some(folder => folder.id === selected.id)
    );
    
    if (currentlySelected.length === folders.length && folders.length > 0) {
      // Deselect all current folders
      const otherSelected = selectedFolders.filter(selected => 
        !folders.some(folder => folder.id === selected.id)
      );
      setSelectedFolders(otherSelected);
      onFoldersSelected(otherSelected);
    } else {
      // Select all current folders
      const otherSelected = selectedFolders.filter(selected => 
        !folders.some(folder => folder.id === selected.id)
      );
      const newSelection = [...otherSelected, ...folders];
      setSelectedFolders(newSelection);
      onFoldersSelected(newSelection);
    }
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

  const handleNext = () => {
    onNext(selectedFolders);
  };

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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-poppy-primary/10 rounded-full flex items-center justify-center">
            <span className="text-poppy-primary font-semibold text-sm">1</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">📁 Select Folders</h3>
            <p className="text-sm text-gray-600 mt-1">Choose folders from your Google Drive to sync all their documents</p>
          </div>
        </div>
        
        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-poppy-primary hover:bg-poppy-primary/10 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            {(() => {
              const currentlySelected = selectedFolders.filter(selected => 
                folders.some(folder => folder.id === selected.id)
              );
              return currentlySelected.length === folders.length && folders.length > 0 
                ? 'Deselect all folders' 
                : 'Select all folders';
            })()}
          </button>
          
          {selectedFolders.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedFolders.length} folder{selectedFolders.length === 1 ? '' : 's'} selected
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-poppy-primary" />
            <span className="ml-3 text-gray-600">Loading your folders...</span>
          </div>
        ) : (
          <div className="p-6">
            {folders.length > 0 ? (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Folder
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Select
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {folders.map((folder) => {
                      const isSelected = selectedFolders.some(selected => selected.id === folder.id);
                      
                      return (
                        <tr
                          key={folder.id}
                          className={`transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-poppy-primary/5 border-l-4 border-poppy-primary'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('td:last-child')) {
                              return;
                            }
                            toggleFolderSelection(folder);
                          }}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <Folder className={`w-5 h-5 flex-shrink-0 ${
                                isSelected ? 'text-poppy-primary' : 'text-blue-500'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <div className={`font-medium truncate ${
                                  isSelected ? 'text-poppy-primary' : 'text-gray-900'
                                }`} title={folder.name}>
                                  {folder.name}
                                </div>
                                {folder.owners?.some(owner => owner.me) && (
                                  <div className="text-xs text-gray-500 mt-1">👤 You own this</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {folder.modifiedTime ? formatDate(folder.modifiedTime) : 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-center" onClick={(e) => {
                            e.stopPropagation();
                            toggleFolderSelection(folder);
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
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600 font-medium">No folders found</div>
                <div className="text-gray-500 text-sm mt-1">
                  Create some folders in Google Drive to organize your documents
                </div>
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4 border-t border-gray-200">
                <button
                  onClick={loadMoreFolders}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm text-poppy-primary hover:bg-poppy-primary/10 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load more folders
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedFolders.length > 0 ? (
              <>Selected {selectedFolders.length} folder{selectedFolders.length === 1 ? '' : 's'}</>
            ) : (
              <>Select folders to continue</>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={selectedFolders.length === 0}
            className="bg-poppy-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-poppy-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next: Select Documents
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}