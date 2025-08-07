'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { detectGoogleDriveLink } from '@/lib/utils/linkDetection';
import DocumentSyncOnboarding from './DocumentSyncOnboarding';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'context-prompt' | 'sync-prompt' | 'completion';
    field?: string;
    linkDetected?: string;
  };
}

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
}

interface PineconeEmbedding {
  id: string;
  values: number[];
  sparseValues?: {
    indices: number[];
    values: number[];
  };
  metadata: {
    text: string;
    documentId: string;
  };
}

interface OnboardingProgress {
  teamStrategy: boolean;
  productThinking: boolean;
  goals: boolean;
  documentSynced: boolean;
}

const ONBOARDING_PROMPTS = {
  welcome: "🚀 **Ready to supercharge your product development?**\n\nI'm Poppy, your AI product companion. In just 3 quick steps, I'll learn about your team and product to provide you with personalized PRD assistance, strategic insights, and actionable recommendations.\n\n**Let's start with your team's strategy for the next 6-12 months:**\n\nShare 3-5 paragraphs about:\n✨ Your product vision and key objectives\n🎯 Target market and user base\n⚡ Strategic priorities and initiatives\n📈 How you measure success\n\n*The richer your input, the more valuable my assistance becomes!*",
  teamStrategy: "🎉 **Perfect! Your strategy is crystal clear.**\n\nNow let's dive into your product thinking. Understanding your approach to solving problems will help me craft PRDs that match your methodology and decision-making style.\n\n**How do you approach product development and problem-solving?**\n\nTell me about:\n💡 Your product development philosophy\n🔍 How you identify and prioritize user problems\n⚖️ Your decision-making process for features\n📚 Examples of successful problem-solving\n🎯 How you balance user needs vs business goals\n\n*This insight will make my recommendations incredibly targeted!*",
  productThinking: "⚡ **Brilliant! I'm getting a clear picture of your approach.**\n\nFinal step: Let me understand your organizational context so I can speak your language and align with your specific environment.\n\n**What are your key goals and critical context I should know?**\n\nShare details about:\n🎯 Your team's specific goals and KPIs\n📝 Key terminology and industry language\n🏢 How your product fits in the broader organization\n🧠 Important background context for decisions\n⚠️ Any constraints or considerations\n\n*Almost there! This context will make our collaboration seamless.*",
  goals: "🌟 **Outstanding! Your setup is nearly complete.**\n\n**Now I'll scan your Google Drive for relevant documents**\nI've found recent documents and folders in your Drive that might be useful. Simply click to select any that contain strategy docs, user research, competitive analysis, market data, user feedback, product specs, existing PRDs, roadmaps, or planning documents.\n\n✨ **I'm proactively showing you your recent files** - no need to copy and paste URLs!\n📈 **Recently updated documents appear first** so you can quickly find what's relevant\n🎯 **Just click to sync** - I'll handle the rest\n\n*You can also skip this step and add documents later if nothing looks relevant.*",
  complete: "🎊 **You're all set! Welcome to your new product development superpower.**\n\nI now understand your strategy, approach, and context. Here's what I can help you with:\n\n✨ **Write targeted PRDs** that align with your strategy\n🚀 **Generate feature ideas** based on your methodology\n📋 **Decompose complex initiatives** into actionable tasks\n💡 **Provide strategic recommendations** using your context\n\n**Ready to build something amazing? Tell me about a feature you're working on!**",
};

interface OnboardingChatInterfaceProps {
  testMode?: boolean;
}

export default function OnboardingChatInterface({ testMode = false }: OnboardingChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress>({
    teamStrategy: false,
    productThinking: false,
    goals: false,
    documentSynced: false,
  });
  const [currentStep, setCurrentStep] = useState<keyof typeof ONBOARDING_PROMPTS>('welcome');
  const [contentLength, setContentLength] = useState<'insufficient' | 'good' | 'excellent'>('insufficient');
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [syncingItems, setSyncingItems] = useState<GoogleDriveItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, { documents: GoogleDriveItem[], expanded: boolean }>>({});
  
  // Consume expandedFolders to avoid unused variable warning
  // This state tracks which folders have been expanded in the document picker
  void expandedFolders;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);

  // Helper function to generate unique message IDs
  const generateMessageId = (): string => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  // Helper function to assess content length based on paragraphs
  const assessContentLength = (text: string): 'insufficient' | 'good' | 'excellent' => {
    if (!text.trim()) return 'insufficient';
    
    // Split by double newlines or single newlines followed by significant content
    const paragraphs = text
      .split(/\n\s*\n|\n(?=\S)/)
      .filter(p => p.trim().length > 20) // Only count substantial paragraphs
      .length;
    
    if (paragraphs < 3) {
      return 'insufficient'; // Not enough detail
    } else if (paragraphs === 3) {
      return 'insufficient'; // Still need more for good results
    } else if (paragraphs === 4) {
      return 'good'; // Good enough, but could be better
    } else {
      return 'excellent'; // 5+ paragraphs - perfect!
    }
  };

  useEffect(() => {
    // In test mode, don't check existing progress
    if (!testMode) {
      // Check existing progress
      const personalContext = localStorage.getItem('personalContext');
      const syncedDocs = localStorage.getItem('syncedDocs');
      
      if (personalContext) {
        const context = JSON.parse(personalContext);
        setProgress(prev => ({
          ...prev,
          teamStrategy: !!context.teamStrategy,
          productThinking: !!context.howYouThinkAboutProduct,
          goals: !!context.pillarGoalsKeyTermsBackground,
        }));
      }
      
      if (syncedDocs && JSON.parse(syncedDocs).length > 0) {
        setProgress(prev => ({ ...prev, documentSynced: true }));
      }
    }

    // Add welcome message
    setMessages([{
      id: generateMessageId(),
      role: 'assistant',
      content: ONBOARDING_PROMPTS.welcome,
      timestamp: new Date(),
      metadata: { type: 'context-prompt', field: 'teamStrategy' }
    }]);
  }, [testMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Check for Google Drive links
    const detectedLink = detectGoogleDriveLink(input);
    if (detectedLink) {
      await handleDocumentSync(detectedLink);
    } else if (input.toLowerCase() === 'skip' && currentStep === 'goals' && !progress.documentSynced) {
      // Handle skip for document sync
      addAssistantMessage(
        "No problem! You can always sync documents later from the settings. Let's get you started with Poppy!",
        'sync-prompt'
      );
      setTimeout(() => completeOnboarding(), 1500);
    } else {
      await handleContextCollection(input);
    }

    setIsProcessing(false);
  };

  const handleContextCollection = async (content: string) => {
    const personalContext = testMode 
      ? {} 
      : JSON.parse(localStorage.getItem('personalContext') || '{}');
    
    switch (currentStep) {
      case 'welcome':
        personalContext.teamStrategy = content;
        setProgress(prev => ({ ...prev, teamStrategy: true }));
        setCurrentStep('teamStrategy');
        addAssistantMessage(ONBOARDING_PROMPTS.teamStrategy, 'context-prompt', 'productThinking');
        break;
        
      case 'teamStrategy':
        personalContext.howYouThinkAboutProduct = content;
        setProgress(prev => ({ ...prev, productThinking: true }));
        setCurrentStep('productThinking');
        addAssistantMessage(ONBOARDING_PROMPTS.productThinking, 'context-prompt', 'goals');
        break;
        
      case 'productThinking':
        personalContext.pillarGoalsKeyTermsBackground = content;
        setProgress(prev => ({ ...prev, goals: true }));
        setCurrentStep('goals');
        addAssistantMessage(ONBOARDING_PROMPTS.goals, 'sync-prompt');
        // Immediately show the document picker after this step
        setTimeout(() => {
          setShowDocumentPicker(true);
        }, 1000);
        break;
    }

    // Only save to localStorage if not in test mode
    if (!testMode) {
      localStorage.setItem('personalContext', JSON.stringify(personalContext));
    }
  };

  const handleDocumentSync = async (link: string) => {
    addAssistantMessage(
      `I found a Google ${link.includes('/folders/') ? 'Drive folder' : 'Doc'}! Let me sync that for you...`,
      'sync-prompt'
    );

    try {
      // Extract Google Drive IDs from the link
      const extractDriveIds = (input: string) => {
        let folderId: string | undefined;
        let documentId: string | undefined;

        try {
          const url = new URL(input);
          const folderMatch = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
          if (folderMatch) folderId = folderMatch[1];

          const docMatch = url.pathname.match(/\/(?:document|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
          if (docMatch) documentId = docMatch[1];
        } catch {
          if (/^[A-Za-z0-9_-]{10,}$/.test(input)) {
            documentId = input;
          }
        }

        return { folderId, documentId };
      };

      const { folderId, documentId } = extractDriveIds(link);

      // Fetch documents
      const docsResponse = await fetch('/api/fetch-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveFolderId: folderId, documentId: documentId }),
      });

      if (!docsResponse.ok) {
        throw new Error('Failed to fetch documents');
      }

      const { documents: fetchedDocs } = await docsResponse.json();
      
      // Process first document only for onboarding
      if (fetchedDocs && fetchedDocs.length > 0) {
        const doc = fetchedDocs[0];
        
        // Chunk the document
        const chunkResponse = await fetch('/api/chunk-docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: doc.id,
            documentName: doc.name 
          }),
        });

        if (!chunkResponse.ok) {
          throw new Error('Failed to chunk document');
        }

        // Update local storage only if not in test mode
        if (!testMode) {
          const syncedDocs = JSON.parse(localStorage.getItem('syncedDocs') || '[]');
          syncedDocs.push(doc.id);
          localStorage.setItem('syncedDocs', JSON.stringify(syncedDocs));

          // Store in PRDs list
          const prds = JSON.parse(localStorage.getItem('prds') || '[]');
          prds.push({
            title: doc.name,
            url: `https://docs.google.com/document/d/${doc.id}`,
            createdAt: new Date().toISOString(),
            id: doc.id
          });
          localStorage.setItem('prds', JSON.stringify(prds));
        }
      }
      
      setProgress(prev => ({ ...prev, documentSynced: true }));
      
      addAssistantMessage(
        "✅ Document synced successfully! I'll use this to better understand your product context.",
        'sync-prompt'
      );

      // Check if onboarding is complete
      if (progress.teamStrategy && progress.productThinking && progress.goals) {
        setTimeout(() => completeOnboarding(), 1500);
      }
    } catch {
      addAssistantMessage(
        "I couldn't sync that document. Please check the link and try again, or type 'skip' to continue.",
        'sync-prompt'
      );
    }
  };

  const completeOnboarding = () => {
    setCurrentStep('complete');
    
    // Only save to localStorage if not in test mode
    if (!testMode) {
      localStorage.setItem('onboardingComplete', 'true');
    }
    
    addAssistantMessage(ONBOARDING_PROMPTS.complete, 'completion');
    
    // Start the transition animation after showing the completion message
    setTimeout(() => {
      setIsTransitioning(true);
      
      // After the transition animation completes, redirect to main interface
      setTimeout(() => {
        window.location.href = '/';
      }, 2000); // Allow time for transition animation
    }, 2000); // Wait to show the completion message first
  };


  const handleSyncComplete = async (selectedFolders: GoogleDriveFolder[], selectedDocuments: GoogleDriveDocument[]) => {
    // Convert to the format expected by existing sync logic
    const folderItems: GoogleDriveItem[] = selectedFolders.map(folder => ({
      ...folder,
      type: 'folder' as const
    }));
    
    const documentItems: GoogleDriveItem[] = selectedDocuments.map(doc => ({
      ...doc,
      type: 'document' as const
    }));
    
    const allItems = [...folderItems, ...documentItems];
    
    if (allItems.length > 0) {
      await handleSyncRequested(allItems);
    } else {
      // If no items selected, skip this step
      handleSkipDocuments();
    }
  };

  const updateSyncStatus = (itemId: string, status: 'pending' | 'syncing' | 'completed' | 'error', message?: string) => {
    setSyncingItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, syncStatus: status, syncMessage: message }
          : item
      )
    );
  };

  const handleFolderExpanded = (folderId: string, documents: GoogleDriveItem[]) => {
    // Expand folder in state to show its documents
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: {
        documents: documents.map(doc => ({ ...doc, syncStatus: 'pending' as const })),
        expanded: true
      }
    }));
  };

  const handleFolderDocumentStatusUpdate = (folderId: string, docId: string, status: 'pending' | 'syncing' | 'completed' | 'error', message?: string) => {
    // Update specific document status within a folder
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: {
        ...prev[folderId],
        documents: prev[folderId]?.documents.map(doc => 
          doc.id === docId 
            ? { ...doc, syncStatus: status, syncMessage: message }
            : doc
        ) || []
      }
    }));
  };

  const handleSyncRequested = async (selectedItems: GoogleDriveItem[]) => {
    if (selectedItems.length > 0) {
      setIsProcessing(true);
      setSyncingItems(selectedItems.map(item => ({ ...item, syncStatus: 'pending' as const })));
      
      try {
        // Sync selected documents and process folders
        const documents = selectedItems.filter(item => item.type === 'document');
        const folders = selectedItems.filter(item => item.type === 'folder');
        
        // Sync documents with complete workflow tracking
        const syncPromises = documents.map(async (doc) => {
          try {
            // Step 1: Fetch document details (already have it, but following workflow)
            updateSyncStatus(doc.id, 'syncing', 'Fetching document...');
            
            // Step 2: Chunk the document
            updateSyncStatus(doc.id, 'syncing', 'Chunking document...');
            const chunkResponse = await fetch('/api/chunk-docs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                documentId: doc.id,
                documentName: doc.name 
              }),
            });
            
            if (!chunkResponse.ok) {
              throw new Error(`Failed to chunk ${doc.name}`);
            }
            
            const chunksResponse = await chunkResponse.json();
            const chunks = chunksResponse.chunks;
            
            // Step 3: Embed chunks
            updateSyncStatus(doc.id, 'syncing', 'Embedding chunks...');
            
            // Process chunks individually to avoid timeouts
            const embeddedChunksPromises = chunks.map(async (chunk: string) => {
              const embeddedChunk = await fetch('/api/embed-chunks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunks: [chunk], documentId: doc.id }),
              });

              if (!embeddedChunk.ok) {
                throw new Error(`Failed to embed chunk for document: ${doc.id}`);
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
            
            // Step 4: Save to Pinecone
            updateSyncStatus(doc.id, 'syncing', 'Saving to Pinecone...');
            
            const pineconeUpsert = await fetch('/api/pinecone-upsert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                vectors: sanitizedEmbeddings,
                documentId: doc.id 
              }),
            });

            if (!pineconeUpsert.ok) {
              throw new Error(`Failed to upsert to Pinecone: ${doc.id}`);
            }
            
            updateSyncStatus(doc.id, 'completed');
            return doc;
          } catch (error) {
            updateSyncStatus(doc.id, 'error', `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        });

        // Process folders with complete workflow tracking and UI updates
        const folderPromises = folders.map(async (folder) => {
          try {
            // Step 1: Fetch documents from folder
            updateSyncStatus(folder.id, 'syncing', 'Fetching documents from folder...');
            
            const docsResponse = await fetch('/api/fetch-docs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ driveFolderId: folder.id }),
            });
            
            if (!docsResponse.ok) {
              const errorText = await docsResponse.text();
              throw new Error(`Failed to fetch documents from folder ${folder.name}: ${errorText}`);
            }
            
            const { documents: folderDocs } = await docsResponse.json();
            
            // Expand the folder in UI to show found documents
            handleFolderExpanded(folder.id, folderDocs || []);
            updateSyncStatus(folder.id, 'syncing', `Processing ${folderDocs?.length || 0} documents...`);
            
            // Process each document in the folder with complete workflow and individual status tracking
            const folderSyncPromises = (folderDocs || []).map(async (doc: GoogleDriveItem) => {
              try {
                // Step 2: Chunk document
                handleFolderDocumentStatusUpdate(folder.id, doc.id, 'syncing', 'Chunking document...');
                const chunkResponse = await fetch('/api/chunk-docs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    documentId: doc.id,
                    documentName: doc.name 
                  }),
                });
                
                if (!chunkResponse.ok) {
                  throw new Error(`Failed to chunk ${doc.name}`);
                }
                
                const chunksResponse = await chunkResponse.json();
                const chunks = chunksResponse.chunks;
                
                // Step 3: Embed chunks
                handleFolderDocumentStatusUpdate(folder.id, doc.id, 'syncing', 'Embedding chunks...');
                const embeddedChunksPromises = chunks.map(async (chunk: string) => {
                  const embeddedChunk = await fetch('/api/embed-chunks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chunks: [chunk], documentId: doc.id }),
                  });

                  if (!embeddedChunk.ok) {
                    throw new Error(`Failed to embed chunk`);
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
                
                // Step 4: Save to Pinecone
                handleFolderDocumentStatusUpdate(folder.id, doc.id, 'syncing', 'Saving to Pinecone...');
                const pineconeUpsert = await fetch('/api/pinecone-upsert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    vectors: sanitizedEmbeddings,
                    documentId: doc.id 
                  }),
                });

                if (!pineconeUpsert.ok) {
                  throw new Error(`Failed to save to Pinecone`);
                }
                
                // Mark document as completed
                handleFolderDocumentStatusUpdate(folder.id, doc.id, 'completed');
                return doc;
              } catch (error) {
                handleFolderDocumentStatusUpdate(folder.id, doc.id, 'error', error instanceof Error ? error.message : 'Unknown error');
                throw error;
              }
            });
            
            await Promise.all(folderSyncPromises);
            updateSyncStatus(folder.id, 'completed', `All ${folderDocs?.length || 0} documents synced successfully`);
            return folderDocs;
          } catch (error) {
            updateSyncStatus(folder.id, 'error', `Failed to sync folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        });
        
        await Promise.all([...syncPromises, ...folderPromises]);
        
        // Wait a moment to show completed status for all items
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify ALL items are completed before transitioning
        const allCompleted = syncingItems.every(item => item.syncStatus === 'completed');
        
        if (allCompleted) {
          // Update progress and local storage only after all items are completed
          setProgress(prev => ({ ...prev, documentSynced: true }));
          
          if (!testMode) {
            const syncedDocIds = selectedItems.map(item => item.id);
            localStorage.setItem('syncedDocs', JSON.stringify(syncedDocIds));
            
            const prds = selectedItems.map(item => ({
              title: item.name,
              url: item.webViewLink || `https://docs.google.com/document/d/${item.id}`,
              createdAt: new Date().toISOString(),
              id: item.id
            }));
            localStorage.setItem('prds', JSON.stringify(prds));
          }
          
          addAssistantMessage(
            `✅ Successfully synced ${documents.length} document${documents.length === 1 ? '' : 's'} and ${folders.length} folder${folders.length === 1 ? '' : 's'}! All content has been saved to Pinecone and I'm ready to help you build amazing products.`,
            'sync-prompt'
          );
          
          setShowDocumentPicker(false);
          setTimeout(() => completeOnboarding(), 1500);
        } else {
          // If not all items completed, show error for failed items
          const failedItems = syncingItems.filter(item => item.syncStatus === 'error');
          addAssistantMessage(
            `Some items failed to sync: ${failedItems.map(item => item.name).join(', ')}. You can try again later from the settings page.`,
            'sync-prompt'
          );
        }
        
      } catch (error) {
        console.error('Error syncing items:', error);
        addAssistantMessage(
          "I encountered an issue syncing some items. You can try again later from the settings page.",
          'sync-prompt'
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSkipDocuments = () => {
    setShowDocumentPicker(false);
    completeOnboarding();
  };

  const addAssistantMessage = (
    content: string, 
    type?: 'context-prompt' | 'sync-prompt' | 'completion', 
    field?: string
  ) => {
    const message: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata: { type, field }
    };
    setMessages(prev => [...prev, message]);
  };

  const getProgressPercentage = () => {
    const steps = Object.values(progress);
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
  };

  return (
    <div className={`flex flex-col h-screen transition-all duration-2000 ease-in-out ${
      isTransitioning ? 'bg-white' : 'bg-gradient-to-br from-cream to-white'
    }`}>
      {/* Header - transforms from onboarding progress to main app header */}
      <div className={`bg-white/95 backdrop-blur-sm border-b border-poppy-primary/10 px-6 shadow-sm transition-all duration-2000 ease-in-out ${
        isTransitioning ? 'py-4' : 'py-6'
      }`}>
        <div className="max-w-4xl mx-auto">
          {isTransitioning ? (
            /* Main App Header */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🌺</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Poppy</h1>
              </div>
              <div className="text-sm text-gray-600">
                Ready to build amazing products
              </div>
            </div>
          ) : (
            /* Onboarding Header */
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-poppy-primary to-lavender-secondary bg-clip-text text-transparent">
                    Welcome to Poppy 🌺
                  </h1>
                  <p className="text-warm-neutral text-sm mt-1">Your AI-powered product development companion</p>
                </div>
                <div className="text-right max-w-xs">
                  <div className="text-sm font-semibold text-poppy-primary mb-1">🚀 Training Your AI Companion</div>
                  <div className="text-xs text-warm-neutral leading-relaxed">
                    Each step teaches Poppy to think like you - becoming a true force multiplier for your product work
                  </div>
                </div>
              </div>
              <div className="progress-bar mb-4">
                <div 
                  className="progress-bar__fill transition-all duration-700 ease-bounce"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 transition-colors ${progress.teamStrategy ? 'text-sprout-success' : 'text-warm-neutral/40'}`} />
                  <span className={progress.teamStrategy ? 'text-sprout-success font-medium' : 'text-warm-neutral'}>🎯 Your Strategy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 transition-colors ${progress.productThinking ? 'text-sprout-success' : 'text-warm-neutral/40'}`} />
                  <span className={progress.productThinking ? 'text-sprout-success font-medium' : 'text-warm-neutral'}>🧠 Your Thinking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 transition-colors ${progress.goals ? 'text-sprout-success' : 'text-warm-neutral/40'}`} />
                  <span className={progress.goals ? 'text-sprout-success font-medium' : 'text-warm-neutral'}>📋 Your Context</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 transition-colors ${progress.documentSynced ? 'text-sprout-success' : 'text-warm-neutral/40'}`} />
                  <span className={progress.documentSynced ? 'text-sprout-success font-medium' : 'text-warm-neutral'}>📚 Your Docs</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area - transforms during transition */}
      <div className={`flex-1 overflow-y-auto transition-all duration-2000 ease-in-out ${
        isTransitioning ? 'bg-gray-50' : ''
      }`}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {isTransitioning ? (
            /* Transformed Main Chat Interface */
            <div className="flex flex-col items-center justify-center h-full relative">
              {/* Floating celebration particles */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-1/4 w-3 h-3 bg-poppy-primary rounded-full animate-float opacity-40"></div>
                <div className="absolute top-32 right-1/3 w-2 h-2 bg-lavender-secondary rounded-full animate-float-delay-1 opacity-50"></div>
                <div className="absolute top-16 right-1/4 w-4 h-4 bg-sprout-success rounded-full animate-float-delay-2 opacity-30"></div>
                <div className="absolute bottom-32 left-1/3 w-3 h-3 bg-poppy-primary rounded-full animate-float opacity-35"></div>
                <div className="absolute bottom-20 right-1/5 w-2 h-2 bg-lavender-secondary rounded-full animate-float-delay-1 opacity-45"></div>
              </div>

              {/* Success Animation */}
              <div className="text-center mb-8 animate-fade-in relative z-10">
                <div className="w-20 h-20 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-full flex items-center justify-center mx-auto mb-4 animate-celebration shadow-lg">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Welcome to Your Product OS!</h2>
                <p className="text-gray-600">You&apos;ve successfully trained Poppy! I&apos;m ready to help you build amazing products.</p>
              </div>

              {/* Preview of Main Interface */}
              <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 p-6 animate-slide-up relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm">🌺</span>
                  </div>
                  <span className="font-medium text-gray-900">Your AI Product Companion is ready!</span>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 font-medium mb-2">
                    🚀 I now understand your unique approach and can help you:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-poppy-primary rounded-full"></div>
                      Write targeted PRDs that align with your strategy
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-lavender-secondary rounded-full"></div>
                      Generate feature ideas based on your methodology
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-sprout-success rounded-full"></div>
                      Decompose complex initiatives into actionable tasks
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-poppy-primary rounded-full"></div>
                      Provide strategic recommendations using your context
                    </li>
                  </ul>
                </div>
                <div className="text-center text-sm text-gray-500">
                  Redirecting to your personalized workspace...
                </div>
              </div>
            </div>
          ) : (
            /* Original Onboarding Messages */
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-8 py-6 transition-all duration-300 transform hover:scale-[1.02] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-poppy-primary to-poppy-primary-hover text-white shadow-poppy kinetic-button'
                        : 'bg-white/95 backdrop-blur-sm border border-poppy-primary/10 text-gray-800 shadow-md elevation-md'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.content.split('\n').map((line, index) => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <div key={`${message.id}-line-${index}`} className={`font-bold text-lg mb-2 ${
                              message.role === 'user' ? 'text-white' : 'text-poppy-primary'
                            }`}>
                              {line.replace(/\*\*/g, '')}
                            </div>
                          );
                        }
                        return (
                          <div key={`${message.id}-line-${index}`} className="mb-1 leading-relaxed">
                            {line}
                          </div>
                        );
                      })}
                    </div>
                    {message.metadata?.linkDetected && (
                      <div className="mt-4 flex items-center gap-2 text-sm opacity-80 p-3 bg-black/10 rounded-lg">
                        <LinkIcon className="w-4 h-4" />
                        <span>Document link detected</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white/95 backdrop-blur-sm border border-poppy-primary/10 rounded-2xl px-8 py-6 shadow-md">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-poppy-primary" />
                  <span className="text-poppy-primary font-medium">Processing your input...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Document Sync Onboarding */}
          {showDocumentPicker && (
            <div className="flex justify-start mb-6">
              <div className="max-w-6xl w-full">
                <DocumentSyncOnboarding
                  onSyncComplete={handleSyncComplete}
                  onCancel={handleSkipDocuments}
                />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced Input Form - Hidden when document picker is showing or transitioning */}
      {!showDocumentPicker && !isTransitioning && (
        <div className="border-t border-poppy-primary/10 bg-white/95 backdrop-blur-sm shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6">
          {/* Enhanced Content length indicator */}
          {(currentStep === 'welcome' || currentStep === 'teamStrategy' || currentStep === 'productThinking') && input.length > 0 && (
            <div className="mb-6 p-4 rounded-xl os-notification border">
              <div className="flex items-center gap-3 mb-3">
                {contentLength === 'insufficient' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <span className="text-sm text-warning font-semibold">Need more detail - aim for 4-5 paragraphs</span>
                  </>
                )}
                {contentLength === 'good' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-lavender-secondary" />
                    <span className="text-sm text-lavender-secondary font-semibold">Good! Add one more paragraph for best results</span>
                  </>
                )}
                {contentLength === 'excellent' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-sprout-success" />
                    <span className="text-sm text-sprout-success font-semibold">✨ Perfect! Poppy will understand you deeply</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 progress-bar">
                  <div 
                    className={`progress-bar__fill transition-all duration-500 ${
                      contentLength === 'insufficient' ? 'w-1/3' :
                      contentLength === 'good' ? 'w-2/3' :
                      'w-full'
                    }`}
                  />
                </div>
                <span className="text-xs text-warm-neutral font-medium bg-white/50 px-2 py-1 rounded">
                  {input.trim() ? input.split(/\n\s*\n|\n(?=\S)/).filter(p => p.trim().length > 20).length : 0} paragraphs
                </span>
              </div>
            </div>
          )}
          
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setContentLength(assessContentLength(e.target.value));
              }}
              placeholder={
                currentStep === 'goals' && !progress.documentSynced
                  ? "📄 Paste a Google Drive link or type 'skip' to continue..."
                  : currentStep === 'welcome' || currentStep === 'teamStrategy' || currentStep === 'productThinking'
                  ? "✍️ Share your detailed response here (3-5 paragraphs work best)..."
                  : "Type your response..."
              }
              className="w-full rounded-2xl border border-poppy-primary/20 bg-white/95 px-6 py-4 pr-16 text-gray-800 placeholder-warm-neutral/60 focus:border-poppy-primary focus:outline-none focus:ring-4 focus:ring-poppy-primary/10 min-h-[120px] resize-vertical transition-all duration-300 shadow-sm font-sans leading-relaxed"
              disabled={isProcessing || currentStep === 'complete'}
              rows={5}
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing || currentStep === 'complete'}
              className="absolute right-3 top-3 p-2.5 rounded-xl bg-poppy-primary text-white hover:bg-poppy-primary/90 disabled:bg-warm-neutral disabled:cursor-not-allowed transition-smooth elevation-sm"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                  <path d="M2 2l7.586 7.586"/>
                </svg>
              )}
            </button>
          </div>
        </form>
        </div>
      )}
    </div>
  );
}