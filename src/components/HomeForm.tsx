'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingModal from './LoadingModal';
import PastWork from './PastWork';
import { AlertNotification } from "./AlertNotification"

interface Question {
  id: string;
  text: string;
  reasoning: string;
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  title: string;
}


export default function HomeForm() {
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'initial' | 'questions'>('initial');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [showQuery, setShowQuery] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [showPastWork, setShowPastWork] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<{ docId: string; title: string; url: string } | null>(null);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted, setting loading state...');
    setLoadingState({
      isOpen: true,
      title: 'Generating Questions',
      message: 'analyzing your PRD context to ask a few relevant questions...',
    });

    try {
      console.log('Making API request...');
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title, 
          query,
          type: 'prd'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      console.log('Received questions:', data.questions);
      
      // Update all states in sequence
      setQuestions(data.questions);
      setShowQuery(false);
      setShowTitle(false);
      setCurrentStep('questions');
    } catch (error) {
      console.error('Error generating questions:', error);
      setError('Failed to generate questions. Please try again.');
    } finally {
      setLoadingState({ isOpen: false, title: '', message: '' });
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingState({
      isOpen: true,
      title: 'Creating PRD',
      message: 'generating your PRD draft...',
    });

    try {
      // First generate the PRD content
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'prd',
          title,
          query,
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            answer: answers[q.id] || '',
          })),
          storedContext: JSON.stringify({
            teamStrategy: '',
            howYouThinkAboutProduct: '',
            pillarGoalsKeyTermsBackground: '',
            examplesOfHowYouThink: ''
          })
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PRD');
      }

      const data = await response.json();

      // Create Google Doc
      const fileRes = await drive.files.create({
        requestBody: {
          name: title,
          mimeType: 'application/vnd.google-apps.document',
        },
        fields: 'id',
      });

      const docId = fileRes.data.id!;
      const url = `https://docs.google.com/document/d/${docId}/edit`;

      // Save to localStorage
      const savedPRDs = JSON.parse(localStorage.getItem('savedPRDs') || '[]');
      const newPRD = {
        docId,
        title,
        createdAt: new Date().toISOString(),
        url,
      };
      localStorage.setItem('savedPRDs', JSON.stringify([newPRD, ...savedPRDs]));

      // Trigger update event for PastWork component
      window.dispatchEvent(new CustomEvent('savedPRDsUpdated'));
      
      // Set the created document and show success only after localStorage is updated
      setCreatedDoc({
        docId,
        title,
        url,
      });
      setShowSuccess(true);
      
      // Reset form state
      setLoadingState({ isOpen: false, title: '', message: '' });
      setCurrentStep('initial');
      setTitle('');
      setQuery('');
      setQuestions([]);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setShowTitle(true);
      setShowQuery(false);
      setShowPastWork(true);
      
      return apiJsonResponse({ docId, title, url });
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to generate PRD. Please try again.');
      setLoadingState({ isOpen: false, title: '', message: '' });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      setShowTitle(false);
      setShowQuery(true);
    }
  };

  if (loadingState.isOpen) {
    return <LoadingModal {...loadingState} />;
  }

  if (currentStep === 'questions') {
    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto p-6">
          <div className="text-4xl font-medium text-[#232426] mb-8 text-center">
            Let&apos;s Create Your PRD
          </div>
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleQuestionSubmit} className="space-y-6">
            <div className="space-y-2">
              <p className="text-2xl font-medium text-[#232426] mb-4">{currentQuestion.text}</p>
              <p className="text-sm text-[#BBC7B6] mb-2">{currentQuestion.reasoning}</p>
              <div className="relative">
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                  className="flex-1 w-full rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351] pr-12 pb-12"
                  rows={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.getElementById(currentQuestion.id) as HTMLTextAreaElement;
                    textarea.focus();
                  }}
                  className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors bg-[#E9DCC6] text-white hover:bg-[#d4c8b0] cursor-pointer focus:ring-[#E9DCC6]"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(prev => prev - 1);
                    } else {
                      setCurrentStep('initial');
                      setShowTitle(true);
                      setShowQuery(false);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-[#E9DCC6] rounded-md shadow-sm text-sm font-medium text-[#232426] bg-white hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E9DCC6]"
                >
                  Back
                </button>
                <div className="flex space-x-1">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentQuestionIndex ? 'bg-[#EF6351]' : 'bg-[#E9DCC6]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                type={isLastQuestion ? 'submit' : 'button'}
                onClick={isLastQuestion ? undefined : () => setCurrentQuestionIndex(prev => prev + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                  ${isLastQuestion ? 'bg-[#EF6351] text-white hover:bg-[#d94d38] cursor-pointer focus:ring-[#EF6351]' : 'bg-[#E9DCC6] text-white cursor-not-allowed'}
                `}
                disabled={!isLastQuestion && !answers[currentQuestion.id]?.trim()}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${isLastQuestion ? 'rotate-[-90deg]' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
          {showSuccess && createdDoc && (
            <AlertNotification
              title="Document Created"
              message="Your PRD document has been created successfully."
              link={{
                text: "View Document",
                url: createdDoc.url,
              }}
              onDismiss={() => setShowSuccess(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto p-6">
        <div className="text-4xl font-medium text-[#232426] mb-8 text-center">
          Let&apos;s Create Your PRD
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div>
            {showTitle && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                  placeholder="Give your PRD a title..."
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (title.trim()) {
                      setShowTitle(false);
                      setShowQuery(true);
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                    ${title.trim() ? 'bg-[#EF6351] text-white hover:bg-[#d94d38] cursor-pointer focus:ring-[#EF6351]' : 'bg-[#E9DCC6] text-white cursor-not-allowed'}
                  `}
                  tabIndex={-1}
                  disabled={!title.trim()}
                >
                  <svg
                    className="w-5 h-5 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div>
            {showQuery && (
              <div className="flex items-center gap-2">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                  placeholder="Describe your product and what you want to achieve..."
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#EF6351] flex items-center justify-center text-white shadow-md hover:bg-[#d94d38] focus:outline-none focus:ring-2 focus:ring-[#EF6351] focus:ring-offset-2 transition-colors"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 rotate-[-90deg]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </form>
        {showPastWork && (
          <PastWork 
            storageKey="savedPRDs" 
            title="Past PRDs"
            onCountUpdate={(count) => {
              window.dispatchEvent(new CustomEvent('savedPRDsUpdated'));
            }}
          />
        )}
      </div>
    </div>
  );
} 