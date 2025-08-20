import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, FileText, Paintbrush, Bot, MessageSquare, TrendingUp } from 'lucide-react';
import CompetitorAnalysisCard from './CompetitorAnalysisCard';

type ChatMode = 'chat' | 'draft' | 'techdoc' | 'agent' | 'design' | 'feedback' | 'competitive';
type DraftStep = 'initial' | 'vocabulary' | 'questions' | 'content';

interface CompetitorAnalysis {
  name: string;
  summary: string;
  ourEdge: string;
  sourceUrl?: string;
  features?: string[];
  insights?: Array<{
    feature: string;
    description: string;
    customerBenefit: string;
    implementationHints: string;
    confidence: number;
    sourceUrl: string;
    keySection: string;
  }>;
}

interface ChatInputProps {
  input: string;
  loading: boolean;
  mode: ChatMode;
  draftStep?: DraftStep;
  currentQuestionIndex?: number;
  questions?: Array<{ text: string }>;
  currentTermIndex?: number;
  teamTerms?: Array<{ term: string }>;
  competitorUrls?: string[];
  competitorAnalysis?: CompetitorAnalysis[];
  showStartPrdButton?: boolean;
  agenticMessages?: Array<{
    prdTitle: string;
    openQuestions: string[];
  }>;
  showBounce?: boolean;
  competitiveUrls?: string[];
  showCompetitiveUrlInput?: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onModeChange: (mode: ChatMode) => void;
  onSummarizeAndSave?: () => void;
  onOpenAgentMode?: () => void;
  onCompetitorUrlsChange?: (urls: string[]) => void;
  onCompetitiveUrlsChange?: (urls: string[]) => void;
  onCompetitiveAnalyze?: () => void;
}

export default function ChatInput({
  input,
  loading,
  mode,
  draftStep = 'initial',
  currentQuestionIndex = -1,
  questions = [],
  currentTermIndex = -1,
  teamTerms = [],
  competitorUrls = [''],
  competitorAnalysis = [],
  showStartPrdButton = false,
  agenticMessages = [],
  showBounce = false,
  competitiveUrls = [''],
  showCompetitiveUrlInput = false,
  onInputChange,
  onSubmit,
  onModeChange,
  onSummarizeAndSave,
  onOpenAgentMode,
  onCompetitorUrlsChange,
  onCompetitiveUrlsChange,
  onCompetitiveAnalyze
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false);

  // Animated placeholders based on mode
  const getPlaceholders = useCallback(() => {
    switch (mode) {
      case 'draft':
        if (draftStep === 'questions') {
          return [`Answer question ${currentQuestionIndex + 1} of ${questions.length}...`];
        } else if (draftStep === 'vocabulary') {
          return [`Define term ${currentTermIndex + 1} of ${teamTerms.length}...`];
        }
        return [
          "Draft a PRD for a mobile checkout feature...",
          "Create specs for user authentication system...",
          "Document requirements for analytics dashboard...",
          "Share your product idea and context..."
        ];
      case 'techdoc':
        return [
          "Create documentation for checkout flow...",
          "Document API integration requirements...",
          "Generate user guide from PRD...",
          "Transform PRD into technical docs..."
        ];
      case 'design':
        return [
          "Create a design for dashboard analytics...",
          "Design a mobile-first checkout flow...",
          "Prototype the user profile settings...",
          "Describe design changes you'd like..."
        ];
      case 'feedback':
        return [
          "Find customer feedback about search functionality...",
          "Search for complaints about checkout process...",
          "Look for requests about mobile app features...",
          "Describe a feature or pain point to search..."
        ];
      case 'competitive':
        return [
          "Analyze how Slack handles workflow automation...",
          "Research Notion's collaboration features...",
          "Compare Asana's project management approach...",
          "Enter a help docs URL and describe what to research..."
        ];
      default:
        return [
          "Ask me anything about product management...",
          "Get help with roadmap planning...",
          "Discuss user research insights...",
          "Message Poppy about your product needs..."
        ];
    }
  }, [mode, draftStep, currentQuestionIndex, questions.length, currentTermIndex, teamTerms.length]);

  // Cycle through placeholders
  useEffect(() => {
    if (input.trim()) return; // Don't animate if user is typing
    
    const placeholders = getPlaceholders();
    if (placeholders.length <= 1) {
      setCurrentPlaceholder(placeholders[0] || '');
      return;
    }

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [mode, input, getPlaceholders]);

  // Update current placeholder when index changes
  useEffect(() => {
    const placeholders = getPlaceholders();
    setCurrentPlaceholder(placeholders[placeholderIndex] || placeholders[0] || '');
  }, [placeholderIndex, getPlaceholders]);

  // Auto-focus the textarea when component mounts or when input is cleared
  useEffect(() => {
    if (textareaRef.current && !loading) {
      textareaRef.current.focus();
      // Reset height when input is cleared (after message sent)
      if (!input.trim()) {
        textareaRef.current.style.height = '56px';
      }
    }
  }, [loading, mode, input]);


  // Calculate progress for draft mode
  const getDraftProgress = () => {
    if (mode !== 'draft') return { percent: 0, step: '', show: false };
    
    switch (draftStep) {
      case 'initial':
        return { percent: 0, step: 'Starting', show: true };
      case 'vocabulary':
        const vocabProgress = teamTerms.length > 0 ? ((currentTermIndex + 1) / teamTerms.length) * 30 : 0;
        return { percent: vocabProgress, step: `Defining terms (${currentTermIndex + 1}/${teamTerms.length})`, show: true };
      case 'questions':
        const questionProgress = questions.length > 0 ? 30 + ((currentQuestionIndex + 1) / questions.length) * 60 : 30;
        return { percent: questionProgress, step: `Questions (${currentQuestionIndex + 1}/${questions.length})`, show: true };
      case 'content':
        return { percent: 95, step: 'Generating PRD...', show: true };
      default:
        return { percent: 0, step: '', show: false };
    }
  };

  const progress = getDraftProgress();

  const renderModeButtons = () => (
    <>
      <button
        type="button"
        onClick={() => onModeChange('techdoc')}
        className={`px-space-3 py-space-2 text-sm rounded-xl transition-smooth flex flex-col items-center gap-1 group ${
          mode === 'techdoc' 
            ? 'bg-gradient-to-br from-poppy-primary to-poppy-primary/80 text-white elevation-sm' 
            : 'text-warm-neutral hover:text-poppy-primary hover:bg-poppy-primary/5 border border-border hover:border-poppy-primary/30'
        }`}
      >
        <FileText className={`w-4 h-4 ${mode === 'techdoc' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Tech Docs</div>
          <div className="text-xs opacity-75">PRD → Docs</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('draft')}
        className={`px-space-3 py-space-2 text-sm rounded-xl transition-smooth flex flex-col items-center gap-1 group ${
          mode === 'draft' 
            ? 'bg-gradient-to-br from-poppy-primary to-poppy-primary/80 text-white elevation-sm' 
            : 'text-warm-neutral hover:text-poppy-primary hover:bg-poppy-primary/5 border border-border hover:border-poppy-primary/30'
        }`}
      >
        <FileText className={`w-4 h-4 ${mode === 'draft' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Draft PRD</div>
          <div className="text-xs opacity-75">Structure ideas</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('design')}
        className={`px-space-3 py-space-2 text-sm rounded-xl transition-smooth flex flex-col items-center gap-1 group ${
          mode === ('design' as ChatMode) 
            ? 'bg-gradient-to-br from-poppy-primary to-poppy-primary/80 text-white elevation-sm' 
            : 'text-warm-neutral hover:text-poppy-primary hover:bg-poppy-primary/5 border border-border hover:border-poppy-primary/30'
        }`}
      >
        <Paintbrush className={`w-4 h-4 ${mode === 'design' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Design</div>
          <div className="text-xs opacity-75">Create UI</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('feedback')}
        className={`px-space-3 py-space-2 text-sm rounded-xl transition-smooth flex flex-col items-center gap-1 group ${
          mode === 'feedback' 
            ? 'bg-gradient-to-br from-poppy-primary to-poppy-primary/80 text-white elevation-sm' 
            : 'text-warm-neutral hover:text-poppy-primary hover:bg-poppy-primary/5 border border-border hover:border-poppy-primary/30'
        }`}
      >
        <MessageSquare className={`w-4 h-4 ${mode === 'feedback' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Feedback</div>
          <div className="text-xs opacity-75">Search customers</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('competitive')}
        className={`px-space-3 py-space-2 text-sm rounded-xl transition-smooth flex flex-col items-center gap-1 group ${
          mode === 'competitive' 
            ? 'bg-gradient-to-br from-poppy-primary to-poppy-primary/80 text-white elevation-sm' 
            : 'text-warm-neutral hover:text-poppy-primary hover:bg-poppy-primary/5 border border-border hover:border-poppy-primary/30'
        }`}
      >
        <TrendingUp className={`w-4 h-4 ${mode === 'competitive' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Competitive</div>
          <div className="text-xs opacity-75">Research rivals</div>
        </div>
      </button>
      {/* Agentic (Bot) button: show if agentic messages exist or in agent mode */}
      {(agenticMessages.length > 0 || mode === 'agent') && onOpenAgentMode && (
        <button
          type="button"
          className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
            mode === 'agent' 
              ? 'bg-orange-500 text-white' 
              : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
          } ${showBounce ? 'animate-pulse' : ''}`}
          title="Poppy has a suggestion!"
          onClick={onOpenAgentMode}
        >
          <Bot className="w-3 h-3" />
          Agent
        </button>
      )}
    </>
  );


  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        {/* Main input area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full p-space-4 pr-12 rounded-xl border border-border resize-none focus:ring-2 focus:ring-poppy-primary focus:border-poppy-primary outline-none text-base placeholder-warm-neutral min-h-[56px] max-h-32 bg-white elevation-sm transition-smooth"
            value={input}
            onChange={e => onInputChange(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={loading}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '56px';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-poppy-primary text-white hover:bg-poppy-primary/90 disabled:bg-warm-neutral disabled:cursor-not-allowed transition-smooth elevation-sm"
          >
            {loading ? (
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
        
        {/* Competitor Analysis Input - Only show in draft mode initial step */}
        {mode === 'draft' && draftStep === 'initial' && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowCompetitorAnalysis(!showCompetitorAnalysis)}
              className="text-sm text-poppy-primary hover:text-poppy-primary/80 flex items-center gap-2 transition-smooth"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showCompetitorAnalysis ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Analyze competitor solutions (optional)
            </button>
            
            {showCompetitorAnalysis && (
              <div className="mt-3 space-y-3 p-4 bg-white/50 rounded-xl border border-border">
                <p className="text-xs text-warm-neutral">
                  Add competitor help documentation URLs to see how they solve similar problems
                </p>
                {competitorUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        if (onCompetitorUrlsChange) {
                          const newUrls = [...competitorUrls];
                          newUrls[index] = e.target.value;
                          onCompetitorUrlsChange(newUrls);
                        }
                      }}
                      placeholder="https://help.competitor.com"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:border-poppy-primary focus:outline-none focus:ring-1 focus:ring-poppy-primary/20 transition-smooth"
                    />
                    {competitorUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onCompetitorUrlsChange) {
                            const newUrls = competitorUrls.filter((_, i) => i !== index);
                            onCompetitorUrlsChange(newUrls);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1 transition-smooth"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {competitorUrls.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCompetitorUrlsChange) {
                        onCompetitorUrlsChange([...competitorUrls, '']);
                      }
                    }}
                    className="text-xs text-poppy-primary hover:text-poppy-primary/80 transition-smooth"
                  >
                    + Add another competitor
                  </button>
                )}
                
              </div>
            )}
            
            {/* Competitive Analysis Results */}
            {competitorAnalysis && competitorAnalysis.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-800">Analysis Results</h4>
                {competitorAnalysis.map((competitor, index) => (
                  <CompetitorAnalysisCard
                    key={index}
                    competitor={competitor}
                    isExpanded={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Competitive URL Input Cards */}
        {mode === 'competitive' && showCompetitiveUrlInput && (
          <div className="mt-4 p-6 bg-white/70 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-warm-neutral">Competitor Help Desk URLs</h3>
              <button
                type="button"
                onClick={() => {
                  if (onCompetitiveUrlsChange && competitiveUrls.length < 5) {
                    onCompetitiveUrlsChange([...competitiveUrls, '']);
                  }
                }}
                disabled={competitiveUrls.length >= 5}
                className="px-3 py-1.5 text-sm bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                + Add URL
              </button>
            </div>
            
            <div className="grid gap-3">
              {competitiveUrls.map((url, index) => (
                <div key={index} className="bg-white rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-warm-neutral">
                      Competitor {index + 1}
                    </label>
                    {competitiveUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onCompetitiveUrlsChange) {
                            const newUrls = competitiveUrls.filter((_, i) => i !== index);
                            onCompetitiveUrlsChange(newUrls);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1 transition-smooth"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      if (onCompetitiveUrlsChange) {
                        const newUrls = [...competitiveUrls];
                        newUrls[index] = e.target.value;
                        onCompetitiveUrlsChange(newUrls);
                      }
                    }}
                    placeholder="https://help.competitor.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:border-poppy-primary focus:outline-none focus:ring-2 focus:ring-poppy-primary/20 transition-smooth"
                  />
                  {url && url.startsWith('http') && (
                    <div className="text-xs text-warm-neutral/70">
                      Will search: {new URL(url).hostname}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-warm-neutral/70">
                Add competitor help desk URLs to analyze their documentation
              </p>
              <button
                type="button"
                onClick={onCompetitiveAnalyze}
                disabled={!competitiveUrls.some(url => url.trim() !== '')}
                className="px-4 py-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium"
              >
                Analyze Competitors
              </button>
            </div>
          </div>
        )}
        
        {/* Mode selector - horizontal tabs */}
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-5 gap-2 flex-1 max-w-4xl">
            {renderModeButtons()}
          </div>
          
          {/* Progress indicator for draft mode */}
          {progress.show && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-xs text-warm-neutral font-medium truncate">
                  {progress.step}
                </div>
                <div className="flex-shrink-0">
                  <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-poppy-primary rounded-full transition-smooth"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-warm-neutral font-mono">
                  {Math.round(progress.percent)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Show PRD button in draft mode */}
      {showStartPrdButton && mode === 'draft' && onSummarizeAndSave && (
        <div className="fixed bottom-space-6 right-space-6 z-50">
          <button
            type="button"
            className="px-space-4 py-space-2 rounded-xl bg-poppy-primary text-white font-medium text-sm hover:bg-poppy-primary/90 transition-smooth elevation-lg flex items-center gap-2"
            onClick={onSummarizeAndSave}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4" />
            Start PRD Draft
          </button>
        </div>
      )}
    </div>
  );
}