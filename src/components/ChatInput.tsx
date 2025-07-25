import React, { useRef, useEffect } from 'react';
import { Sparkles, FileText, Paintbrush, Bot, MessageSquare } from 'lucide-react';

type ChatMode = 'chat' | 'draft' | 'brainstorm' | 'agent' | 'design' | 'feedback';
type DraftStep = 'initial' | 'vocabulary' | 'questions' | 'content';

interface ChatInputProps {
  input: string;
  loading: boolean;
  mode: ChatMode;
  draftStep?: DraftStep;
  currentQuestionIndex?: number;
  questions?: Array<{ text: string }>;
  currentTermIndex?: number;
  teamTerms?: Array<{ term: string }>;
  showStartPrdButton?: boolean;
  agenticMessages?: Array<{
    prdTitle: string;
    openQuestions: string[];
  }>;
  showBounce?: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onModeChange: (mode: ChatMode) => void;
  onSummarizeAndSave?: () => void;
  onOpenAgentMode?: () => void;
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
  showStartPrdButton = false,
  agenticMessages = [],
  showBounce = false,
  onInputChange,
  onSubmit,
  onModeChange,
  onSummarizeAndSave,
  onOpenAgentMode
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea when component mounts or when input is cleared
  useEffect(() => {
    if (textareaRef.current && !loading) {
      textareaRef.current.focus();
    }
  }, [loading, mode, input]);

  const getPlaceholder = () => {
    if (mode === 'draft') {
      if (draftStep === 'questions') {
        return `Answer question ${currentQuestionIndex + 1} of ${questions.length}...`;
      } else if (draftStep === 'vocabulary') {
        return `Define term ${currentTermIndex + 1} of ${teamTerms.length}...`;
      }
      return "Share your product idea...";
    } else if (mode === 'brainstorm') {
      return "What's on your mind?";
    } else if (mode === 'design') {
      return "Describe design changes...";
    } else if (mode === 'feedback') {
      return "Describe a feature or pain point...";
    }
    return "Message Poppy...";
  };

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
        onClick={() => onModeChange('brainstorm')}
        className={`px-3 py-2 text-sm rounded-lg transition-all flex flex-col items-center gap-1 group ${
          mode === 'brainstorm' 
            ? 'bg-gradient-to-br from-poppy to-poppy/80 text-white shadow-md' 
            : 'text-gray-600 hover:text-poppy hover:bg-poppy/5 border border-gray-200 hover:border-poppy/30'
        }`}
      >
        <Sparkles className={`w-4 h-4 ${mode === 'brainstorm' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Brainstorm</div>
          <div className="text-xs opacity-75">Explore ideas</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('draft')}
        className={`px-3 py-2 text-sm rounded-lg transition-all flex flex-col items-center gap-1 group ${
          mode === 'draft' 
            ? 'bg-gradient-to-br from-poppy to-poppy/80 text-white shadow-md' 
            : 'text-gray-600 hover:text-poppy hover:bg-poppy/5 border border-gray-200 hover:border-poppy/30'
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
        className={`px-3 py-2 text-sm rounded-lg transition-all flex flex-col items-center gap-1 group ${
          mode === ('design' as ChatMode) 
            ? 'bg-gradient-to-br from-poppy to-poppy/80 text-white shadow-md' 
            : 'text-gray-600 hover:text-poppy hover:bg-poppy/5 border border-gray-200 hover:border-poppy/30'
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
        className={`px-3 py-2 text-sm rounded-lg transition-all flex flex-col items-center gap-1 group ${
          mode === 'feedback' 
            ? 'bg-gradient-to-br from-poppy to-poppy/80 text-white shadow-md' 
            : 'text-gray-600 hover:text-poppy hover:bg-poppy/5 border border-gray-200 hover:border-poppy/30'
        }`}
      >
        <MessageSquare className={`w-4 h-4 ${mode === 'feedback' ? '' : 'group-hover:scale-110 transition-transform'}`} />
        <div className="text-center">
          <div className="font-medium">Feedback</div>
          <div className="text-xs opacity-75">Search customers</div>
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
            className="w-full p-4 pr-12 rounded-xl border border-gray-200 resize-none focus:ring-2 focus:ring-poppy focus:border-poppy outline-none text-base placeholder-gray-500 min-h-[56px] max-h-32 bg-white shadow-sm transition-all"
            value={input}
            onChange={e => onInputChange(e.target.value)}
            placeholder={getPlaceholder()}
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
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-poppy text-white hover:bg-poppy/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
        
        {/* Mode selector - horizontal tabs */}
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-4 gap-2 flex-1 max-w-lg">
            {renderModeButtons()}
          </div>
          
          {/* Progress indicator for draft mode */}
          {progress.show && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-xs text-gray-600 font-medium truncate">
                  {progress.step}
                </div>
                <div className="flex-shrink-0">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-poppy rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {Math.round(progress.percent)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Show PRD button in brainstorm mode */}
      {showStartPrdButton && mode === 'brainstorm' && onSummarizeAndSave && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-poppy text-white font-medium text-sm hover:bg-poppy/90 transition-all duration-150 shadow-lg flex items-center gap-2"
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