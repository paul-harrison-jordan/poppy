'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Settings } from 'lucide-react';
import ContextForm from './ContextForm';
import SyncForm from './SyncForm';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
}

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'tune',
      title: 'Tune ChatPRD',
      description: 'Set up your context to help ChatPRD understand your product better.',
      icon: <Settings className="w-6 h-6" />,
      isComplete: false,
    },
    {
      id: 'sync',
      title: 'Sync Documents',
      description: 'Connect your Google Drive to access and manage your PRDs.',
      icon: <FileText className="w-6 h-6" />,
      isComplete: false,
    },
  ]);

  useEffect(() => {
    const completedSteps = localStorage.getItem('completedSteps');
    if (completedSteps) {
      const parsed = JSON.parse(completedSteps);
      setSteps(prev => prev.map(step => ({
        ...step,
        isComplete: parsed[step.id] || false
      })));
    }
  }, []);

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
  };

  const handleStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, isComplete: true } : step
    ));
    setCurrentStep(null);
  };

  const handleGetStarted = () => {
    localStorage.setItem('onboardingComplete', 'true');
    router.push('/');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'tune':
        return <ContextForm onComplete={() => handleStepComplete('tune')} />;
      case 'sync':
        return <SyncForm onComplete={() => handleStepComplete('sync')} />;
      default:
        return null;
    }
  };

  const allStepsComplete = steps.every(step => step.isComplete);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-4">
            Welcome to ChatPRD
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Let's get you set up to start writing better PRDs with AI assistance.
          </p>
        </div>

        {!currentStep ? (
          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6 transition-all duration-200 ${
                  step.isComplete ? 'opacity-75' : 'hover:shadow-md hover:border-rose-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    step.isComplete 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-rose-100 text-rose-600'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                      {step.isComplete ? (
                        <span className="text-sm text-green-600 font-medium">Completed</span>
                      ) : (
                        <button
                          onClick={() => handleStepClick(step.id)}
                          className="text-sm text-rose-600 font-medium hover:text-rose-700 flex items-center gap-1"
                        >
                          Start
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}

            {allStepsComplete && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6">
            {renderStepContent()}
          </div>
        )}
      </div>
    </div>
  );
} 