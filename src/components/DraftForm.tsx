"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {  FilePlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import QuestionsForm from "./QuestionsForm"
import { collectStream } from "@/lib/collectStream"

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
  const [step, setStep] = useState<"title" | "terms" | "questions" | "generating" | "done">("title")
  const [title, setTitle] = useState("")
  const [query, setQuery] = useState("")
  const [showQuery, setShowQuery] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPrdsLink, setShowPrdsLink] = useState(false)
  const [prdLink, setPrdLink] = useState<string | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const queryInputRef = useRef<HTMLTextAreaElement>(null)
  const [internalTerms, setInternalTerms] = useState<string[]>([])
  const [pendingTerms, setPendingTerms] = useState<string[]>([])
  const [pendingTermDefs, setPendingTermDefs] = useState<Record<string, string>>({})
  const [matchedContext, setMatchedContext] = useState<string[]>([])

  // Load saved state from localStorage
  useEffect(() => {
    // Check for prdDraft from brainstorm
    const prdDraft = localStorage.getItem("prdDraft");
    if (prdDraft) {
      try {
        const { title, summary } = JSON.parse(prdDraft);
        setTitle(title);
        setQuery(summary);
      } catch {}
      localStorage.removeItem("prdDraft");
    }
    // Then check for saved draftFormState
    const savedState = localStorage.getItem("draftFormState")
    if (savedState) {
      const { title: savedTitle, query: savedQuery, showQuery, questions, showQuestions, submitted, showPrdsLink, prdLink } =
        JSON.parse(savedState)
      if (!title && savedTitle) setTitle(savedTitle)
      if (!query && savedQuery) setQuery(savedQuery)
      setShowQuery(showQuery)
      setQuestions(questions)
      setShowQuestions(showQuestions)
      setSubmitted(submitted)
      setShowPrdsLink(showPrdsLink)
      setPrdLink(prdLink)
    }
  }, [])

  // Save state to localStorage
  useEffect(() => {
    if (title || query || questions.length > 0 || submitted) {
      localStorage.setItem(
        "draftFormState",
        JSON.stringify({
          title,
          query,
          showQuery,
          questions,
          showQuestions,
          submitted,
          showPrdsLink,
          prdLink,
        }),
      )
    }
  }, [title, query, showQuery, questions, showQuestions, submitted, showPrdsLink, prdLink])

  // Focus inputs when state changes
  useEffect(() => {
    if (!showQuery && titleInputRef.current) {
      titleInputRef.current.focus()
    } else if (showQuery && queryInputRef.current) {
      queryInputRef.current.focus()
    }
  }, [showQuery])

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && title.trim() !== "") {
      e.preventDefault()
      setShowQuery(true)
    }
  }

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setShowPrdsLink(false)
    setIsGenerating(true)
    setIsGeneratingQuestions(true)
    const storedContext = localStorage.getItem("personalContext")
    try {
      console.log("Starting question generation...")
      // First, get questions from OpenAI

      // 1. Get embedding for the query
      const embedRes = await fetch("/api/embed-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, query }),
      })
      if (!embedRes.ok) throw new Error("Failed to get embedding")
      const { queryEmbedding } = await embedRes.json()
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response")

      const embedding = queryEmbedding[0].embedding

      // 2. Get matched context from Pinecone
      const matchRes = await fetch("/api/match-embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embedding),
      })
      if (!matchRes.ok) throw new Error("Failed to match embeddings")
      const { matchedContext } = await matchRes.json()
      if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response")

      setMatchedContext(matchedContext)

      // 3. Get vocabulary/terms
      const vocabRes = await fetch("/api/generate-vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, query, matchedContext }),
      })
      if (!vocabRes.ok) throw new Error("Failed to generate vocabulary")
      const vocabData = await vocabRes.json()
      if (vocabData.teamTerms && vocabData.teamTerms.length > 0) {
        setPendingTerms(vocabData.teamTerms)
        // setShowTermDefs(true)
        setIsGenerating(false)
        setIsGeneratingQuestions(false)
        setStep("terms")
        return
      }
      const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}")
      // If no terms, continue to generate questions as before
      await fetchQuestions(teamTerms, matchedContext, storedContext )
    } catch (error) {
      console.error("Error generating questions:", error)
      setIsGenerating(false)
      setIsGeneratingQuestions(false)
      // Fallback to direct PRD generation if question generation fails
      await generatePRD()
    }
  }
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

      // 1. Get embedding for the query
      const embedRes = await fetch("/api/embed-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, query }),
      })
      if (!embedRes.ok) throw new Error("Failed to get embedding")
      const { queryEmbedding } = await embedRes.json()
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response")

      const embedding = queryEmbedding[0].embedding

      // 2. Get matched context from Pinecone
      const matchRes = await fetch("/api/match-embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embedding),
      })
      if (!matchRes.ok) throw new Error("Failed to match embeddings")
      const { matchedContext } = await matchRes.json()
      if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response")

      // 3. Generate PRD content
      const storedContext = localStorage.getItem("personalContext")
      const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}")
      const genRes = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "prd",
          title,
          query,
          teamTerms,
          storedContext,
          additionalContext: matchedContext.join("\n"),
          questionAnswers,
        }),
      })

      const markdown = await collectStream(genRes)
      console.log("PRD generation response:", markdown)

      // 4. Create Google Doc
      const docRes = await fetch("/api/create-google-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          content: markdown,
        }),
      });
      if (!docRes.ok) throw new Error("Failed to create Google Doc");
      const docData = await docRes.json();

      if (docData && docData.url) {
        setShowPrdsLink(true);
        setPrdLink(docData.url);
        const savedPrds = JSON.parse(localStorage.getItem("savedPRD") || "[]");
        savedPrds.push({
          url: docData.url,
          title: docData.title || title,
          createdAt: new Date().toISOString(),
          id: docData.docId,
        });
        localStorage.setItem("savedPRD", JSON.stringify(savedPrds));
        window.dispatchEvent(new CustomEvent("prdCountUpdated", { detail: { count: savedPrds.length } }));
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
      <div>
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="draft-form"
              onSubmit={handleQuery}
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
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
                      className="flex-1 h-12 text-base rounded-full border-rose-100 bg-white/80 backdrop-blur-sm shadow-sm focus-visible:ring-rose-200"
                      placeholder="Give your PRD a title..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => title.trim() && setShowQuery(true)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                        ${title.trim() ? 'bg-[#EF6351] text-white hover:bg-[#d94d38] cursor-pointer focus:ring-[#EF6351]' : 'bg-[#E9DCC6] text-white cursor-not-allowed'}
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
                                className="text-2xl font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition  px-3 py-2 flex items-center"
                                aria-label="Edit PRD title"
                              >
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 30 }}
                                  className="flex items-center gap-2 mb-2"
                                >
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-500">
                                    <FilePlus className="h-3 w-3" />
                                  </div>
                                </motion.div>
                                {title || "Untitled PRD"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <textarea
                                id="query"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                rows={4}
                                className="flex-1 rounded-md border border-[#E9DCC6] bg-white px-3 py-2 text-[#232426] shadow-sm focus:border-[#EF6351] focus:outline-none focus:ring-1 focus:ring-[#EF6351]"
                                placeholder="Ask ChatPRD to help draft your PRD..."
                                required
                                autoFocus
                              />
                              <button
                                type="submit"
                                className="w-10 h-10 rounded-full bg-[#EF6351] flex items-center justify-center text-white shadow-md hover:bg-[#d94d38] focus:outline-none focus:ring-2 focus:ring-[#EF6351] focus:ring-offset-2 transition-colors"
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
                    className="inline-block rounded-full bg-white px-6 py-2 text-rose-500 font-medium border border-rose-200 hover:bg-rose-50/70 transition-colors"
                  >
                    Draft Another
                  </button>
                </div>
              )}
              {!isGenerating && !prdLink && (
                <button
                  onClick={handleDraftAnother}
                  className="inline-block rounded-full bg-white px-6 py-2 text-rose-500 font-medium border border-rose-200 hover:bg-rose-50/70 transition-colors"
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
        <h2 className="text-lg font-bold text-rose-600 mb-2">Define Key Terms</h2>
        <p className="text-sm text-gray-500 mb-4">Please provide a definition for each key term below so your team is aligned on language.</p>
        {pendingTerms.map((term) => (
          <div key={term} className="flex flex-col gap-1">
            <label htmlFor={`term-${term}`} className="font-semibold text-rose-600">{term}</label>
            <input
              id={`term-${term}`}
              type="text"
              value={pendingTermDefs[term] || ''}
              onChange={e => setPendingTermDefs(defs => ({ ...defs, [term]: e.target.value }))}
              className="rounded-md border border-rose-100 px-3 py-2 text-[#232426] shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-200 bg-white"
              placeholder={`Define "${term}"...`}
              required
            />
          </div>
        ))}
        <button
          type="submit"
          className="mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-rose-400 text-white font-semibold w-full shadow-sm hover:from-rose-600 hover:to-rose-500 transition-colors"
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
      <div className="text-center flex flex-col items-center gap-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-8 max-w-xl mx-auto mt-8 border border-rose-100/30">
        <div className="text-lg font-semibold text-gray-800">
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
              className="inline-block rounded-full bg-white px-6 py-2 text-rose-500 font-medium border border-rose-200 hover:bg-rose-50/70 transition-colors"
              type="button"
            >
              Draft Another
            </button>
          </div>
        )}
        {!isGenerating && !prdLink && (
          <button
            onClick={handleDraftAnother}
            className="inline-block rounded-full bg-white px-6 py-2 text-rose-500 font-medium border border-rose-200 hover:bg-rose-50/70 transition-colors"
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
