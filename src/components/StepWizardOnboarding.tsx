'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Target, Brain, Users, Sparkles, ChevronRight } from 'lucide-react';
import DocumentSyncOnboarding from './DocumentSyncOnboarding';

interface Step {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  placeholder: string;
  examples: string[];
  value: string;
  minParagraphs: number;
}

interface StepWizardOnboardingProps {
  testMode?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'teamStrategy',
    title: 'Product Strategy & Vision',
    subtitle: 'Help me understand your product direction, target market, and success metrics',
    icon: <Target className="w-6 h-6" />,
    placeholder: "Example: We're building a B2B SaaS platform that helps remote teams collaborate better. Our target market is tech companies with 50-500 employees. We measure success through user engagement metrics and NPS scores.\n\nOur key objectives this quarter are to improve onboarding and launch our mobile app. We've identified three main user personas based on company size and technical sophistication.\n\nOur competitive advantage is in our API-first approach which allows deep integrations with existing workflows...\n\nTell me about your product strategy...",
    examples: [],
    value: '',
    minParagraphs: 3
  },
  {
    id: 'howYouThinkAboutProduct',
    title: 'Development Methodology',
    subtitle: 'Share how you approach product development and decision-making',
    icon: <Brain className="w-6 h-6" />,
    placeholder: "Example: We use the jobs-to-be-done framework and always start with customer interviews. Our team follows 2-week sprints with weekly demos. We prioritize features based on user impact and technical effort.\n\nMajor decisions require data backing or user research. We have a product council that meets weekly to review roadmap priorities. Our decision-making process includes stakeholder input but the PM has final say.\n\nWe measure success through leading indicators like user engagement and feature adoption rather than just revenue metrics...\n\nDescribe your product development approach...",
    examples: [],
    value: '',
    minParagraphs: 3
  },
  {
    id: 'pillarGoalsKeyTermsBackground',
    title: 'Team Context & Goals',
    subtitle: 'Provide context about your team, constraints, and environment',
    icon: <Users className="w-6 h-6" />,
    placeholder: "Example: We're a 10-person startup with seed funding, shipping weekly. Our main constraint is engineering bandwidth. We work in the healthcare space so HIPAA compliance is critical.\n\nKey terms we use: EMR integration, patient portal, clinical workflows, care coordination. Our main KPIs are patient satisfaction scores and provider adoption rates.\n\nWe have a distributed team across 3 time zones with a strong async-first culture. Most decisions are documented in Notion and we use Slack for daily coordination...\n\nWhat should I know about your context...",
    examples: [],
    value: '',
    minParagraphs: 3
  }
];

export default function StepWizardOnboarding({ testMode = false }: StepWizardOnboardingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState(STEPS);
  const [showDocumentSync, setShowDocumentSync] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  // Progress calculation for future use
  // const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Auto-focus textarea when step changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Scroll to top of container
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [currentStepIndex]);

  // Load existing data from personalContext
  useEffect(() => {
    if (!testMode) {
      const saved = localStorage.getItem('personalContext');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          
          // Update steps with saved data
          const updatedSteps = STEPS.map(step => ({
            ...step,
            value: data[step.id] || ''
          }));
          setSteps(updatedSteps);
          
          // Find first incomplete step
          const firstIncomplete = STEPS.findIndex(step => !data[step.id] || countParagraphs(data[step.id]) < step.minParagraphs);
          if (firstIncomplete !== -1) {
            setCurrentStepIndex(firstIncomplete);
          }
        } catch (error) {
          console.error('Error loading saved data:', error);
        }
      }
    }
  }, [testMode]);


  // Word counting utility (kept for potential future use)
  // const countWords = (text: string): number => {
  //   return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  // };

  const countParagraphs = (text: string): number => {
    if (!text.trim()) return 0;
    // Split by double newlines or single newlines followed by substantial content
    const paragraphs = text
      .trim()
      .split(/\n\s*\n|\n(?=\S)/)
      .filter(p => p.trim().length > 20) // Only count substantial paragraphs
      .length;
    return paragraphs;
  };

  const handleStepChange = (value: string) => {
    setSteps(prev => prev.map(step => 
      step.id === currentStep.id ? { ...step, value } : step
    ));
    
    // Save to personalContext in real-time
    if (!testMode) {
      const personalContext = JSON.parse(localStorage.getItem('personalContext') || '{}');
      personalContext[currentStep.id] = value;
      localStorage.setItem('personalContext', JSON.stringify(personalContext));
      console.log(`🔄 Saved to localStorage: ${currentStep.id}`, personalContext);
    } else {
      console.log('⚠️ Test mode - localStorage saving disabled');
    }
  };

  const canContinue = () => {
    const paragraphCount = countParagraphs(currentStep.value);
    return paragraphCount >= currentStep.minParagraphs;
  };

  const handleContinue = () => {
    if (!canContinue()) return;
    
    if (isLastStep) {
      setShowDocumentSync(true);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canContinue()) {
      handleContinue();
    }
  };

  const handleDocumentSyncComplete = () => {
    setIsTransitioning(true);
    
    if (!testMode) {
      localStorage.setItem('onboardingComplete', 'true');
    }
    
    // Stunning transition with longer duration
    setTimeout(() => {
      window.location.href = '/';
    }, 4000);
  };

  const handleSkipDocuments = () => {
    handleDocumentSyncComplete();
  };

  const getQualityFeedback = () => {
    const paragraphCount = countParagraphs(currentStep.value);
    const needed = currentStep.minParagraphs - paragraphCount;
    
    if (currentStep.value.trim().length === 0) return null;
    
    if (paragraphCount >= currentStep.minParagraphs) {
      if (paragraphCount > currentStep.minParagraphs) {
        return { message: "🌟 Excellent detail!", color: "text-sprout-success", bg: "bg-sprout-success/10" };
      } else {
        return { message: "✨ Perfect! Ready to continue.", color: "text-lavender-secondary", bg: "bg-lavender-secondary/10" };
      }
    } else {
      const pluralText = needed === 1 ? 'paragraph' : 'paragraphs';
      return { message: `${needed} more ${pluralText} needed`, color: "text-amber-600", bg: "bg-amber-50" };
    }
  };

  if (isTransitioning) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-poppy-primary via-lavender-secondary to-sprout-success opacity-95 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-white/30 rounded-full animate-float-delay-${i % 3}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Hero Icon */}
            <div className="relative mb-12">
              <div className="w-32 h-32 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border border-white/20 shadow-2xl animate-bounce-slow">
                <Sparkles className="w-16 h-16 text-white animate-pulse" />
              </div>
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-sprout-success rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-poppy-primary rounded-full animate-pulse"></div>
            </div>

            {/* Success Message */}
            <div className="space-y-6 mb-12">
              <h1 className="text-5xl font-bold text-white mb-6 animate-fade-in">
                🚀 <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">You&apos;re All Set!</span>
              </h1>
              <div className="animate-slide-up">
                <p className="text-xl text-white/90 mb-4 font-medium">
                  🧠 Poppy now understands your unique product approach
                </p>
                <p className="text-lg text-white/80">
                  Ready to help you build incredible products with personalized PRDs, strategic insights, and actionable recommendations.
                </p>
              </div>
            </div>

            {/* Feature Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in" style={{animationDelay: '1s'}}>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-poppy-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Strategic PRDs</h3>
                <p className="text-white/70 text-sm">Aligned with your vision</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-lavender-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Smart Insights</h3>
                <p className="text-white/70 text-sm">Based on your methodology</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-sprout-success/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Contextual Help</h3>
                <p className="text-white/70 text-sm">Tailored to your team</p>
              </div>
            </div>

            {/* Loading State */}
            <div className="animate-fade-in" style={{animationDelay: '2s'}}>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 inline-block">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white font-semibold text-lg">Launching your personalized workspace...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showDocumentSync) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Almost there! 🚀</h1>
            <p className="text-gray-600">
              Let&apos;s connect your documents to give me even more context.
            </p>
          </div>
          <DocumentSyncOnboarding
            onSyncComplete={handleDocumentSyncComplete}
            onCancel={handleSkipDocuments}
          />
        </div>
      </div>
    );
  }

  const quality = getQualityFeedback();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white flex flex-col" ref={containerRef}>
      {/* Compact Header */}
      <div className="border-b border-poppy-primary/10 bg-white/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${index <= currentStepIndex ? 'text-poppy-primary' : 'text-gray-300'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    index < currentStepIndex 
                      ? 'bg-sprout-success border-sprout-success text-white' 
                      : index === currentStepIndex
                        ? 'bg-white border-poppy-primary text-poppy-primary'
                        : 'bg-white border-gray-300 text-gray-300'
                  }`}>
                    {index < currentStepIndex ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.title.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-3 transition-all ${
                    index < currentStepIndex ? 'bg-sprout-success' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Centered on page */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl shadow-sm border border-poppy-primary/10 overflow-hidden">
          {/* Compact Step Header */}
          <div className="bg-gradient-to-r from-poppy-primary/5 to-lavender-secondary/5 px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <div className="text-poppy-primary">
                  {currentStep.icon}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{currentStep.title}</h2>
                <p className="text-gray-600 text-sm mt-0.5">{currentStep.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-6">
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={currentStep.value}
                onChange={(e) => handleStepChange(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={currentStep.placeholder}
                className="w-full h-96 rounded-xl border-2 border-gray-200 px-5 py-4 text-gray-800 placeholder-gray-500 resize-none focus:border-poppy-primary focus:outline-none focus:ring-4 focus:ring-poppy-primary/10 transition-all text-[15px] leading-relaxed"
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
              />

              {/* Compact Quality Feedback */}
              {quality && (
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-medium ${quality.color}`}>
                    {quality.message}
                  </div>
                  <div className="text-xs text-gray-500">
                    {countParagraphs(currentStep.value)}/{currentStep.minParagraphs} paragraphs
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact Action Area */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                {canContinue() && (
                  <span className="text-xs text-poppy-primary font-medium">✓ Ready</span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {canContinue() && (
                  <span className="text-xs text-gray-400">⌘ + Enter</span>
                )}
                <button
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    canContinue()
                      ? 'bg-poppy-primary text-white shadow-md hover:shadow-lg hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>{isLastStep ? 'Continue to Sync' : 'Next Step'}</span>
                  {canContinue() && <ChevronRight className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}