'use client';

import { useState } from 'react';

interface Question {
  id: string;
  text: string;
}

interface QuestionsFormProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
}

export default function QuestionsForm({ questions, onSubmit }: QuestionsFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    questions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
  );

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  const currentQuestion = questions[currentStep];
  const currentValue = answers[currentQuestion.id];
  const isLastStep = currentStep === questions.length - 1;
  const allQuestionsAnswered = Object.values(answers).every(answer => answer.trim() !== '');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-medium text-[#232426] mb-2">Just a few questions</h1>
        <p className="text-sm text-[#BBC7B6]">Help us understand your needs better</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <p className="text-2xl font-medium text-[#232426] mb-4">{currentQuestion.text}</p>
          <div className="relative">
            <textarea
              id={currentQuestion.id}
              value={currentValue}
              onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
              rows={6}
              className="flex-1 w-full rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351] pr-12 pb-12"
              placeholder="Type your answer here..."
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
        <div className="flex justify-between items-center">
          <div className="flex justify-center gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleStepClick(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-[#EF6351]' : 'bg-[#E9DCC6]'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          <button
            type={isLastStep ? 'submit' : 'button'}
            onClick={isLastStep ? undefined : handleNext}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
              ${isLastStep ? 'bg-[#EF6351] text-white hover:bg-[#d94d38] cursor-pointer focus:ring-[#EF6351]' : 'bg-[#E9DCC6] text-white cursor-not-allowed'}
            `}
            disabled={!isLastStep && !currentValue.trim()}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${isLastStep ? 'rotate-[-90deg]' : 'rotate-0'}`}
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
    </div>
  );
} 