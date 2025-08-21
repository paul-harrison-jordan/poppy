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

type WizardStep = 'select-prd' | 'questions' | 'help-docs' | 'generating' | 'complete';

interface TechDocWizardProps {
  onModeChange?: (mode: 'chat' | 'draft' | 'techdoc' | 'agent' | 'design' | 'feedback' | 'competitive') => void;
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
  const [totalPages, setTotalPages] = useState(1);
  const documentsPerPage = 10;
  
  // Questions State
  const [questions, setQuestions] = useState<TechDocQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Help Docs State
  const [helpUrls, setHelpUrls] = useState<string[]>(['', '', '']);
  const [helpPreviews, setHelpPreviews] = useState<HelpArticlePreview[]>([]);
  const [validatingUrls, setValidatingUrls] = useState(false);
  
  // Generated Doc State
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string>('');
  const [generatedDocTitle, setGeneratedDocTitle] = useState<string>('');

  // Fetch PRDs on mount
  useEffect(() => {
    if (currentStep === 'select-prd') {
      fetchPRDs();
    }
  }, [currentStep]);

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
    const totalPages = Math.ceil(filtered.length / documentsPerPage);
    setTotalPages(totalPages);
    
    // Reset to page 1 if current page is beyond available pages
    const safePage = currentPage > totalPages ? 1 : currentPage;
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
    
    // Apply pagination
    const startIndex = (safePage - 1) * documentsPerPage;
    const endIndex = startIndex + documentsPerPage;
    const paginatedDocs = filtered.slice(startIndex, endIndex);
    
    setFilteredDocuments(paginatedDocs);
  }, [documents, searchQuery, currentPage, documentsPerPage]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const fetchPRDs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        pageSize: '20',
        itemType: 'documents'
      });
      
      const response = await fetch(`/api/google-drive-browse?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch documents');
      }
      
      // Filter for Google Docs only
      const googleDocs = (result.documents || []).filter((doc: GoogleDriveDocument) => 
        doc.mimeType === 'application/vnd.google-apps.document'
      );
      
      setDocuments(googleDocs);
    } catch (err) {
      console.error('Error fetching PRDs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PRDs');
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
      setCurrentStep('help-docs');
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
          helpExamples
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
      
      // Step 4: Create Google Doc and save
      const docResponse = await fetch('/api/tech-doc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdTitle: selectedPrd?.name,
          prdUrl: selectedPrd?.webViewLink,
          generatedContent
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
                  {['select-prd', 'questions', 'help-docs', 'generating', 'complete'].map((step, index) => {
                    const isActive = step === currentStep;
                    const isCompleted = ['select-prd', 'questions', 'help-docs', 'generating', 'complete'].indexOf(currentStep) > index;
                    
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                          isActive ? 'bg-poppy text-white shadow-lg' : 
                          isCompleted ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                        </div>
                        {index < 4 && (
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
                    
                    {loading ? (
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
                              placeholder="Search PRDs by name..."
                              value={searchQuery}
                              onChange={(e) => handleSearchChange(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-transparent"
                            />
                          </div>
                          {searchQuery && (
                            <p className="text-sm text-gray-500 mt-2">
                              {documents.filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase())).length} results found
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            <div className="text-sm text-gray-600">
                              Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Previous
                              </button>
                              
                              {/* Page Numbers */}
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = currentPage - 2 + i;
                                  }
                                  
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => handlePageChange(pageNum)}
                                      className={`px-3 py-1 text-sm rounded transition-colors ${
                                        pageNum === currentPage
                                          ? 'bg-poppy text-white'
                                          : 'border border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Next
                              </button>
                            </div>
                          </div>
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

                {/* Step 3: Help Documentation URLs */}
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
                          onClick={() => setCurrentStep('questions')}
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
                            setHelpUrls(['', '', '']);
                            setHelpPreviews([]);
                            setSearchQuery('');
                            setCurrentPage(1);
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