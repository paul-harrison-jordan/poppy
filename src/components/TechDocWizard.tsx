'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Check, Loader2, ChevronRight, ChevronLeft, Plus, X, ExternalLink, Home, Search } from 'lucide-react';

interface GoogleDriveDocument {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface TechDocQuestion {
  id: string;
  text: string;
  placeholder: string;
}

interface HelpArticlePreview {
  url: string;
  title: string;
  isValid: boolean;
}

type WizardStep = 'select-prd' | 'questions' | 'persona' | 'help-docs' | 'generating' | 'complete';

interface TechDocWizardProps {
  onModeChange?: (mode: 'chat' | 'draft' | 'techdoc' | 'agent' | 'design' | 'feedback') => void;
}

export default function TechDocWizard({ onModeChange }: TechDocWizardProps = {}) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-prd');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PRD Selection State
  const [documents, setDocuments] = useState<GoogleDriveDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<GoogleDriveDocument[]>([]);
  const [selectedPrd, setSelectedPrd] = useState<GoogleDriveDocument | null>(null);
  const [prdContent, setPrdContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [inputMode, setInputMode] = useState<'browse' | 'url'>('browse');
  const documentsPerPage = 10;
  
  // Questions State
  const [questions, setQuestions] = useState<TechDocQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Persona State
  const [personaOutline, setPersonaOutline] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  // Help Docs State
  const [helpUrls, setHelpUrls] = useState<string[]>(['', '', '']);
  const [helpPreviews, setHelpPreviews] = useState<HelpArticlePreview[]>([]);
  const [validatingUrls, setValidatingUrls] = useState(false);
  
  // Generated Doc State
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string>('');
  const [generatedDocTitle, setGeneratedDocTitle] = useState<string>('');

  // Fetch PRDs on mount and when search changes
  useEffect(() => {
    if (currentStep === 'select-prd' && inputMode === 'browse') {
      const debounceTimer = setTimeout(() => {
        fetchPRDs();
      }, searchQuery ? 500 : 0); // Debounce search
      
      return () => clearTimeout(debounceTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, searchQuery, inputMode]);

  // Filter and paginate documents when search or page changes
  useEffect(() => {
    let filtered = documents;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = documents.filter(doc => 
        doc.name.toLowerCase().includes(query)
      );
    }
    
    // Calculate pagination
    const totalPagesCalc = Math.ceil(filtered.length / documentsPerPage);
    
    // Reset to page 1 if current page is beyond available pages
    const safePage = currentPage > totalPagesCalc ? 1 : currentPage;
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
    
    // Apply pagination
    const startIndex = (safePage - 1) * documentsPerPage;
    const endIndex = startIndex + documentsPerPage;
    const paginatedDocs = filtered.slice(startIndex, endIndex);
    
    setFilteredDocuments(paginatedDocs);
  }, [documents, searchQuery, currentPage, documentsPerPage]);


  const fetchPRDs = async (pageToken?: string | null, append: boolean = false) => {
    if (!append) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        pageSize: '50', // Fetch more documents per request
        itemType: 'documents'
      });
      
      if (pageToken) {
        params.append('pageToken', pageToken);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const response = await fetch(`/api/google-drive-browse?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch documents');
      }
      
      // Filter for Google Docs only
      const googleDocs = (result.documents || []).filter((doc: GoogleDriveDocument) => 
        doc.mimeType === 'application/vnd.google-apps.document'
      );
      
      if (append) {
        setDocuments(prev => [...prev, ...googleDocs]);
      } else {
        setDocuments(googleDocs);
      }
      
      setNextPageToken(result.nextPageToken || null);
    } catch (err) {
      console.error('Error fetching PRDs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PRDs');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };
  
  const extractDocIdFromUrl = (url: string): string | null => {
    // Handle various Google Docs URL formats
    const patterns = [
      /\/document\/d\/([a-zA-Z0-9-_]+)/,
      /\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/.*[?&]id=([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If it's not a URL but looks like a doc ID
    if (/^[a-zA-Z0-9-_]+$/.test(url) && url.length > 20) {
      return url;
    }
    
    return null;
  };
  
  const handleUrlSubmit = async () => {
    const docId = extractDocIdFromUrl(urlInput);
    
    if (!docId) {
      setError('Invalid Google Docs URL. Please paste a valid Google Docs link.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First fetch the document content with metadata
      const response = await fetch('/api/get-google-doc-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, includeMetadata: true })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to fetch document');
      }
      
      const { content, metadata } = await response.json();
      
      // Create a document object with actual metadata if available
      const doc: GoogleDriveDocument = {
        id: docId,
        name: metadata?.name || (urlInput.includes('docs.google.com') 
          ? 'Document from URL' 
          : 'Direct Document'),
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: metadata?.webViewLink || (urlInput.includes('docs.google.com') 
          ? urlInput 
          : `https://docs.google.com/document/d/${docId}/edit`),
        modifiedTime: metadata?.modifiedTime
      };
      
      setSelectedPrd(doc);
      setPrdContent(content);
      
      // Generate questions based on PRD
      const questionsResponse = await fetch('/api/tech-doc/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdContent: content,
          prdTitle: doc.name
        })
      });
      
      if (!questionsResponse.ok) {
        throw new Error('Failed to generate questions');
      }
      
      const { questions: generatedQuestions } = await questionsResponse.json();
      setQuestions(generatedQuestions);
      setCurrentStep('questions');
      
    } catch (err) {
      console.error('Error processing URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document from URL');
    } finally {
      setLoading(false);
    }
  };

  const handlePrdSelect = async (doc: GoogleDriveDocument) => {
    setSelectedPrd(doc);
    setLoading(true);
    setError(null);
    
    try {
      // Fetch PRD content
      const response = await fetch('/api/get-google-doc-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: doc.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch PRD content');
      }
      
      const { content } = await response.json();
      setPrdContent(content);
      
      // Generate questions based on PRD
      const questionsResponse = await fetch('/api/tech-doc/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdContent: content,
          prdTitle: doc.name
        })
      });
      
      if (!questionsResponse.ok) {
        throw new Error('Failed to generate questions');
      }
      
      const { questions: generatedQuestions } = await questionsResponse.json();
      setQuestions(generatedQuestions);
      setCurrentStep('questions');
      
    } catch (err) {
      console.error('Error processing PRD:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PRD');
      setSelectedPrd(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionAnswer = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCurrentStep('persona');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...helpUrls];
    newUrls[index] = value;
    setHelpUrls(newUrls);
  };

  const addUrlField = () => {
    setHelpUrls(prev => [...prev, '']);
  };

  const removeUrlField = (index: number) => {
    setHelpUrls(prev => prev.filter((_, i) => i !== index));
    setHelpPreviews(prev => prev.filter(p => p.url !== helpUrls[index]));
  };

  const validateHelpUrls = async () => {
    setValidatingUrls(true);
    setError(null);
    
    const validUrls = helpUrls.filter(url => url.trim() && url.includes('help.klaviyo.com'));
    
    if (validUrls.length === 0) {
      setError('Please provide at least one valid Klaviyo help article URL');
      setValidatingUrls(false);
      return;
    }
    
    try {
      const response = await fetch('/api/tech-doc/validate-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls })
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate URLs');
      }
      
      const { previews } = await response.json();
      setHelpPreviews(previews);
      
      // If all URLs are valid, proceed to generation
      if (previews.every((p: HelpArticlePreview) => p.isValid)) {
        generateTechDoc();
      } else {
        setError('Some URLs could not be validated. Please check and try again.');
      }
    } catch (err) {
      console.error('Error validating URLs:', err);
      setError('Failed to validate help article URLs');
    } finally {
      setValidatingUrls(false);
    }
  };

  const generateTechDoc = async () => {
    setCurrentStep('generating');
    setError(null);
    
    try {
      const validUrls = helpUrls.filter(url => url.trim() && url.includes('help.klaviyo.com'));
      
      // Step 1: Scrape help articles
      const scrapeResponse = await fetch('/api/tech-doc/scrape-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpUrls: validUrls })
      });
      
      if (!scrapeResponse.ok) {
        throw new Error('Failed to scrape help articles');
      }
      
      const { styleGuide, helpExamples } = await scrapeResponse.json();
      
      // Step 2: Search vector database for context
      let vectorContext = '';
      try {
        // Use PRD content as search query for better context matching
        const searchResponse = await fetch('/api/assistant-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: prdContent,
            useCase: 'tech-doc'
          })
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.matchedContext && Array.isArray(searchData.matchedContext)) {
            vectorContext = searchData.matchedContext
              .slice(0, 3)
              .map((r: { content?: string; metadata?: { text?: string } }) => r.content || r.metadata?.text || '')
              .filter(Boolean)
              .join('\n\n');
          }
        }
      } catch (error) {
        console.warn('Vector search failed, continuing without context:', error);
      }
      
      // Step 3: Fetch team terms and generate content
      const teamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}');
      
      const generateResponse = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tech-doc',
          title: selectedPrd?.name || '',
          query: prdContent,
          questions: questions.map(q => q.text),
          questionAnswers: questions.map(q => ({
            question: q.text,
            answer: answers[q.id] || ''
          })),
          additionalContext: vectorContext,
          teamTerms,
          prdContent,
          styleGuide,
          helpExamples,
          personaOutline,
          customPrompt
        })
      });
      
      if (!generateResponse.ok) {
        throw new Error('Failed to generate tech documentation content');
      }
      
      // Stream the response to get the generated content
      const reader = generateResponse.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      let generatedContent = '';
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        generatedContent += decoder.decode(value, { stream: true });
      }
      
      if (!generatedContent) {
        throw new Error('No content generated');
      }
      
      // Step 4: Review and improve with persona if provided
      let finalContent = generatedContent;
      if (personaOutline.trim()) {
        try {
          const reviewResponse = await fetch('/api/tech-doc/review-persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draftContent: generatedContent,
              personaOutline,
              featureName: selectedPrd?.name || 'Feature',
              customPrompt
            })
          });
          
          if (reviewResponse.ok) {
            const { reviewedContent } = await reviewResponse.json();
            if (reviewedContent) {
              finalContent = reviewedContent;
            }
          }
        } catch (error) {
          console.warn('Persona review failed, using original content:', error);
        }
      }
      
      // Step 5: Create Google Doc and save
      const docResponse = await fetch('/api/tech-doc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdTitle: selectedPrd?.name,
          prdUrl: selectedPrd?.webViewLink,
          generatedContent: finalContent
        })
      });
      
      if (!docResponse.ok) {
        throw new Error('Failed to create Google document');
      }
      
      const { docUrl, docTitle } = await docResponse.json();
      setGeneratedDocUrl(docUrl);
      setGeneratedDocTitle(docTitle);
      setCurrentStep('complete');
      
    } catch (err) {
      console.error('Error generating tech doc:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
      setCurrentStep('help-docs');
    }
  };


  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : '';

  const handleGoHome = () => {
    localStorage.setItem('currentChatMode', 'draft');
    onModeChange?.('draft');
    // Dispatch event for other components listening to mode changes
    window.dispatchEvent(new CustomEvent('chatModeChange'));
  };

  return (
    <div className="flex flex-col h-screen relative bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Home Button - Fixed Position */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={handleGoHome}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 hover:bg-white hover:shadow-md transition-all duration-200 font-medium text-sm"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
      </div>

      {/* Messages area - Chat-like layout */}
      <div className="flex-1 overflow-y-auto relative flex flex-col" style={{ paddingBottom: '80px' }}>
        <div className="flex-1 flex flex-col justify-end px-6">
          <div className="w-full max-w-4xl mx-auto">
            <div className="py-8">
              {/* Header Message Block */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 via-yellow-100 to-orange-200 rounded-full mb-4 shadow-lg">
                  <FileText className="w-8 h-8 text-poppy" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Technical Documentation Wizard
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Transform your PRD into comprehensive technical documentation with AI assistance
                </p>
              </div>

              {/* Progress Indicator - Chat-like */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {['select-prd', 'questions', 'persona', 'help-docs', 'generating', 'complete'].map((step, index) => {
                    const isActive = step === currentStep;
                    const isCompleted = ['select-prd', 'questions', 'persona', 'help-docs', 'generating', 'complete'].indexOf(currentStep) > index;
                    
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                          isActive ? 'bg-poppy text-white shadow-lg' : 
                          isCompleted ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                        </div>
                        {index < 5 && (
                          <div className={`w-12 h-1 mx-1 rounded-full transition-all ${
                            isCompleted ? 'bg-green-200' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Content - Chat-like Message Blocks */}
              <div className="space-y-6">
                {/* Step 1: Select PRD */}
                {currentStep === 'select-prd' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Select a PRD to document
                      </h2>
                    </div>
                    
                    {/* Tab switcher for Browse vs URL input */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setInputMode('browse')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          inputMode === 'browse' 
                            ? 'bg-poppy text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Browse Drive
                      </button>
                      <button
                        onClick={() => setInputMode('url')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          inputMode === 'url' 
                            ? 'bg-poppy text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Paste URL
                      </button>
                    </div>
                    
                    {inputMode === 'url' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Paste your Google Docs URL
                          </label>
                          <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://docs.google.com/document/d/..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Paste any Google Docs URL or document ID
                          </p>
                        </div>
                        {error && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                            <div className="flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {error}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleUrlSubmit}
                          disabled={!urlInput.trim() || loading}
                          className="w-full px-6 py-3 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Continue with this document
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <>
                        {loading && documents.length === 0 ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-3 text-gray-600">
                              <Loader2 className="w-5 h-5 animate-spin text-poppy" />
                              <span>Loading your PRDs...</span>
                            </div>
                          </div>
                        ) : error ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                            <div className="flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {error}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Search Bar */}
                            <div className="mb-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search all your Google Docs..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                                />
                              </div>
                              {searchQuery && (
                                <p className="text-sm text-gray-500 mt-2">
                                  Searching across all your documents...
                                </p>
                              )}
                            </div>

                        {/* Document List */}
                        <div className="space-y-2 mb-4">
                          {filteredDocuments.length > 0 ? (
                            filteredDocuments.map(doc => (
                              <button
                                key={doc.id}
                                onClick={() => handlePrdSelect(doc)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all text-left group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-poppy group-hover:text-white transition-all">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{doc.name}</div>
                                    {doc.modifiedTime && (
                                      <div className="text-sm text-gray-500">
                                        Modified: {new Date(doc.modifiedTime).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-poppy transition-colors" />
                              </button>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>{searchQuery ? 'No PRDs match your search' : 'No PRDs found'}</p>
                            </div>
                          )}
                        </div>

                            {/* Load More Button */}
                            {nextPageToken && (
                              <div className="flex justify-center pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => fetchPRDs(nextPageToken, true)}
                                  disabled={isLoadingMore}
                                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                >
                                  {isLoadingMore ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      Load more documents
                                      <ChevronRight className="w-4 h-4" />
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {documents.length > 0 && (
                              <div className="text-center text-sm text-gray-500 pt-2">
                                Showing {filteredDocuments.length} of {documents.length} documents
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Step 2: Answer Questions */}
                {currentStep === 'questions' && currentQuestion && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">{currentQuestionIndex + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Question {currentQuestionIndex + 1} of {questions.length}
                        </h2>
                        <p className="text-sm text-gray-500">{selectedPrd?.name}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-lg font-medium text-gray-900 mb-4">
                        {currentQuestion.text}
                      </label>
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => handleQuestionAnswer(e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="flex justify-between">
                      <button
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <button
                        onClick={handleNextQuestion}
                        disabled={!currentAnswer.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {currentQuestionIndex === questions.length - 1 ? 'Continue' : 'Next'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Persona Definition */}
                {currentStep === 'persona' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Define Your Target Persona
                        </h2>
                        <p className="text-sm text-gray-600">
                          Help us tailor the documentation to your primary audience
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-base font-medium text-gray-900 mb-2">
                          Primary Persona Outline
                        </label>
                        <textarea
                          value={personaOutline}
                          onChange={(e) => setPersonaOutline(e.target.value)}
                          placeholder="Example: Marketing Manager at a mid-size e-commerce company (500-1000 employees). Has 3-5 years experience with email marketing but new to Klaviyo. Primary goals: increase email revenue, improve segmentation, and reduce time spent on campaign creation. Pain points: limited technical knowledge, needs clear step-by-step guidance, worried about deliverability issues."
                          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Include role, experience level, goals, and pain points
                        </p>
                      </div>

                      <div>
                        <label className="block text-base font-medium text-gray-900 mb-2">
                          Additional Context (Optional)
                        </label>
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Any specific focus areas or requirements? For example: 'Focus on compliance and GDPR considerations' or 'Include more technical API details'"
                          className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Persona Templates */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setPersonaOutline('E-commerce Marketing Manager: 2-3 years email experience, manages campaigns for online retail. Goals: increase AOV, reduce cart abandonment, improve customer retention. Challenges: limited dev resources, needs pre-built solutions.')}
                            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-xs hover:bg-gray-100 transition-colors"
                          >
                            E-commerce Manager
                          </button>
                          <button
                            onClick={() => setPersonaOutline('Agency Account Manager: Manages multiple client accounts, experienced with various ESPs. Goals: quick client onboarding, scalable workflows, white-label solutions. Challenges: managing multiple brands, proving ROI to clients.')}
                            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-xs hover:bg-gray-100 transition-colors"
                          >
                            Agency Manager
                          </button>
                          <button
                            onClick={() => setPersonaOutline('Technical Implementation Lead: Developer background, responsible for integrations. Goals: API efficiency, data accuracy, custom solutions. Challenges: complex data flows, maintaining performance at scale.')}
                            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-xs hover:bg-gray-100 transition-colors"
                          >
                            Technical Lead
                          </button>
                          <button
                            onClick={() => setPersonaOutline('Small Business Owner: Limited marketing experience, wearing multiple hats. Goals: simple automation, cost-effective solutions, quick wins. Challenges: time constraints, learning curve, budget limitations.')}
                            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-xs hover:bg-gray-100 transition-colors"
                          >
                            Small Business Owner
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        onClick={() => setCurrentStep('questions')}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep('help-docs')}
                        disabled={!personaOutline.trim()}
                        className="px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Help Documentation URLs */}
                {currentStep === 'help-docs' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Add Reference Documentation
                        </h2>
                        <p className="text-sm text-gray-600">
                          Provide 2-3 help articles that show how similar features are documented
                        </p>
                      </div>
                    </div>

            <div className="space-y-3">
              {helpUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder="https://help.klaviyo.com/..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                  />
                  {helpUrls.length > 1 && (
                    <button
                      onClick={() => removeUrlField(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {helpPreviews.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-gray-900 mb-2">Article Previews:</h3>
                {helpPreviews.map((preview, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {preview.isValid ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">{preview.title}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

                    <div className="flex justify-between items-center">
                      <button
                        onClick={addUrlField}
                        className="flex items-center gap-2 text-poppy hover:text-poppy/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add another URL
                      </button>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setCurrentStep('persona')}
                          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={validateHelpUrls}
                          disabled={validatingUrls || !helpUrls.some(url => url.trim())}
                          className="px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm"
                        >
                          {validatingUrls ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            'Generate Documentation'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Generating */}
                {currentStep === 'generating' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-100 via-yellow-100 to-orange-200 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-poppy" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                          Generating Technical Documentation
                        </h2>
                        <p className="text-gray-600">
                          Analyzing PRD and reference documentation...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Complete */}
                {currentStep === 'complete' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          Documentation Complete!
                        </h2>
                        <p className="text-gray-600 mb-6">
                          Your technical documentation has been created and saved to Google Docs
                        </p>
                        <div className="space-y-4">
                          <a
                            href={generatedDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-poppy text-white rounded-lg hover:bg-poppy/90 transition-all shadow-sm"
                          >
                            <ExternalLink className="w-5 h-5" />
                            View Documentation
                          </a>
                          <div className="text-sm text-gray-500">
                            {generatedDocTitle}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setCurrentStep('select-prd');
                            setSelectedPrd(null);
                            setQuestions([]);
                            setAnswers({});
                            setPersonaOutline('');
                            setCustomPrompt('');
                            setHelpUrls(['', '', '']);
                            setHelpPreviews([]);
                            setSearchQuery('');
                            setCurrentPage(1);
                            setUrlInput('');
                            setInputMode('browse');
                            setDocuments([]);
                            setNextPageToken(null);
                          }}
                          className="mt-6 text-poppy hover:text-poppy/80 transition-colors"
                        >
                          Create Another Documentation
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}