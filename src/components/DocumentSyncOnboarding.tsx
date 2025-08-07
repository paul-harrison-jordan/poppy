'use client';

import React, { useState } from 'react';
import FolderSelector from './FolderSelector';
import DocumentSelector from './DocumentSelector';
import SyncConfirmationModal from './SyncConfirmationModal';

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

interface DocumentSyncOnboardingProps {
  onSyncComplete?: (selectedFolders: GoogleDriveFolder[], selectedDocuments: GoogleDriveDocument[]) => void;
  onCancel?: () => void;
}

export default function DocumentSyncOnboarding({ 
  onSyncComplete,
  onCancel 
}: DocumentSyncOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<'folders' | 'documents' | 'confirmation'>('folders');
  const [selectedFolders, setSelectedFolders] = useState<GoogleDriveFolder[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<GoogleDriveDocument[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleFoldersSelected = (folders: GoogleDriveFolder[]) => {
    setSelectedFolders(folders);
  };

  const handleFolderSelectionNext = (folders: GoogleDriveFolder[]) => {
    setSelectedFolders(folders);
    setCurrentStep('documents');
  };

  const handleDocumentsSelected = (documents: GoogleDriveDocument[]) => {
    setSelectedDocuments(documents);
  };

  const handleDocumentSelectionNext = (documents: GoogleDriveDocument[]) => {
    setSelectedDocuments(documents);
    setShowConfirmationModal(true);
  };

  const handleDocumentSelectionBack = () => {
    setCurrentStep('folders');
  };

  const handleConfirmationBack = () => {
    setShowConfirmationModal(false);
    setCurrentStep('documents');
  };

  const handleStartSync = () => {
    // Close modal and call completion callback
    setShowConfirmationModal(false);
    onSyncComplete?.(selectedFolders, selectedDocuments);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmationModal(false);
    // Stay on current step, don't navigate away
  };

  // Progress indicator
  const getStepProgress = () => {
    switch (currentStep) {
      case 'folders':
        return 33;
      case 'documents':
        return 66;
      case 'confirmation':
        return 100;
      default:
        return 0;
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'folders':
        return 'Step 1 of 3: Choose folders containing documents to sync';
      case 'documents':
        return 'Step 2 of 3: Select individual documents (optional)';
      case 'confirmation':
        return 'Step 3 of 3: Review and confirm your selection';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">📚 Sync Documents to Knowledge Base</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
        
        <p className="text-gray-600 mb-4">{getStepDescription()}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-poppy-primary to-poppy-primary-hover h-2 rounded-full transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          ></div>
        </div>
        
        {/* Step Indicators */}
        <div className="flex items-center justify-between mt-4">
          <div className={`flex items-center gap-2 ${
            currentStep === 'folders' ? 'text-poppy-primary' : 
            getStepProgress() > 33 ? 'text-sprout-success' : 'text-gray-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              currentStep === 'folders' ? 'bg-poppy-primary text-white' :
              getStepProgress() > 33 ? 'bg-sprout-success text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Select Folders</span>
          </div>
          
          <div className={`flex items-center gap-2 ${
            currentStep === 'documents' ? 'text-poppy-primary' : 
            getStepProgress() > 66 ? 'text-sprout-success' : 'text-gray-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              currentStep === 'documents' ? 'bg-poppy-primary text-white' :
              getStepProgress() > 66 ? 'bg-sprout-success text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Select Documents</span>
          </div>
          
          <div className={`flex items-center gap-2 ${
            currentStep === 'confirmation' || showConfirmationModal ? 'text-poppy-primary' : 'text-gray-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              currentStep === 'confirmation' || showConfirmationModal ? 'bg-poppy-primary text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className="text-sm font-medium">Review & Sync</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'folders' && (
        <FolderSelector
          onFoldersSelected={handleFoldersSelected}
          onNext={handleFolderSelectionNext}
          selectedFolderIds={selectedFolders.map(f => f.id)}
        />
      )}

      {currentStep === 'documents' && (
        <DocumentSelector
          onDocumentsSelected={handleDocumentsSelected}
          onNext={handleDocumentSelectionNext}
          onBack={handleDocumentSelectionBack}
          selectedDocumentIds={selectedDocuments.map(d => d.id)}
        />
      )}

      {/* Confirmation Modal */}
      <SyncConfirmationModal
        folders={selectedFolders}
        documents={selectedDocuments}
        onBack={handleConfirmationBack}
        onStartSync={handleStartSync}
        onClose={handleCloseConfirmation}
        isOpen={showConfirmationModal}
      />

      {/* Summary Footer (always visible) */}
      {(selectedFolders.length > 0 || selectedDocuments.length > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-poppy-primary/5 to-lavender-secondary/5 rounded-xl border border-poppy-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  <strong>{selectedFolders.length}</strong> folder{selectedFolders.length === 1 ? '' : 's'} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  <strong>{selectedDocuments.length}</strong> individual document{selectedDocuments.length === 1 ? '' : 's'} selected
                </span>
              </div>
            </div>
            
            {currentStep !== 'folders' && (
              <button
                onClick={() => setShowConfirmationModal(true)}
                className="text-sm text-poppy-primary hover:text-poppy-primary-hover font-medium"
              >
                Preview Selection →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}