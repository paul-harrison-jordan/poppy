"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Edit2, ArrowRight, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Question {
  id: string
  text: string
}

interface QuestionsFormProps {
  questions: Question[]
  onSubmit: (answers: Record<string, string>) => void
  internalTerms?: string[]
}

export default function QuestionsForm({ questions, onSubmit, internalTerms = [] }: QuestionsFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(
    questions.reduce((acc, q) => ({ ...acc, [q.id]: "" }), {}),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for term definitions
  const [termDefs, setTermDefs] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teamTerms');
      if (stored) return JSON.parse(stored);
    }
    return internalTerms.reduce((acc, term) => ({ ...acc, [term]: '' }), {});
  });

  // Save to localStorage whenever termDefs changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('teamTerms', JSON.stringify(termDefs));
    }
  }, [termDefs]);

  // Only allow proceeding if all term definitions are filled
  const allTermsDefined = internalTerms.length === 0 || internalTerms.every(term => termDefs[term]?.trim().length > 0);

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleTermChange = (term: string, value: string) => {
    setTermDefs(prev => ({ ...prev, [term]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Small delay to show the animation
    await new Promise((resolve) => setTimeout(resolve, 500))

    onSubmit(answers)
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleStepClick = (index: number) => {
    setCurrentStep(index)
  }

  const currentQuestion = questions[currentStep]
  const currentValue = answers[currentQuestion.id]
  const isLastStep = currentStep === questions.length - 1
  const isFirstStep = currentStep === 0
  const hasAnswer = currentValue.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      {/* Internal Terms Definitions Section */}
      {internalTerms.length > 0 && (
        <div className="backdrop-blur-sm rounded-2xl shadow-sm border border-neutral p-6 mb-4">
          <h2 className="text-lg font-bold text-poppy mb-2">Define Key Terms</h2>
          <p className="text-sm text-gray-500 mb-4">Please provide a definition for each key term below so your team is aligned on language.</p>
          <div className="space-y-4">
            {internalTerms.map(term => (
              <div key={term} className="flex flex-col gap-1">
                <label htmlFor={`term-${term}`} className="font-semibold text-poppy">{term}</label>
                <input
                  id={`term-${term}`}
                  type="text"
                  value={termDefs[term] || ''}
                  onChange={e => handleTermChange(term, e.target.value)}
                  className="rounded-xl border border-neutral px-3 py-2 text-gray-800 shadow-sm focus:border-poppy focus:outline-none focus:ring-1 focus:ring-poppy/20"
                  placeholder={`Define \"${term}\"...`}
                  required
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-gray-800 mb-2"
        >
          Just a few questions
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-gray-500"
        >
          Help us understand your needs better
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="backdrop-blur-sm rounded-2xl shadow-sm border border-neutral p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prevent proceeding to questions until all terms are defined */}
          {!allTermsDefined && (
            <div className="text-poppy font-semibold text-center mb-4">Please define all key terms above to continue.</div>
          )}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={`question-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-xl font-medium text-gray-800 mb-4"
              >
                {currentQuestion.text}
              </motion.p>
            </AnimatePresence>
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`textarea-${currentStep}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full"
                >
                  <textarea
                    id={currentQuestion.id}
                    value={currentValue}
                    onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-neutral backdrop-blur-sm px-4 py-3 text-gray-800 shadow-sm focus:border-poppy focus:outline-none focus:ring-1 focus:ring-poppy/20 pr-12 pb-12 resize-none"
                    placeholder="Type your answer here..."
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => {
                      const textarea = document.getElementById(currentQuestion.id) as HTMLTextAreaElement
                      textarea.focus()
                    }}
                    className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-poppy/20 transition-colors bg-poppy/10 text-poppy hover:bg-poppy/20"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!isFirstStep && (
                <motion.button
                  whileHover={{ scale: 1.05, x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handlePrevious}
                  className="text-xs text-poppy hover:text-poppy/80 flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  <span>Previous</span>
                </motion.button>
              )}
            </div>

            <div className="flex justify-center gap-2">
              {questions.map((_, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentStep
                      ? "bg-poppy shadow-sm"
                      : index < currentStep
                        ? "bg-poppy/20"
                        : "bg-poppy/10",
                  )}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            <motion.button
              whileHover={hasAnswer ? { scale: 1.05 } : {}}
              whileTap={hasAnswer ? { scale: 0.95 } : {}}
              type={isLastStep ? "submit" : "button"}
              onClick={isLastStep ? undefined : handleNext}
              disabled={!hasAnswer || isSubmitting || !allTermsDefined}
              className={cn(
                "rounded-full flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all px-4 py-2",
                hasAnswer && allTermsDefined
                  ? isLastStep
                    ? "bg-poppy text-white hover:bg-poppy/90 focus:ring-poppy/20"
                    : "bg-poppy text-white hover:bg-poppy/90 focus:ring-poppy/20"
                  : "bg-poppy/10 text-poppy/50 cursor-not-allowed",
              )}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : isLastStep ? (
                <>
                  <span className="mr-2">Submit</span>
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
    </motion.div>
  )
}
