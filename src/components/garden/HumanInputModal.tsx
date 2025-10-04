'use client';
import React, { useState } from 'react';
import { AlertCircle, Brain, CheckCircle, X } from 'lucide-react';
import { HumanQuestion } from '../../services/garden/types';

interface HumanInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responses: Record<string, string>) => void;
  questions: HumanQuestion[];
  agent: string;
  loading?: boolean;
}

const CATEGORY_COLORS = {
  'user_problem': 'border-red-200 bg-red-50',
  'business_context': 'border-blue-200 bg-blue-50',
  'technical': 'border-purple-200 bg-purple-50',
  'market': 'border-green-200 bg-green-50'
};

const CATEGORY_ICONS = {
  'user_problem': '👤',
  'business_context': '🏢',
  'technical': '⚙️',
  'market': '📈'
};

export default function HumanInputModal({
  isOpen,
  onClose,
  onSubmit,
  questions,
  agent,
  loading = false
}: HumanInputModalProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation errors when user starts typing
    if (validationErrors.includes(questionId)) {
      setValidationErrors(prev => prev.filter(id => id !== questionId));
    }
  };

  const handleSubmit = () => {
    // Validate required questions
    const requiredErrors = questions
      .filter(q => q.required && (!responses[q.id] || responses[q.id].trim() === ''))
      .map(q => q.id);
    
    if (requiredErrors.length > 0) {
      setValidationErrors(requiredErrors);
      return;
    }

    onSubmit(responses);
  };

  const answeredCount = questions.filter(q => responses[q.id]?.trim()).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-purple-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-lavender-50 to-purple-50 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Optional: Enhance Your PRD</h2>
                <p className="text-sm text-gray-600 capitalize">
                  {agent} Agent found {questions.length} ways to improve quality
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">Progress</div>
                <div className="text-xs text-gray-500">{answeredCount}/{questions.length} answered</div>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="stroke-gray-200"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="2"
                  />
                  <path
                    className="stroke-purple-500"
                    strokeDasharray={`${progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">{progress}%</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">Why these questions matter</span>
            </div>
            <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              The {agent} Agent is already creating your PRD but has identified ways to make it even better. 
              These questions are optional - answer any that you can to enhance quality, or skip to see the current analysis.
            </p>
          </div>

          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <div className={`border-2 rounded-2xl p-4 transition-all ${
                validationErrors.includes(question.id) 
                  ? 'border-red-300 bg-red-50' 
                  : CATEGORY_COLORS[question.category]
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm font-medium">
                    <span>{CATEGORY_ICONS[question.category]}</span>
                    <span className="capitalize">{question.category.replace('_', ' ')}</span>
                  </div>
                  {question.required && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Required
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                  {index + 1}. {question.question}
                </h3>

                <div className="mb-4 p-3 bg-white/50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">Why this matters:</div>
                  <div className="text-sm text-gray-700">{question.why_important}</div>
                </div>

                {question.options ? (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={responses[question.id] === option}
                          onChange={(e) => handleResponseChange(question.id, e.target.value)}
                          className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={responses[question.id] || ''}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={3}
                    className={`w-full p-4 rounded-xl border-2 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none transition-all ${
                      validationErrors.includes(question.id)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  />
                )}

                {validationErrors.includes(question.id) && (
                  <div className="flex items-center gap-2 mt-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">This question requires an answer to proceed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-purple-50 rounded-b-3xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Your PRD is being created! These questions can make it even better.
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
              >
                Continue with Current Analysis
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Continue PRD Creation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}