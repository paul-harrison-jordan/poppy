'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DocumentSyncOnboarding from '@/components/DocumentSyncOnboarding';

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

export default function TestPickerPage() {
  const { data: session, status } = useSession();
  const [selectedFolders, setSelectedFolders] = useState<GoogleDriveFolder[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<GoogleDriveDocument[]>([]);
  const [syncCompleted, setSyncCompleted] = useState(false);

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl mb-4">Not authenticated</h1>
        <a
          href="/api/auth/signin/google"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Google Document Picker Test</h1>
      
      {!syncCompleted ? (
        <DocumentSyncOnboarding
          onSyncComplete={(folders, documents) => {
            setSelectedFolders(folders);
            setSelectedDocs(documents);
            setSyncCompleted(true);
          }}
          onCancel={() => console.log('Cancelled')}
        />
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Sync Completed!</h2>
          <p className="text-green-700">Your documents have been successfully synced to the knowledge base.</p>
          <button
            onClick={() => setSyncCompleted(false)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Start New Sync
          </button>
        </div>
      )}
      
      {(selectedFolders.length > 0 || selectedDocs.length > 0) && (
        <div className="mt-8 space-y-6">
          {selectedFolders.length > 0 && (
            <div className="p-6 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-blue-800">📁 Selected Folders ({selectedFolders.length})</h2>
              <div className="space-y-2">
                {selectedFolders.map((folder) => (
                  <div key={folder.id} className="flex items-center space-x-3 p-3 bg-white rounded border">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{folder.name}</div>
                      <div className="text-sm text-gray-500">ID: {folder.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedDocs.length > 0 && (
            <div className="p-6 bg-green-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 text-green-800">📄 Selected Documents ({selectedDocs.length})</h2>
              <div className="space-y-2">
                {selectedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-3 p-3 bg-white rounded border">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-sm text-gray-500">ID: {doc.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}