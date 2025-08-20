'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Check, Loader2, ChevronRight, ChevronLeft, Plus, X, ExternalLink } from 'lucide-react';

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

export default function TechDocWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-prd');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PRD Selection State
  const [documents, setDocuments] = useState<GoogleDriveDocument[]>([]);
  const [selectedPrd, setSelectedPrd] = useState<GoogleDriveDocument | null>(null);
  const [prdContent, setPrdContent] = useState<string>('');
  
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

  const getStepProgress = () => {
    switch (currentStep) {
      case 'select-prd': return 20;
      case 'questions': return 40;
      case 'help-docs': return 60;
      case 'generating': return 80;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : '';

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-5xl font-semibold text-primary tracking-tight">
          Technical Documentation <span className="text-poppy">Wizard</span>
        </h1>
        <p className="text-lg text-primary/80 mt-2">
          Transform your PRD into comprehensive technical documentation
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-poppy to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span className={currentStep === 'select-prd' ? 'text-poppy font-semibold' : ''}>
            Select PRD
          </span>
          <span className={currentStep === 'questions' ? 'text-poppy font-semibold' : ''}>
            Answer Questions
          </span>
          <span className={currentStep === 'help-docs' ? 'text-poppy font-semibold' : ''}>
            Reference Docs
          </span>
          <span className={currentStep === 'generating' ? 'text-poppy font-semibold' : ''}>
            Generate
          </span>
          <span className={currentStep === 'complete' ? 'text-poppy font-semibold' : ''}>
            Complete
          </span>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Step 1: Select PRD */}
        {currentStep === 'select-prd' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Select a PRD to document
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-poppy" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            ) : (
              <div className="grid gap-3">
                {documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handlePrdSelect(doc)}
                    className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-poppy hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">{doc.name}</div>
                        {doc.modifiedTime && (
                          <div className="text-sm text-gray-500">
                            Modified: {new Date(doc.modifiedTime).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Answer Questions */}
        {currentStep === 'questions' && currentQuestion && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <span className="text-sm text-gray-500">
                {selectedPrd?.name}
              </span>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
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
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={!currentAnswer.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Continue' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Help Documentation URLs */}
        {currentStep === 'help-docs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Add Klaviyo Help Articles for Style Reference
              </h2>
              <p className="text-gray-600">
                Provide 2-3 help articles that show how Klaviyo documents similar features
              </p>
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
                className="flex items-center gap-2 text-poppy hover:text-poppy/80"
              >
                <Plus className="w-4 h-4" />
                Add another URL
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('questions')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
                <button
                  onClick={validateHelpUrls}
                  disabled={validatingUrls || !helpUrls.some(url => url.trim())}
                  className="px-6 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="w-12 h-12 animate-spin text-poppy" />
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Generating Technical Documentation
              </h2>
              <p className="text-gray-600">
                Analyzing PRD and reference documentation...
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Documentation Complete!
              </h2>
              <p className="text-gray-600 mb-6">
                Your technical documentation has been created and saved to Google Docs
              </p>
              <div className="space-y-3">
                <a
                  href={generatedDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-poppy text-white rounded-lg hover:bg-poppy/90"
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
                }}
                className="mt-6 text-poppy hover:text-poppy/80"
              >
                Create Another Documentation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}