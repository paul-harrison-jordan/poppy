'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/AppShell';
import { 
  User, 
  FileText, 
  RefreshCw, 
  Save,
  Loader2
} from 'lucide-react';
import SyncForm from '@/components/SyncForm';

type ConfigSection = 'persona' | 'instructions' | 'documents';

interface PRD {
  title: string;
  url: string;
  query?: string;
  createdAt?: string;
  id?: string;
}

export default function ConfigurePage() {
  const { data: session, status } = useSession();
  const [activeSection, setActiveSection] = useState<ConfigSection>('persona');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Persona state
  const [personaData, setPersonaData] = useState({
    role: '',
    experience: '',
    goals: '',
    painPoints: '',
    industry: ''
  });
  
  // Instructions state (poppy.md)
  const [instructions, setInstructions] = useState('');
  
  // Documents state
  const [syncedPrds, setSyncedPrds] = useState<PRD[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [resyncingDoc, setResyncingDoc] = useState<string | null>(null);
  const [isResyncingAll, setIsResyncingAll] = useState(false);
  const itemsPerPage = 10;

  // Load saved data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load persona
      const savedPersona = localStorage.getItem('userPersona');
      if (savedPersona) {
        try {
          setPersonaData(JSON.parse(savedPersona));
        } catch (e) {
          console.error('Error loading persona:', e);
        }
      }
      
      // Load instructions
      const savedInstructions = localStorage.getItem('poppyInstructions');
      if (savedInstructions) {
        setInstructions(savedInstructions);
      }
      
      // Load synced documents
      refreshSyncedPrds();
    }
  }, []);

  const refreshSyncedPrds = () => {
    const stored = localStorage.getItem('prds');
    if (stored) {
      try {
        const parsedPrds = JSON.parse(stored);
        setSyncedPrds(parsedPrds);
      } catch (error) {
        console.error('Error parsing PRDs from localStorage:', error);
        setSyncedPrds([]);
      }
    }
  };

  const handleSavePersona = () => {
    setIsSaving(true);
    localStorage.setItem('userPersona', JSON.stringify(personaData));
    
    // Simulate save delay
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 500);
  };

  const handleSaveInstructions = () => {
    setIsSaving(true);
    localStorage.setItem('poppyInstructions', instructions);
    
    // Simulate save delay
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 500);
  };

  const handleResync = async (docId: string) => {
    try {
      setResyncingDoc(docId);
      
      // Get document name first
      const docResponse = await fetch('/api/fetch-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });

      if (!docResponse.ok) {
        throw new Error('Failed to fetch document details');
      }

      const { documents } = await docResponse.json();
      const doc = documents[0];

      // Get document content and chunk it
      const chunkResponse = await fetch('/api/chunk-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: docId,
          documentName: doc.name
        }),
      });

      if (!chunkResponse.ok) {
        throw new Error('Failed to chunk document');
      }

      const chunksData = await chunkResponse.json();
      const chunks = chunksData.chunks;

      // Upload to vector store
      const cachedVectorStoreId = localStorage.getItem('vectorStoreId');
      
      const resyncResponse = await fetch('/api/vector-store-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: chunks.join('\n\n'),
          documentId: docId,
          documentTitle: `Document ${docId}`,
          vectorStoreId: cachedVectorStoreId
        }),
      });

      if (!resyncResponse.ok) {
        throw new Error('Failed to upload to vector store');
      }

      refreshSyncedPrds();
    } catch (error) {
      console.error('Error resyncing document:', error);
      alert('Failed to resync document. Please try again.');
    } finally {
      setResyncingDoc(null);
    }
  };

  const handleResyncAll = async () => {
    if (!syncedPrds.length) return;
    
    try {
      setIsResyncingAll(true);
      
      for (const prd of syncedPrds) {
        if (!prd.id) continue;
        
        try {
          await handleResync(prd.id);
        } catch (error) {
          console.error(`Failed to resync document ${prd.title}:`, error);
        }
      }
    } finally {
      setIsResyncingAll(false);
    }
  };

  const totalPages = Math.ceil(syncedPrds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPrds = syncedPrds.slice(startIndex, endIndex);

  const tabs = [
    {
      id: 'persona' as ConfigSection,
      label: 'Persona',
      icon: User,
    },
    {
      id: 'instructions' as ConfigSection,
      label: 'Instructions',
      icon: FileText,
    },
    {
      id: 'documents' as ConfigSection,
      label: 'Documents',
      icon: RefreshCw,
    }
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration</h1>
          <p className="text-gray-600">
            Customize your Poppy experience by configuring your persona, instructions, and documents.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all ${
                    activeSection === tab.id
                      ? 'border-poppy text-poppy'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
            {/* Persona Section */}
            {activeSection === 'persona' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Define Your Customer Persona</h2>
                  <p className="text-gray-600 mt-2">
                    Define the customer persona you&apos;re responsible for. This helps Poppy understand your target audience and tailor product decisions accordingly.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Role/Title
                    </label>
                    <input
                      type="text"
                      value={personaData.role}
                      onChange={(e) => setPersonaData({ ...personaData, role: e.target.value })}
                      placeholder="e.g., Marketing Director, Data Scientist, Service Manager"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level
                    </label>
                    <input
                      type="text"
                      value={personaData.experience}
                      onChange={(e) => setPersonaData({ ...personaData, experience: e.target.value })}
                      placeholder="e.g., 5+ years in digital marketing, New to analytics platforms"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Goals
                    </label>
                    <textarea
                      value={personaData.goals}
                      onChange={(e) => setPersonaData({ ...personaData, goals: e.target.value })}
                      placeholder="What are they trying to achieve? e.g., Increase ROI on campaigns, streamline operations, improve customer engagement"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pain Points
                    </label>
                    <textarea
                      value={personaData.painPoints}
                      onChange={(e) => setPersonaData({ ...personaData, painPoints: e.target.value })}
                      placeholder="What challenges do they face? e.g., Limited budget, complex tools, lack of technical expertise"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry/Domain
                    </label>
                    <input
                      type="text"
                      value={personaData.industry}
                      onChange={(e) => setPersonaData({ ...personaData, industry: e.target.value })}
                      placeholder="e.g., E-commerce, Healthcare, SaaS, Retail"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSavePersona}
                      disabled={isSaving}
                      className="px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Save className="w-4 h-4" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Persona
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions Section */}
            {activeSection === 'instructions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Custom Instructions</h2>
                  <p className="text-gray-600 mt-2">
                    Write instructions that will be included in every interaction with Poppy. This is your personal &quot;poppy.md&quot; that shapes how the AI responds to you.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions for Poppy
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder={`Example instructions:

- Always consider mobile-first design principles
- Focus on accessibility and WCAG compliance
- Prioritize performance metrics (Core Web Vitals)
- Use our company's design system components
- Consider international users and localization needs
- Follow our specific coding standards (TypeScript, React)
- Always include test coverage recommendations
- Consider security implications for all features`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent h-96 font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      These instructions will be included in every API call to help Poppy understand your preferences and requirements.
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveInstructions}
                      disabled={isSaving}
                      className="px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Save className="w-4 h-4" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Instructions
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Section */}
            {activeSection === 'documents' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
                  <p className="text-gray-600 mt-2">
                    Connect and manage documents that help Poppy understand your context and writing style.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <SyncForm />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Synced Documents</h2>
                    <button
                      onClick={handleResyncAll}
                      disabled={isResyncingAll || syncedPrds.length === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        isResyncingAll || syncedPrds.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-poppy/10 text-poppy hover:bg-poppy/20'
                      }`}
                    >
                      {isResyncingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Resyncing All...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Resync All
                        </>
                      )}
                    </button>
                  </div>

                  {syncedPrds.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                      No documents synced yet. Add documents above to get started.
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-200">
                        {currentPrds.map((prd, idx) => (
                          <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                            <a
                              href={prd.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-900 font-medium hover:text-poppy transition-colors"
                            >
                              {prd.title || 'Untitled Document'}
                            </a>
                            <button
                              onClick={() => prd.id && handleResync(prd.id)}
                              disabled={resyncingDoc === prd.id || !prd.id}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                resyncingDoc === prd.id
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-poppy/10 text-poppy hover:bg-poppy/20'
                              }`}
                            >
                              {resyncingDoc === prd.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Resyncing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  Resync
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                currentPage === 1 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-gray-700 hover:text-poppy'
                              }`}
                            >
                              Previous
                            </button>
                            <span className="text-sm text-gray-600">
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                currentPage === totalPages 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-gray-700 hover:text-poppy'
                              }`}
                            >
                              Next
                            </button>
                          </div>
                          <div className="text-sm text-gray-600">
                            Showing {startIndex + 1}-{Math.min(endIndex, syncedPrds.length)} of {syncedPrds.length} documents
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </AppShell>
  );
}