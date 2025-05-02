'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FormStep {
  type: 'input' | 'textarea';
  placeholder: string;
  required?: boolean;
  autoFocus?: boolean;
}

interface FormConfig {
  title: string;
  steps: FormStep[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onError?: (error: Error) => void;
  storageKey?: string;
}

export default function GenericForm({ 
  title, 
  steps, 
  onSubmit, 
  onError,
  storageKey 
}: FormConfig) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to first step if current step is out of bounds
  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(0);
    }
  }, [currentStep, steps.length]);

  // Load saved state from localStorage if storageKey is provided
  useEffect(() => {
    if (storageKey) {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          setValues(parsedState.values || {});
          // Ensure loaded step is valid
          const loadedStep = parsedState.currentStep || 0;
          setCurrentStep(loadedStep >= steps.length ? 0 : loadedStep);
        } catch (error) {
          console.error('Error loading saved state:', error);
        }
      }
    }
  }, [storageKey, steps.length]);

  // Save state to localStorage if storageKey is provided
  useEffect(() => {
    if (storageKey && (Object.keys(values).length > 0 || currentStep > 0)) {
      localStorage.setItem(storageKey, JSON.stringify({
        values,
        currentStep
      }));
    }
  }, [values, currentStep, storageKey]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(values);
      // Clear form state after successful submission
      setValues({});
      setCurrentStep(0);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentStep < steps.length - 1) {
        handleNext();
      } else {
        handleSubmit(e);
      }
    }
  };

  const currentStepConfig = steps[currentStep];

  // If no steps provided or invalid current step, show error state
  if (!steps.length || !currentStepConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto p-6">
          <div className="text-red-600 text-center">
            No form steps configured
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-medium text-[#232426] mb-8 text-center"
        >
          {title}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            {currentStepConfig.type === 'input' ? (
              <input
                type="text"
                value={values[currentStep] || ''}
                onChange={(e) => setValues({ ...values, [currentStep]: e.target.value })}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                placeholder={currentStepConfig.placeholder}
                required={currentStepConfig.required}
                autoFocus={currentStepConfig.autoFocus}
              />
            ) : (
              <textarea
                value={values[currentStep] || ''}
                onChange={(e) => setValues({ ...values, [currentStep]: e.target.value })}
                onKeyDown={handleKeyDown}
                rows={4}
                className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                placeholder={currentStepConfig.placeholder}
                required={currentStepConfig.required}
                autoFocus={currentStepConfig.autoFocus}
              />
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={currentStep < steps.length - 1 ? handleNext : handleSubmit}
              disabled={isSubmitting || !values[currentStep]?.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                values[currentStep]?.trim()
                  ? 'bg-[#EF6351] text-white hover:bg-[#d94d38] cursor-pointer focus:ring-[#EF6351]'
                  : 'bg-[#E9DCC6] text-white cursor-not-allowed'
              }`}
            >
              <svg
                className="w-5 h-5 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={currentStep < steps.length - 1 ? "M9 5l7 7-7 7" : "M5 13l4 4L19 7"}
                />
              </svg>
            </motion.button>
          </motion.div>

          {currentStep > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handlePrevious}
              className="mt-4 inline-flex items-center px-4 py-2 border border-[#E9DCC6] rounded-md shadow-sm text-sm font-medium text-[#232426] bg-white hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E9DCC6]"
            >
              Back
            </motion.button>
          )}
        </form>
      </div>
    </div>
  );
} 