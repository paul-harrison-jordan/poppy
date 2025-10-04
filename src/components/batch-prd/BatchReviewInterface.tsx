'use client';

import React, { useState } from 'react';
import { ProposedContent, FeatureInput } from '@/types/knowledge';

interface BatchReviewInterfaceProps {
  features: FeatureInput[];
  proposedContent: ProposedContent[];
  onApprove: (approvedContent: ProposedContent[]) => void;
  onBack?: () => void;
}

export default function BatchReviewInterface({
  features,
  proposedContent,
  onApprove,
  onBack
}: BatchReviewInterfaceProps) {
  const [content, setContent] = useState<ProposedContent[]>(proposedContent);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const updateTermDefinition = (featureId: string, termIndex: number, newDefinition: string) => {
    setContent(content.map(c => {
      if (c.featureId === featureId) {
        const newTerms = [...c.terms];
        newTerms[termIndex] = {
          ...newTerms[termIndex],
          definition: newDefinition,
          edited: true
        };
        return { ...c, terms: newTerms };
      }
      return c;
    }));
  };

  const updateQuestionAnswer = (featureId: string, questionIndex: number, field: 'answer' | 'reasoning', value: string) => {
    setContent(content.map(c => {
      if (c.featureId === featureId) {
        const newQuestions = [...c.questionAnswers];
        newQuestions[questionIndex] = {
          ...newQuestions[questionIndex],
          [field]: value,
          edited: true
        };
        return { ...c, questionAnswers: newQuestions };
      }
      return c;
    }));
  };

  const toggleTermApproval = (featureId: string, termIndex: number) => {
    setContent(content.map(c => {
      if (c.featureId === featureId) {
        const newTerms = [...c.terms];
        newTerms[termIndex] = {
          ...newTerms[termIndex],
          approved: !newTerms[termIndex].approved
        };
        return { ...c, terms: newTerms };
      }
      return c;
    }));
  };

  const toggleQuestionApproval = (featureId: string, questionIndex: number) => {
    setContent(content.map(c => {
      if (c.featureId === featureId) {
        const newQuestions = [...c.questionAnswers];
        newQuestions[questionIndex] = {
          ...newQuestions[questionIndex],
          approved: !newQuestions[questionIndex].approved
        };
        return { ...c, questionAnswers: newQuestions };
      }
      return c;
    }));
  };

  const approveAll = () => {
    const allApproved = content.map(c => ({
      ...c,
      terms: c.terms.map(t => ({ ...t, approved: true })),
      questionAnswers: c.questionAnswers.map(qa => ({ ...qa, approved: true }))
    }));
    setContent(allApproved);
  };

  const handleSubmit = () => {
    onApprove(content);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const allApproved = content.every(c =>
    c.terms.every(t => t.approved) && c.questionAnswers.every(qa => qa.approved)
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Review & Approve PRD Content</h2>
        <p className="text-gray-700 mb-4">
          Review the generated terms and question answers for each feature. Edit as needed and approve to proceed.
        </p>
        <button
          onClick={approveAll}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Approve All
        </button>
      </div>

      <div className="space-y-4">
        {content.map((featureContent) => {
          const feature = features.find(f => f.id === featureContent.featureId);
          if (!feature) return null;

          const isExpanded = expandedFeatures.has(featureContent.featureId);
          const approvedTerms = featureContent.terms.filter(t => t.approved).length;
          const approvedQuestions = featureContent.questionAnswers.filter(qa => qa.approved).length;

          return (
            <div key={featureContent.featureId} className="bg-white rounded-lg shadow-md">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleFeature(featureContent.featureId)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{feature.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {approvedTerms}/{featureContent.terms.length} terms approved,{' '}
                      {approvedQuestions}/{featureContent.questionAnswers.length} questions approved
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {approvedTerms === featureContent.terms.length &&
                      approvedQuestions === featureContent.questionAnswers.length && (
                        <span className="text-green-600 font-semibold">✓ All Approved</span>
                      )}
                    <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 border-t space-y-6">
                  {/* Terms Section */}
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Terms ({featureContent.terms.length})</h4>
                    <div className="space-y-3">
                      {featureContent.terms.map((term, idx) => (
                        <div key={idx} className="p-3 border rounded-md bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{term.term}</span>
                                <span className={`text-xs ${getConfidenceColor(term.confidence)}`}>
                                  {Math.round(term.confidence * 100)}% confidence
                                </span>
                                {term.edited && <span className="text-xs text-blue-600">Edited</span>}
                              </div>
                              <p className="text-xs text-gray-500">{term.source}</p>
                            </div>
                            <button
                              onClick={() => toggleTermApproval(featureContent.featureId, idx)}
                              className={`px-3 py-1 rounded-md text-sm ${
                                term.approved
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {term.approved ? '✓ Approved' : 'Approve'}
                            </button>
                          </div>
                          <textarea
                            value={term.definition}
                            onChange={(e) => updateTermDefinition(featureContent.featureId, idx, e.target.value)}
                            className="w-full p-2 border rounded-md text-sm resize-none"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Questions Section */}
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Questions ({featureContent.questionAnswers.length})</h4>
                    <div className="space-y-4">
                      {featureContent.questionAnswers.map((qa, idx) => (
                        <div key={idx} className="p-3 border rounded-md bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{qa.question}</span>
                                <span className={`text-xs ${getConfidenceColor(qa.confidence)}`}>
                                  {Math.round(qa.confidence * 100)}% confidence
                                </span>
                                {qa.edited && <span className="text-xs text-blue-600">Edited</span>}
                              </div>
                              {qa.sources.length > 0 && (
                                <p className="text-xs text-gray-500">Sources: {qa.sources.length}</p>
                              )}
                            </div>
                            <button
                              onClick={() => toggleQuestionApproval(featureContent.featureId, idx)}
                              className={`px-3 py-1 rounded-md text-sm ${
                                qa.approved
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {qa.approved ? '✓ Approved' : 'Approve'}
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-semibold mb-1">Answer</label>
                              <textarea
                                value={qa.answer}
                                onChange={(e) => updateQuestionAnswer(featureContent.featureId, idx, 'answer', e.target.value)}
                                className="w-full p-2 border rounded-md text-sm resize-none"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Reasoning</label>
                              <textarea
                                value={qa.reasoning}
                                onChange={(e) => updateQuestionAnswer(featureContent.featureId, idx, 'reasoning', e.target.value)}
                                className="w-full p-2 border rounded-md text-sm resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-6 bg-white rounded-lg shadow-md p-6">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!allApproved}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            allApproved
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {allApproved ? 'Generate PRDs' : 'Approve all content to continue'}
        </button>
      </div>
    </div>
  );
}
