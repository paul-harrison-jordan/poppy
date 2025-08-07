'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, BookOpen, Target, Brain, FileText, Sparkles, Save, Clock, Users, Lightbulb, TrendingUp } from 'lucide-react';
import DocumentSyncOnboarding from './DocumentSyncOnboarding';

interface Section {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  placeholder: string;
  examples: string[];
  value: string;
  completed: boolean;
  focused: boolean;
  wordCount: number;
  minWords: number;
}

interface DocumentOnboardingProps {
  testMode?: boolean;
}

export default function DocumentOnboarding({ testMode = false }: DocumentOnboardingProps) {
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'strategy',
      title: 'Your Product Strategy & Vision',
      subtitle: 'Share your product vision, goals, and strategic priorities for the next 6-12 months',
      icon: <Target className="w-6 h-6" />,
      placeholder: "Start with your product vision...\n\nWhat are you building and why? What&apos;s your target market? What are your key objectives and how do you measure success?",
      examples: [
        "We&apos;re building a marketplace for sustainable fashion targeting eco-conscious millennials...",
        "Our B2B SaaS platform helps HR teams automate onboarding with a focus on remote-first companies...",
        "We&apos;re developing an AI-powered learning platform for K-12 students struggling with math..."
      ],
      value: '',
      completed: false,
      focused: false,
      wordCount: 0,
      minWords: 100
    },
    {
      id: 'methodology',
      title: 'Your Product Development Approach',
      subtitle: 'Describe how you think about product development, decision-making, and problem-solving',
      icon: <Brain className="w-6 h-6" />,
      placeholder: "Describe your methodology...\n\nHow do you approach product development? What frameworks do you use? How do you prioritize features and make product decisions?",
      examples: [
        "We follow a jobs-to-be-done framework, always starting with customer interviews...",
        "Our team uses OKRs quarterly with weekly sprint planning, focusing on outcome-based metrics...",
        "We practice design thinking with rapid prototyping, testing assumptions before building..."
      ],
      value: '',
      completed: false,
      focused: false,
      wordCount: 0,
      minWords: 80
    },
    {
      id: 'context',
      title: 'Your Team & Organizational Context',
      subtitle: 'Help us understand your team dynamics, constraints, and important background context',
      icon: <Users className="w-6 h-6" />,
      placeholder: "Tell us about your context...\n\nWhat&apos;s your team structure? What are your constraints or considerations? Any specific terminology, goals, or background we should know?",
      examples: [
        "We&apos;re a 5-person startup with limited budget, moving fast with monthly releases...",
        "I&apos;m a PM at a 500-person company, working with engineering, design, and data science teams...",
        "Leading product for a specific vertical within a larger enterprise, with compliance requirements..."
      ],
      value: '',
      completed: false,
      focused: false,
      wordCount: 0,
      minWords: 60
    }
  ]);

  const [currentFocus, setCurrentFocus] = useState<string>('strategy');
  const [showDocumentSync, setShowDocumentSync] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [, setIsComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoSaveInterval = useRef<NodeJS.Timeout>();

  // Auto-save functionality
  useEffect(() => {
    const saveToLocalStorage = () => {
      if (testMode) return;
      
      const data: Record<string, string> = {};
      sections.forEach(section => {
        data[section.id] = section.value;
      });
      localStorage.setItem('documentOnboarding', JSON.stringify(data));
      setLastSaved(new Date());
    };

    if (!testMode) {
      autoSaveInterval.current = setInterval(() => {
        saveToLocalStorage();
      }, 5000); // Auto-save every 5 seconds
    }

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [sections, testMode]);

  // Load existing data
  useEffect(() => {
    if (!testMode) {
      const saved = localStorage.getItem('documentOnboarding');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setSections(prev => prev.map(section => ({
            ...section,
            value: data[section.id] || '',
            wordCount: countWords(data[section.id] || ''),
            completed: countWords(data[section.id] || '') >= section.minWords
          })));
        } catch (error) {
          console.error('Error loading saved data:', error);
        }
      }
    }
  }, [testMode]);

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };


  const handleSectionChange = (sectionId: string, value: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        const wordCount = countWords(value);
        return {
          ...section,
          value,
          wordCount,
          completed: wordCount >= section.minWords
        };
      }
      return section;
    }));
  };

  const handleSectionFocus = (sectionId: string) => {
    setCurrentFocus(sectionId);
    setSections(prev => prev.map(section => ({
      ...section,
      focused: section.id === sectionId
    })));
  };

  const getCompletionPercentage = () => {
    const completedSections = sections.filter(s => s.completed).length;
    return Math.round((completedSections / sections.length) * 100);
  };

  const allSectionsComplete = sections.every(s => s.completed);

  const handleContinue = () => {
    if (allSectionsComplete) {
      // Save to the format expected by the main app
      if (!testMode) {
        const personalContext = {
          teamStrategy: sections.find(s => s.id === 'strategy')?.value || '',
          howYouThinkAboutProduct: sections.find(s => s.id === 'methodology')?.value || '',
          pillarGoalsKeyTermsBackground: sections.find(s => s.id === 'context')?.value || ''
        };
        localStorage.setItem('personalContext', JSON.stringify(personalContext));
      }
      
      setShowDocumentSync(true);
    }
  };

  const handleDocumentSyncComplete = () => {
    setIsComplete(true);
    setIsTransitioning(true);
    
    if (!testMode) {
      localStorage.setItem('onboardingComplete', 'true');
    }
    
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  };

  const handleSkipDocuments = () => {
    handleDocumentSyncComplete();
  };

  const getQualityIndicator = (section: Section) => {
    const ratio = section.wordCount / section.minWords;
    if (ratio >= 1.5) return { level: 'excellent', color: 'text-sprout-success', bg: 'bg-sprout-success/10' };
    if (ratio >= 1) return { level: 'good', color: 'text-lavender-secondary', bg: 'bg-lavender-secondary/10' };
    if (ratio >= 0.5) return { level: 'fair', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { level: 'needs-more', color: 'text-warm-neutral', bg: 'bg-gray-50' };
  };

  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 Welcome to Your Product OS!</h1>
          <p className="text-lg text-gray-600 mb-8">
            You&apos;ve successfully trained Poppy! I now understand your unique approach and I&apos;m ready to help you build amazing products.
          </p>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-poppy-primary/10">
            <p className="text-poppy-primary font-semibold">Redirecting to your personalized workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showDocumentSync) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white">
        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Almost there! 🚀</h1>
            <p className="text-lg text-gray-600">
              Let&apos;s connect your documents to give Poppy even more context about your product.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white">
      {/* Header */}
      <div className="border-b border-poppy-primary/10 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-poppy-primary to-lavender-secondary bg-clip-text text-transparent">
                Welcome to Poppy 🌺
              </h1>
              <p className="text-warm-neutral mt-1">Create your personalized AI product companion</p>
            </div>
            <div className="flex items-center gap-6">
              {lastSaved && (
                <div className="flex items-center gap-2 text-sm text-warm-neutral">
                  <Save className="w-4 h-4" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="text-right">
                <div className="text-2xl font-bold text-poppy-primary">{getCompletionPercentage()}%</div>
                <div className="text-xs text-warm-neutral">Complete</div>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-poppy-primary to-lavender-secondary h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-poppy-primary/10 p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-poppy-primary/10 to-lavender-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-poppy-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Let&apos;s get to know you</h2>
                <p className="text-gray-600 leading-relaxed">
                  Think of this as creating your product development philosophy document. The more detailed and thoughtful your responses, 
                  the better Poppy will understand your unique approach and be able to provide targeted, valuable assistance.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-poppy-primary/5 to-transparent rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-poppy-primary" />
                  <span className="text-sm font-medium text-poppy-primary">Strategic Context</span>
                </div>
                <p className="text-xs text-gray-600">Your vision, goals, and market understanding</p>
              </div>
              <div className="bg-gradient-to-br from-lavender-secondary/5 to-transparent rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-lavender-secondary" />
                  <span className="text-sm font-medium text-lavender-secondary">Your Methodology</span>
                </div>
                <p className="text-xs text-gray-600">How you approach problems and make decisions</p>
              </div>
              <div className="bg-gradient-to-br from-sprout-success/5 to-transparent rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-sprout-success" />
                  <span className="text-sm font-medium text-sprout-success">Team Context</span>
                </div>
                <p className="text-xs text-gray-600">Your environment, constraints, and dynamics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => {
            const quality = getQualityIndicator(section);
            const isActive = currentFocus === section.id;
            
            return (
              <div key={section.id} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${
                isActive ? 'border-poppy-primary/30 ring-4 ring-poppy-primary/5 shadow-lg' : 'border-gray-200'
              }`}>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        section.completed 
                          ? 'bg-sprout-success text-white' 
                          : isActive 
                            ? 'bg-poppy-primary/10 text-poppy-primary'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {section.completed ? <CheckCircle className="w-6 h-6" /> : section.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{section.title}</h3>
                        <p className="text-gray-600">{section.subtitle}</p>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${quality.bg} ${quality.color}`}>
                      {section.wordCount} / {section.minWords} words
                    </div>
                  </div>

                  {/* Examples (shown when not focused or empty) */}
                  {(!isActive || section.value.length === 0) && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-700">Example approaches:</span>
                      </div>
                      <div className="space-y-2">
                        {section.examples.map((example, idx) => (
                          <div key={idx} className="text-sm text-gray-600 italic flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>{example}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={section.value}
                    onChange={(e) => handleSectionChange(section.id, e.target.value)}
                    onFocus={() => handleSectionFocus(section.id)}
                    placeholder={section.placeholder}
                    className={`w-full rounded-xl border-2 transition-all duration-300 px-6 py-4 text-gray-800 placeholder-gray-400 resize-none focus:outline-none ${
                      isActive 
                        ? 'border-poppy-primary bg-white min-h-[300px]' 
                        : 'border-gray-200 bg-gray-50 min-h-[120px] hover:bg-white hover:border-gray-300'
                    }`}
                    style={{ 
                      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                      lineHeight: '1.6',
                      fontSize: '16px'
                    }}
                  />

                  {/* Quality feedback */}
                  {isActive && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {quality.level === 'excellent' && (
                          <div className="flex items-center gap-2 text-sprout-success">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">Excellent detail! This will help Poppy understand you deeply.</span>
                          </div>
                        )}
                        {quality.level === 'good' && (
                          <div className="flex items-center gap-2 text-lavender-secondary">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">Great progress! A bit more detail would be perfect.</span>
                          </div>
                        )}
                        {quality.level === 'fair' && (
                          <div className="flex items-center gap-2 text-amber-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">Good start! Try to add more specific details.</span>
                          </div>
                        )}
                        {quality.level === 'needs-more' && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">Share more details to help Poppy understand your approach.</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {section.value.length} characters
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="mt-12 text-center">
          <button
            onClick={handleContinue}
            disabled={!allSectionsComplete}
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 ${
              allSectionsComplete
                ? 'bg-gradient-to-r from-poppy-primary to-poppy-primary-hover text-white shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Continue to Document Sync</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          {!allSectionsComplete && (
            <p className="text-sm text-gray-500 mt-3">
              Complete all sections above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}