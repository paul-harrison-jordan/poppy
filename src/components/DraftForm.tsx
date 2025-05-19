"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {  FilePlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import QuestionsForm from "./QuestionsForm"
import { generateDocument } from "@/lib/services/documentGenerator"
import { usePathname } from 'next/navigation'

interface Question {
  id: string
  text: string
}

const formVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
  exit: { opacity: 0, y: -30, transition: { duration: 0.2 } },
};

const queryVariants = {
  initial: { opacity: 0, y: 20, height: 0 },
  animate: { opacity: 1, y: 0, height: "auto", transition: { type: "spring", stiffness: 400, damping: 30 } },
  exit: { opacity: 0, y: -20, height: 0, transition: { duration: 0.2 } },
};

export default function DraftForm() {
  const pathname = usePathname();
  const currentPage = pathname.split('/').pop() || '';
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'initial' | 'vocabulary' | 'questions' | 'content'>('initial');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<{ docId: string; title: string; url: string } | null>(null);
  const [loadingState, setLoadingState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [showQuery, setShowQuery] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [showPastWork, setShowPastWork] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [matchedContext, setMatchedContext] = useState<string[]>([]);
  const [internalTerms, setInternalTerms] = useState<string[]>([]);
  const [showPrdsLink, setShowPrdsLink] = useState(false);
  const [prdLink, setPrdLink] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [pendingTermDefs, setPendingTermDefs] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);

  // Check for PRD draft data from brainstorm
  useEffect(() => {
    const prdDraft = localStorage.getItem('prdDraft');
    if (prdDraft) {
      try {
        const { title: draftTitle, summary, showQuery: draftShowQuery } = JSON.parse(prdDraft);
        if (draftTitle && summary) {
          setTitle(draftTitle);
          setQuery(summary);
          setShowQuery(draftShowQuery);
          // Clear the draft data after using it
          localStorage.removeItem('prdDraft');
        }
      } catch (error) {
        console.error('Error parsing PRD draft:', error);
      }
    }
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingState({
      isOpen: true,
      title: 'Generating Questions',
      message: 'We\'re analyzing your context to create relevant questions...',
    });
    setIsGenerating(true);
    setIsGeneratingQuestions(true);

    try {
      // 1. Get embedding for the query
      const embedRes = await fetch("/api/embed-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, query }),
      });
      if (!embedRes.ok) throw new Error("Failed to get embedding");
      const { queryEmbedding } = await embedRes.json();
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response");

      const embedding = queryEmbedding[0].embedding;

      // 2. Get matched context from Pinecone
      const matchRes = await fetch("/api/match-embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embedding),
      });
      if (!matchRes.ok) throw new Error("Failed to match embeddings");
      const { matchedContext } = await matchRes.json();
      if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response");

      setMatchedContext(matchedContext);

      // 3. Get vocabulary/terms
      const vocabRes = await fetch("/api/generate-vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, query, matchedContext, type: currentPage }),
      });
      if (!vocabRes.ok) throw new Error("Failed to generate vocabulary");
      const vocabData = await vocabRes.json();
      if (vocabData.teamTerms && vocabData.teamTerms.length > 0) {
        setPendingTerms(vocabData.teamTerms);
        setLoadingState({ isOpen: false, title: '', message: '' });
        setIsGenerating(false);
        setIsGeneratingQuestions(false);
        setStep("vocabulary");
        return;
      }

      const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}");
      const storedContext = localStorage.getItem("personalContext");
      await fetchQuestions(teamTerms, matchedContext, storedContext);
    } catch (error) {
      console.error("Error generating questions:", error);
      setError("Failed to generate questions. Please try again.");
      setLoadingState({ isOpen: false, title: '', message: '' });
      setIsGenerating(false);
      setIsGeneratingQuestions(false);
    }
  };

  // Helper to fetch questions
  type FetchQuestions = (
    teamTerms: Record<string, string>,
    matchedContext: string[],
    storedContext: string | null
  ) => Promise<void>;

  const fetchQuestions: FetchQuestions = async (teamTerms, matchedContext, storedContext) => {
    const questionsResponse = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: currentPage,
        title,
        query,
        matchedContext,
        storedContext,
        teamTerms,
      }),
    })
    if (!questionsResponse.ok) {
      throw new Error("Failed to generate questions")
    }
    const questionsData = await questionsResponse.json()
    if (!questionsData.questions || questionsData.questions.length === 0) {
      throw new Error("No questions generated")
    }
    setQuestions(questionsData.questions)
    setInternalTerms(questionsData.internalTerms || [])
    setShowQuestions(true)
    setIsGenerating(false)
    setIsGeneratingQuestions(false)
  }

  const handleQuestionsSubmit = async (answers: Record<string, string>) => {
    setShowQuestions(false);
    setIsGenerating(true);
    setIsGeneratingQuestions(false);
    setStep('generating'); // Show loading modal
    await generatePRD(answers);
  }

  const generatePRD = async (questionAnswers?: Record<string, string>) => {
    try {
      setIsGenerating(true);
      setIsGeneratingQuestions(false);

      const docData = await generateDocument(currentPage, title, query, questionAnswers, matchedContext)

      if (docData && docData.url) {
        setShowPrdsLink(true);
        setPrdLink(docData.url);
        const savedDocs = JSON.parse(localStorage.getItem(currentPage === 'strategy' ? "savedStrategy" : "savedPRD") || "[]");
        savedDocs.push({
          url: docData.url,
          title: docData.title || title,
          createdAt: new Date().toISOString(),
          id: docData.docId,
        });
        localStorage.setItem(currentPage === 'strategy' ? "savedStrategy" : "savedPRD", JSON.stringify(savedDocs));
        window.dispatchEvent(new CustomEvent("prdCountUpdated", { detail: { count: savedDocs.length } }));
      }
      localStorage.removeItem("draftFormState");
      setIsGenerating(false);
      setStep('done'); // Show success modal
    } catch (error) {
      console.error("Error processing query:", error);
      setIsGenerating(false);
      setStep('done'); // Show error state
    }
  }

  const handleDraftAnother = () => {
    setTitle("");
    setQuery("");
    setShowQuery(false);
    setSubmitted(false);
    setShowPrdsLink(false);
    setPrdLink(null);
    setShowQuestions(false);
    setQuestions([]);
    setIsGenerating(false);
    setIsGeneratingQuestions(false);
    setPendingTerms([]);
    setPendingTermDefs({});
    setMatchedContext([]);
    setInternalTerms([]);
    setStep('title'); // Show the title/query form
    localStorage.removeItem("draftFormState");
  }

  // Prefill from localStorage if available
  useEffect(() => {
    const stored = localStorage.getItem('teamTerms');
    if (stored) {
      const parsed = JSON.parse(stored);
      setPendingTermDefs(prev => ({ ...parsed, ...prev }));
    }
  }, [pendingTerms.length]);

  if (step === "title") {
    // Render title/query form
    return (
      <div className="flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="draft-form"
              onSubmit={handleQuery}
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4 w-full max-w-xl"
            >
              <AnimatePresence mode="wait">
                {!showQuery ? (
                  <motion.div
                    key="title-input"
                    variants={formVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="flex items-center gap-2"
                  >
                    <Input
                      ref={titleInputRef}
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      className="flex-1 h-12 text-base rounded-full border-neutral bg-white/90 backdrop-blur-sm shadow-sm focus-visible:ring-poppy"
                      placeholder={`Give your ${currentPage === 'strategy' ? 'Strategy' : 'PRD'} a title...`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => title.trim() && setShowQuery(true)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                        ${title.trim() ? 'bg-poppy text-white hover:bg-poppy/90 cursor-pointer focus:ring-poppy' : 'bg-neutral text-white cursor-not-allowed'}
                      `}
                      tabIndex={-1}
                      disabled={!title.trim()}
                    >
                      <svg
                        className="w-5 h-5 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="query-input"
                    variants={queryVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                  >
                    <div className="relative">
                      <div>
                        {showQuery && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowQuery(false);
                                }}
                                className="text-2xl font-bold text-poppy bg-poppy/10 hover:bg-poppy/20 transition px-3 py-2 flex items-center rounded-full"
                                aria-label={`Edit ${currentPage === 'strategy' ? 'Strategy' : 'PRD'} title`}
                              >
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 30 }}
                                  className="flex items-center gap-2 mb-2"
                                >
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-poppy/10 text-poppy">
                                    <FilePlus className="h-3 w-3" />
                                  </div>
                                </motion.div>
                                {title || `Untitled ${currentPage === 'strategy' ? 'Strategy' : 'PRD'}`}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <textarea
                                id="query"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                rows={4}
                                className="flex-1 rounded-xl border border-neutral px-3 py-2 text-gray-800 shadow-sm focus:border-poppy focus:outline-none focus:ring-1 focus:ring-poppy/20"
                                placeholder={`Ask Poppy to help draft your ${currentPage === 'strategy' ? 'Strategy' : 'PRD'}...`}
                                required
                                autoFocus
                              />
                              <button
                                type="submit"
                                className="w-10 h-10 rounded-full bg-poppy text-white flex items-center justify-center shadow-md hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy focus:ring-offset-2 transition-colors"
                              >
                                <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>
          ) : (
            <motion.div
              key="results"
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center flex flex-col items-center gap-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-8 max-w-xl mx-auto mt-8 border border-rose-100/30"
            >
              <div className="text-lg font-semibold text-gray-800">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center gap-3" aria-live="polite">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                      className="w-10 h-10 rounded-full border-2 border-rose-100 border-t-rose-500"
                    />
                    <span>
                      {isGeneratingQuestions ? (
                        "We're preparing a few clarifying questions to help us create the best possible PRD for you..."
                      ) : (
                        <>
                          Working on your PRD <span className="inline-block animate-pulse">...</span>
                        </>
                      )}
                    </span>
                  </div>
                ) : prdLink ? (
                  "First draft complete!"
                ) : (
                  "Something went wrong"
                )}
              </div>
              <div className="text-base text-gray-700">
                <span className="font-bold">Title:</span> {title}
              </div>
              <div className="text-base text-gray-700">
                <span className="font-bold">Prompt:</span> {query}
              </div>
              {showPrdsLink && prdLink && (
                <div className="flex flex-col gap-4">
                  <a
                    href={prdLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 px-6 py-2 text-white font-medium shadow-sm transition-colors"
                  >
                    View PRD in Google Drive
                  </a>
                  <button
                    onClick={handleDraftAnother}
                    className="inline-block rounded-full bg-poppy text-white px-6 py-2 font-medium shadow-sm hover:bg-poppy/90 transition-colors"
                  >
                    Draft Another
                  </button>
                </div>
              )}
              {!isGenerating && !prdLink && (
                <button
                  onClick={handleDraftAnother}
                  className="inline-block rounded-full bg-poppy text-white px-6 py-2 font-medium shadow-sm hover:bg-poppy/90 transition-colors"
                >
                  Try Again
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (step === "terms") {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          localStorage.setItem('teamTerms', JSON.stringify(pendingTermDefs));
          setIsGenerating(true);
          setIsGeneratingQuestions(true);
          setStep('generating'); // Show loading modal
          await fetchQuestions(pendingTermDefs, matchedContext, localStorage.getItem("personalContext"));
          setStep('questions');
        }}
        className="space-y-4 max-w-xl mx-auto"
      >
        <h2 className="text-lg font-bold text-poppy mb-2">Define Key Terms</h2>
        <p className="text-sm text-gray-500 mb-4">Please provide a definition for each key term below so your team is aligned on language.</p>
        {pendingTerms.map((term) => (
          <div key={term} className="flex flex-col gap-1">
            <label htmlFor={`term-${term}`} className="font-semibold text-poppy">{term}</label>
            <input
              id={`term-${term}`}
              type="text"
              value={pendingTermDefs[term] || ''}
              onChange={e => setPendingTermDefs(defs => ({ ...defs, [term]: e.target.value }))}
              className="rounded-xl border border-neutral px-3 py-2 text-gray-800 shadow-sm focus:border-poppy focus:outline-none focus:ring-1 focus:ring-poppy/20"
              placeholder={`Define \"${term}\"...`}
              required
            />
          </div>
        ))}
        <button
          type="submit"
          className="mt-4 px-4 py-2 rounded-full bg-poppy text-white font-semibold w-full shadow-sm hover:bg-poppy/90 transition-colors"
          disabled={pendingTerms.some(term => !pendingTermDefs[term] || !pendingTermDefs[term].trim())}
        >
          Continue
        </button>
      </form>
    );
  }

  if (step === "questions") {
    // Render questions form
    return (
      <QuestionsForm
        questions={questions}
        onSubmit={handleQuestionsSubmit}
        internalTerms={internalTerms}
      />
    )
  }

  if (step === "generating") {
    // Show loading spinner
    return (
      <div className="text-center flex flex-col items-center gap-4 backdrop-blur-sm rounded-2xl shadow-sm p-8 max-w-xl mx-auto mt-8 border border-neutral">
        <div className="text-lg font-semibold text-gray-800">
          <div className="flex flex-col items-center justify-center gap-3" aria-live="polite">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
              className="w-10 h-10 rounded-full border-2 border-neutral border-t-poppy"
            />
            <span>
              {isGeneratingQuestions ? (
                "We're preparing a few clarifying questions to help us create the best possible PRD for you..."
              ) : (
                <>
                  Working on your PRD <span className="inline-block animate-pulse">...</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (step === "done") {
    // Show result
    return (
      <div className="text-center flex flex-col items-center gap-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-8 max-w-xl mx-auto mt-8 border border-rose-100/30">
        <div className="text-lg font-semibold text-gray-800">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-3" aria-live="polite">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                className="w-10 h-10 rounded-full border-2 border-rose-100 border-t-rose-500"
              />
              <span>
                {isGeneratingQuestions ? (
                  "We're preparing a few clarifying questions to help us create the best possible PRD for you..."
                ) : (
                  <>
                    Working on your PRD <span className="inline-block animate-pulse">...</span>
                  </>
                )}
              </span>
            </div>
          ) : prdLink ? (
            "First draft complete!"
          ) : (
            "Something went wrong"
          )}
        </div>
        <div className="text-base text-gray-700">
          <span className="font-bold">Title:</span> {title}
        </div>
        <div className="text-base text-gray-700">
          <span className="font-bold">Prompt:</span> {query}
        </div>
        {showPrdsLink && prdLink && (
          <div className="flex flex-col gap-4">
            <a
              href={prdLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 px-6 py-2 text-white font-medium shadow-sm transition-colors"
            >
              View PRD in Google Drive
            </a>
            <button
              onClick={handleDraftAnother}
              className="inline-block rounded-full bg-poppy text-white px-6 py-2 font-medium shadow-sm hover:bg-poppy/90 transition-colors"
              type="button"
            >
              Draft Another
            </button>
          </div>
        )}
        {!isGenerating && !prdLink && (
          <button
            onClick={handleDraftAnother}
            className="inline-block rounded-full bg-poppy text-white px-6 py-2 font-medium shadow-sm hover:bg-poppy/90 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Rest of the component code remains unchanged */}
    </div>
  )
}
