'use client';

import React, { useState, useEffect } from 'react';
import { ProposedContent, FeatureInput } from '@/types/knowledge';

interface BatchReviewInterfaceProps {
  features: FeatureInput[];
  proposedContent: ProposedContent[];
  onApprove: (approvedContent: ProposedContent[]) => void;
  onBack?: () => void;
}

type CardItem = {
  id: string;
  type: 'term' | 'question';
  featureId: string;
  featureName: string;
  index: number;
  data: {
    term?: string;
    question?: string;
    definition?: string;
    answer?: string;
    reasoning?: string;
    source?: string;
    sources?: string[];
    confidence: number;
    approved?: boolean;
    edited?: boolean;
  };
};

export default function BatchReviewInterface({
  features,
  proposedContent,
  onApprove,
  onBack
}: BatchReviewInterfaceProps) {
  const [content, setContent] = useState<ProposedContent[]>(proposedContent);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  // Flatten all items into a single reviewable queue
  const allCards: CardItem[] = [];
  content.forEach((featureContent) => {
    const feature = features.find(f => f.id === featureContent.featureId);
    if (!feature) return;

    featureContent.terms.forEach((term, idx) => {
      allCards.push({
        id: `${featureContent.featureId}-term-${idx}`,
        type: 'term',
        featureId: featureContent.featureId,
        featureName: feature.name,
        index: idx,
        data: term
      });
    });

    featureContent.questionAnswers.forEach((qa, idx) => {
      allCards.push({
        id: `${featureContent.featureId}-qa-${idx}`,
        type: 'question',
        featureId: featureContent.featureId,
        featureName: feature.name,
        index: idx,
        data: qa
      });
    });
  });

  const currentCard = allCards[currentCardIndex];
  const totalCards = allCards.length;
  const approvedCount = allCards.filter(card => card.data.approved).length;
  const isLastCard = currentCardIndex === totalCards - 1;
  const isFirstCard = currentCardIndex === 0;

  const goToNextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setDirection('next');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentCardIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      setDirection('prev');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentCardIndex(prev => prev - 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const handleApproval = () => {
    if (!currentCard) return;

    setContent(content.map(c => {
      if (c.featureId === currentCard.featureId) {
        if (currentCard.type === 'term') {
          const newTerms = [...c.terms];
          newTerms[currentCard.index] = { ...newTerms[currentCard.index], approved: true };
          return { ...c, terms: newTerms };
        } else {
          const newQuestions = [...c.questionAnswers];
          newQuestions[currentCard.index] = { ...newQuestions[currentCard.index], approved: true };
          return { ...c, questionAnswers: newQuestions };
        }
      }
      return c;
    }));

    // Auto-advance after brief moment
    setTimeout(() => {
      if (!isLastCard) {
        goToNextCard();
      }
    }, 300);
  };

  const updateContent = (field: string, value: string) => {
    if (!currentCard) return;

    setContent(content.map(c => {
      if (c.featureId === currentCard.featureId) {
        if (currentCard.type === 'term') {
          const newTerms = [...c.terms];
          newTerms[currentCard.index] = {
            ...newTerms[currentCard.index],
            [field]: value,
            edited: true
          };
          return { ...c, terms: newTerms };
        } else {
          const newQuestions = [...c.questionAnswers];
          newQuestions[currentCard.index] = {
            ...newQuestions[currentCard.index],
            [field]: value,
            edited: true
          };
          return { ...c, questionAnswers: newQuestions };
        }
      }
      return c;
    }));
  };

  const handleSubmit = () => {
    onApprove(content);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleApproval();
    } else if (e.key === 'ArrowRight' && !isLastCard) {
      goToNextCard();
    } else if (e.key === 'ArrowLeft' && !isFirstCard) {
      goToPrevCard();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  });

  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">All items reviewed</h2>
          <p className="text-gray-600 mb-8">Ready to generate PRDs</p>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const isApproved = currentCard.data.approved;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ←
                </button>
              )}
              <div>
                <h1 className="text-lg font-medium text-gray-900">Review Content</h1>
                <p className="text-sm text-gray-500">{currentCard.featureName}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {currentCardIndex + 1} of {totalCards}
            </div>
          </div>

          {/* Elegant Progress Bar */}
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((currentCardIndex + 1) / totalCards) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Container */}
      <div className="pt-32 pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className={`transition-all duration-200 ${
              isTransitioning
                ? direction === 'next'
                  ? 'opacity-0 transform translate-x-4'
                  : 'opacity-0 transform -translate-x-4'
                : 'opacity-100 transform translate-x-0'
            }`}
          >
            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="px-8 pt-8 pb-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      {currentCard.type === 'term' ? 'Vocabulary' : 'Question'}
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 leading-tight">
                      {currentCard.type === 'term'
                        ? currentCard.data.term
                        : currentCard.data.question}
                    </h2>
                  </div>
                  {isApproved && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Approved
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        currentCard.data.confidence >= 0.7
                          ? 'bg-green-500'
                          : currentCard.data.confidence >= 0.4
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span>{Math.round(currentCard.data.confidence * 100)}% confidence</span>
                  </div>
                  {currentCard.data.edited && (
                    <span className="text-blue-600">Edited</span>
                  )}
                  {currentCard.type === 'question' && currentCard.data.sources?.length > 0 && (
                    <span>{currentCard.data.sources.length} sources</span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="px-8 py-6 space-y-6">
                {currentCard.type === 'term' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Definition
                    </label>
                    <textarea
                      value={currentCard.data.definition}
                      onChange={(e) => updateContent('definition', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-y transition-all text-gray-900 leading-relaxed min-h-[200px]"
                      placeholder="Add definition..."
                    />
                    <p className="mt-2 text-xs text-gray-500">{currentCard.data.source}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer
                      </label>
                      <textarea
                        value={currentCard.data.answer}
                        onChange={(e) => updateContent('answer', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-y transition-all text-gray-900 leading-relaxed min-h-[250px]"
                        placeholder="Add answer..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reasoning
                      </label>
                      <textarea
                        value={currentCard.data.reasoning}
                        onChange={(e) => updateContent('reasoning', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-y transition-all text-gray-900 leading-relaxed min-h-[200px]"
                        placeholder="Add reasoning..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Keyboard Hint */}
            <div className="mt-6 text-center text-sm text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">⌘</kbd>
              {' + '}
              <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">Enter</kbd>
              {' to approve • '}
              <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">←</kbd>
              {' '}
              <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">→</kbd>
              {' to navigate'}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPrevCard}
              disabled={isFirstCard}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                isFirstCard
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              {!isApproved ? (
                <button
                  onClick={handleApproval}
                  className="px-8 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
                >
                  Approve
                </button>
              ) : (
                <div className="px-8 py-2.5 bg-green-50 text-green-700 rounded-lg font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Approved
                </div>
              )}

              <button
                onClick={goToNextCard}
                disabled={isLastCard}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  isLastCard
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isLastCard ? 'Last item' : 'Next'}
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {approvedCount} of {totalCards} approved
              </span>
              {approvedCount === totalCards && (
                <button
                  onClick={handleSubmit}
                  className="text-black hover:underline font-medium"
                >
                  Continue to PRD generation →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
