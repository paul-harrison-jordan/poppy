import React from 'react';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

type DraftStep = 'initial' | 'vocabulary' | 'questions' | 'content';

interface PRDProgressIndicatorProps {
  currentStep: DraftStep;
  className?: string;
}

const STEPS = [
  {
    key: 'initial' as DraftStep,
    label: 'Setup',
    description: 'Define your PRD topic'
  },
  {
    key: 'vocabulary' as DraftStep,
    label: 'Vocabulary',
    description: 'Define key terms'
  },
  {
    key: 'questions' as DraftStep,
    label: 'Questions',
    description: 'Answer key questions'
  },
  {
    key: 'content' as DraftStep,
    label: 'Generate',
    description: 'Create your PRD'
  }
];

const getStepIndex = (step: DraftStep): number => {
  return STEPS.findIndex(s => s.key === step);
};

export default function PRDProgressIndicator({ currentStep, className = '' }: PRDProgressIndicatorProps) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-poppy/5 to-sprout/5 border border-poppy/20 rounded-xl p-4 mb-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-poppy rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-gray-700">PRD Creation Progress</span>
        </div>
        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
          Step {currentIndex + 1} of {STEPS.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div
          className="bg-gradient-to-r from-poppy to-sprout h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step.key}>
              <motion.div
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  opacity: isUpcoming ? 0.4 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 mb-2
                  ${isCompleted ? 'bg-sprout border-sprout text-white' : 
                    isCurrent ? 'bg-poppy border-poppy text-white' : 
                    'bg-white border-gray-300 text-gray-400'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-medium ${
                    isCurrent ? 'text-poppy' : 
                    isCompleted ? 'text-sprout' : 
                    'text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 max-w-16 leading-tight">
                    {step.description}
                  </div>
                </div>
              </motion.div>
              
              {index < STEPS.length - 1 && (
                <ArrowRight className={`w-4 h-4 mx-2 ${
                  index < currentIndex ? 'text-sprout' : 'text-gray-300'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step Context */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-4 p-3 bg-white/60 rounded-lg border border-gray-200"
      >
        <div className="text-sm text-gray-700">
          <span className="font-medium">Current: </span>
          {STEPS[currentIndex]?.description}
        </div>
      </motion.div>
    </motion.div>
  );
}