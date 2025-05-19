"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import QuestionsForm from "./QuestionsForm"
import { generateDocument } from "@/lib/services/documentGenerator"
import { usePathname } from 'next/navigation'
import { collectStream } from "@/lib/collectStream"

interface Question {
  id: string
  text: string
}

interface MatchedContext {
  metadata: {
    NPS_VERBATIM: string;
    NPS_SCORE_RAW: string;
    SURVEY_END_DATE: string;
    RECIPIENT_EMAIL: string;
    GMV: string;
    KLAVIYO_ACCOUNT_ID: string;
    row_number: number;
  };
}

interface LoadingState {
  isOpen: boolean;
  title: string;
  message: string;
}

const formVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
  exit: { opacity: 0, y: -30, transition: { duration: 0.2 } },
};

export default function DraftForm() {
  const pathname = usePathname();
  const currentPage = pathname.split('/').pop() || '';
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<'initial' | 'vocabulary' | 'questions' | 'content'>('initial');
  const [, setLoadingState] = useState<LoadingState>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [, setShowTitle] = useState(false);
  const [, setShowPastWork] = useState(false);
  const [, setCurrentQuestionIndex] = useState<number>(-1);
  const [matchedContext, setMatchedContext] = useState<MatchedContext[]>([]);
  const [internalTerms, setInternalTerms] = useState<string[]>([]);
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [pendingTermDefs, setPendingTermDefs] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setIsGeneratingQuestions] = useState(false);


  // Check for PRD draft data from brainstorm
  useEffect(() => {
    const prdDraft = localStorage.getItem('prdDraft');
    if (prdDraft) {
      try {
        const { title: draftTitle, summary } = JSON.parse(prdDraft);
        if (draftTitle && summary) {
          setTitle(draftTitle);
          setQuery(summary);
          // Clear the draft data after using it
          localStorage.removeItem('prdDraft');
        }
      } catch (error) {
        console.error('Error parsing PRD draft:', error);
      }
    }
  }, []);

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    try {
      setIsGenerating(true);
      setLoadingState({
        isOpen: true,
        title: 'Generating',
        message: 'Generating questions...'
      });

      // First, embed the request
      const embedResponse = await fetch("/api/embed-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query }),
      });
      const embedResponseJson = await embedResponse.json();
      const embedding = embedResponseJson.queryEmbedding[0].embedding;

      // Then match context
      const matchResponse = await fetch("/api/match-embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding }),
      });
      const { matchedContext } = await matchResponse.json();
      setMatchedContext(matchedContext);

      // Generate vocabulary
      const vocabResponse = await fetch("/api/generate-vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Draft PRD",
          query: query,
          matchedContext: matchedContext,
          type: 'prd',
          teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}")
        }),
      });
      const vocabText = await collectStream(vocabResponse);
      const vocabData = JSON.parse(vocabText);
      if (!Array.isArray(vocabData) || vocabData.length === 0) {
        throw new Error("No terms generated");
      }

      // Transform the terms into our TeamTerm format
      const formattedTerms = vocabData.map((term: string, index: number) => ({
        id: `term-${index}`,
        term: term,
        definition: ''
      }));

      setPendingTerms(formattedTerms.map(t => t.term));
      setStep('vocabulary');
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error("Error generating questions:", error);
      setLoadingState({
        isOpen: false,
        title: '',
        message: ''
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to fetch questions
  type FetchQuestions = (
    teamTerms: Record<string, string>,
    matchedContext: MatchedContext[],
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
    setIsGenerating(false)
    setIsGeneratingQuestions(false)
  }

  const handleQuestionsSubmit = async (answers: Record<string, string>) => {
    setIsGenerating(true);
    setIsGeneratingQuestions(false);
    await generatePRD(answers);
  };

  const generatePRD = async (questionAnswers?: Record<string, string>) => {
    try {
      setIsGenerating(true);
      setIsGeneratingQuestions(false);
      // Map matchedContext to string[] if needed
      const contextStrings = matchedContext.map(ctx => ctx.metadata?.NPS_VERBATIM || '').filter(Boolean);
      const docData = await generateDocument(currentPage, title, query, questionAnswers, contextStrings);
      if (docData && docData.url) {
        localStorage.removeItem("draftFormState");
        setIsGenerating(false);
        setStep('content'); // Show content step
      }
    } catch (error) {
      console.error("Error processing query:", error);
      setIsGenerating(false);
      // Optionally show an error message or fallback UI
    }
  };

  const handleDraftAnother = () => {
    setTitle("");
    setQuery("");
    setShowTitle(false);
    setShowPastWork(false);
    setQuestions([]);
    setIsGenerating(false);
    setIsGeneratingQuestions(false);
    setPendingTerms([]);
    setPendingTermDefs({});
    setMatchedContext([]);
    setInternalTerms([]);
    setStep('initial');
    localStorage.removeItem("draftFormState");
  };

  // Prefill from localStorage if available
  useEffect(() => {
    const stored = localStorage.getItem('teamTerms');
    if (stored) {
      const parsed = JSON.parse(stored);
      setPendingTermDefs(prev => ({ ...parsed, ...prev }));
    }
  }, [pendingTerms.length]);

  if (step === "initial") {
    // Render title/query form
    return (
      <div className="flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.form
            key="draft-form"
            onSubmit={e => { e.preventDefault(); handleQuery(); }}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4 w-full max-w-xl"
          >
            <div className="flex items-center gap-2">
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 h-12 text-base rounded-full border-neutral bg-white/90 backdrop-blur-sm shadow-sm focus-visible:ring-poppy"
                placeholder={`Give your ${currentPage === 'strategy' ? 'Strategy' : 'PRD'} a title...`}
                required
              />
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
          </motion.form>
        </AnimatePresence>
      </div>
    )
  }

  if (step === "vocabulary") {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          localStorage.setItem('teamTerms', JSON.stringify(pendingTermDefs));
          setIsGenerating(true);
          setIsGeneratingQuestions(true);
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

  if (step === "content") {
    // Show result (PRD link, etc.)
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
                Working on your PRD <span className="inline-block animate-pulse">...</span>
              </span>
            </div>
          ) : (
            "First draft complete!"
          )}
        </div>
        <div className="text-base text-gray-700">
          <span className="font-bold">Title:</span> {title}
        </div>
        <div className="text-base text-gray-700">
          <span className="font-bold">Prompt:</span> {query}
        </div>
        {/* Add PRD link or other result UI here */}
        <button
          onClick={handleDraftAnother}
          className="inline-block rounded-full bg-poppy text-white px-6 py-2 font-medium shadow-sm hover:bg-poppy/90 transition-colors"
          type="button"
        >
          Draft Another
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Rest of the component code remains unchanged */}
    </div>
  )
}
