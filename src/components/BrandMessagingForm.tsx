'use client';

import { useState } from 'react';
import BrandMessagingSuccessModal from './BrandMessagingSuccessModal';
import LoadingModal from './LoadingModal';
import PastBrandMessages from './PastBrandMessages';

interface Question {
  id: string;
  text: string;
  reasoning: string;
}

export default function BrandMessagingForm() {
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'initial' | 'questions'>('initial');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<{ docId: string; title: string; url: string } | null>(null);
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

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingState({
      isOpen: true,
      title: 'Generating Questions',
      message: 'We\'re analyzing your brand context to create relevant questions...',
    });

    try {
      const response = await fetch('/api/generate-brand-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, query }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
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
      title: 'Creating Brand Messaging',
      message: 'We\'re generating your brand messaging document...',
    });

    try {
      const response = await fetch('/api/generate-brand-messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          query,
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            answer: answers[q.id] || '',
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate brand messaging');
      }

      const data = await response.json();
      
      // Save to localStorage
      const existingBrandMessages = JSON.parse(localStorage.getItem('brandMessages') || '[]');
      const newBrandMessage = {
        id: Date.now().toString(),
        title,
        createdAt: new Date().toISOString(),
        ...data
      };
      localStorage.setItem('brandMessages', JSON.stringify([...existingBrandMessages, newBrandMessage]));

      // Create Google Doc
      const docResponse = await fetch('/api/create-google-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: data,
        }),
      });

      if (!docResponse.ok) {
        throw new Error('Failed to create Google Doc');
      }

      const docData = await docResponse.json();
      setCreatedDoc(docData);
      setShowSuccessModal(true);
      setLoadingState({ isOpen: false, title: '', message: '' });
      setShowPastWork(false);
    } catch (error) {
      console.error('Error generating brand messaging:', error);
      setError('Failed to generate brand messaging. Please try again.');
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto p-6">
          <div className="text-4xl font-medium text-[#232426] mb-8 text-center">
            Let&apos;s Spin This Thing
          </div>
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleQuestionSubmit} className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <p className="text-2xl font-medium text-[#232426] mb-4">{question.text}</p>
                <p className="text-sm text-[#BBC7B6] mb-2">{question.reasoning}</p>
                <div className="relative">
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="flex-1 w-full rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351] pr-12 pb-12"
                    rows={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.getElementById(question.id) as HTMLTextAreaElement;
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
            ))}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep('initial');
                  setShowTitle(true);
                  setShowQuery(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-[#E9DCC6] rounded-md shadow-sm text-sm font-medium text-[#232426] bg-white hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E9DCC6]"
              >
                Back
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#EF6351] hover:bg-[#d94d38] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF6351]"
              >
                Generate Brand Messaging
              </button>
            </div>
          </form>
          <BrandMessagingSuccessModal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              setCurrentStep('initial');
              setTitle('');
              setQuery('');
              setQuestions([]);
              setAnswers({});
            }}
            doc={createdDoc!}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto p-6">
        <div className="text-4xl font-medium text-[#232426] mb-8 text-center">
          Let&apos;s Spin This Thing
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
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                  placeholder="Give your brand messaging a title..."
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
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                  placeholder="Describe your brand and what you want to communicate..."
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
        {showPastWork && <PastBrandMessages />}
      </div>
    </div>
  );
} 