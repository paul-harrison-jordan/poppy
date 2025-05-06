'use client';

import { useState, useEffect } from 'react';
import Toast from './Toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, ChevronRight, PartyPopper } from "lucide-react";

interface FormData {
  teamStrategy: string;
  howYouThinkAboutProduct: string;
  pillarGoalsKeyTermsBackground: string;
  examplesOfHowYouThink: string;
}

interface Step {
  id: keyof FormData;
  label: string;
  placeholder: string;
  rows: number;
}

export default function ContextForm() {
  // State
  const [formData, setFormData] = useState<FormData>({
    teamStrategy: '',
    howYouThinkAboutProduct: '',
    pillarGoalsKeyTermsBackground: '',
    examplesOfHowYouThink: '',
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();

  // Constants
  const steps: Step[] = [
    {
      id: 'teamStrategy',
      label: 'Team Strategy',
      placeholder: 'Provide the text of the best strategy document you have for your product area, or provide a view of where you want your product to be a year from now',
      rows: 4
    },
    {
      id: 'howYouThinkAboutProduct',
      label: 'How you think about Product',
      placeholder: 'Give a few examples of how you\'ve solved problems in the past with your product area, and how you generally approach developing your product area. This will help give ChatPRD of how you think about developing your product area.',
      rows: 4
    },
    {
      id: 'pillarGoalsKeyTermsBackground',
      label: 'Pillar Goals, Key Terms, and Background',
      placeholder: 'Provide context about the teams in your pillar, how you\'re product area fits into that pillar achieving the business goals, and any other background information that will help ChatPRD understand the bigger picture and write a better PRD.',
      rows: 2
    },
    {
      id: 'examplesOfHowYouThink',
      label: 'Annotated Example PRD',
      placeholder: 'Paste the markdown text of an example PRD that has additional context written by you explaining why you wrote things the way you did, and why the structure of the document is important. The more you provide about how you think and why the PRD looks the way it does, the better your results will be.',
      rows: 4
    }
  ];

  // Resume logic
  useEffect(() => {
    const storedContext = localStorage.getItem('personalContext');
    if (storedContext) {
      try {
        const parsedContext = JSON.parse(storedContext);
        const isComplete = steps.every(step => parsedContext[step.id]?.trim());
        if (!isComplete && Object.values(parsedContext).some(Boolean)) {
          setShowResumePrompt(true);
        }
        setFormData(prev => ({ ...prev, ...parsedContext }));
      } catch (error) {
        console.error('Error parsing stored context:', error);
      }
    }
  }, []);

  // Auto-save progress
  useEffect(() => {
    localStorage.setItem('personalContext', JSON.stringify(formData));
  }, [formData]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('personalContext', JSON.stringify(formData));
    setShowCelebration(true);
    setToastMessage('Context updated successfully!');
    setShowToast(true);
    setTimeout(() => {
      setShowCelebration(false);
      router.replace('/');
    }, 2000);
  };

  const handleResume = () => {
    setShowResumePrompt(false);
  };

  const handleStartOver = () => {
    setFormData({
      teamStrategy: '',
      howYouThinkAboutProduct: '',
      pillarGoalsKeyTermsBackground: '',
      examplesOfHowYouThink: '',
    });
    setCurrentStep(0);
    setShowResumePrompt(false);
    localStorage.removeItem('personalContext');
  };

  // Derived values
  const currentStepData = steps[currentStep];
  const currentValue = formData[currentStepData.id];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const allComplete = steps.every(step => formData[step.id]?.trim());

  // Render
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      {/* Resume Prompt Modal */}
      <AnimatePresence>
        {showResumePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <div className="bg-white/90 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold mb-4 text-[#232426]">Resume your context?</h2>
              <p className="mb-6 text-gray-600">We found saved progress for your context. Would you like to continue where you left off or start over?</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 transition-colors"
                  onClick={handleResume}
                >
                  Resume
                </button>
                <button
                  className="px-4 py-2 rounded-full bg-white border border-rose-200 text-rose-500 font-medium hover:bg-rose-50/70 transition-colors"
                  onClick={handleStartOver}
                >
                  Start Over
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <div className="bg-white/90 rounded-2xl shadow-lg p-8 max-w-md w-full text-center flex flex-col items-center">
              <PartyPopper className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold mb-2 text-[#232426]">You're ready to draft your first PRD!</h2>
              <p className="mb-4 text-gray-600">Your context is complete. You can now start drafting PRDs with the best possible results.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-2 text-center"
          >
            {currentStepData.label}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 text-center mb-4"
          >
            {currentStepData.placeholder}
          </motion.p>
          <div className="relative">
            <textarea
              id={currentStepData.id}
              name={currentStepData.id}
              value={currentValue}
              onChange={handleInputChange}
              rows={8}
              className="w-full rounded-xl border border-rose-100 bg-white/90 backdrop-blur-sm px-4 py-3 text-gray-800 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200 pr-12 pb-12 resize-none"
              placeholder={currentStepData.placeholder}
              required
              autoFocus
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!isFirstStep && (
                <motion.button
                  whileHover={{ scale: 1.05, x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handlePrevious}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  <span>Previous</span>
                </motion.button>
              )}
            </div>
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-sm'
                      : index < currentStep
                        ? 'bg-rose-200'
                        : 'bg-rose-100'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
            <motion.button
              whileHover={currentValue.trim() ? { scale: 1.05 } : {}}
              whileTap={currentValue.trim() ? { scale: 0.95 } : {}}
              type={isLastStep ? "submit" : "button"}
              onClick={isLastStep ? undefined : handleNext}
              disabled={!currentValue.trim()}
              className={`rounded-full flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all px-4 py-2 ${
                currentValue.trim()
                  ? isLastStep
                    ? 'bg-gradient-to-r from-rose-500 to-pink-400 text-white hover:from-rose-600 hover:to-pink-500 focus:ring-rose-200'
                    : 'bg-gradient-to-r from-rose-500 to-pink-400 text-white hover:from-rose-600 hover:to-pink-500 focus:ring-rose-200'
                  : 'bg-rose-100 text-rose-300 cursor-not-allowed'
              }`}
            >
              {isLastStep ? (
                <>
                  <span className="mr-2">Finish</span>
                  <CheckCircle className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span className="mr-2">Next</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </motion.div>
  );
} 