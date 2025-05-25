'use client';
import React, { useState, useRef, useEffect } from 'react';
import { collectStream } from "@/lib/collectStream"
import { generateDocument } from '@/lib/services/documentGenerator'
import { FileText, Sparkles, Calendar, Megaphone, Bot } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion";
import PoppyProactiveMessage from './poppy/PoppyProactiveMessage';
import { usePRDStore } from '@/store/prdStore';

declare global {
  interface Window {
    usePRDStore: typeof import('@/store/prdStore').usePRDStore;
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  className?: string;
}


interface Question {
  id: string;
  text: string;
  reasoning: string;
}

interface TeamTerm {
  id: string;
  term: string;
  definition: string;
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

type ChatMode = 'chat' | 'draft' | 'brainstorm' | 'schedule' | 'brand-messaging' | 'agent';


export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('brainstorm');
  const [draftStep, setDraftStep] = useState<'initial' | 'vocabulary' | 'questions' | 'content'>('initial');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [matchedContext, setMatchedContext] = useState<MatchedContext[]>([]);
  const [teamTerms, setTeamTerms] = useState<TeamTerm[]>([]);
  const [currentTermIndex, setCurrentTermIndex] = useState<number>(-1);
  const [termDefinitions, setTermDefinitions] = useState<Record<string, string>>({});
  const [, setInternalTerms] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [schedulingMessageId, setSchedulingMessageId] = useState<number | null>(null);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const agenticMessages = usePRDStore((state) => state.agenticMessages);
  const clearAgenticMessages = usePRDStore((state) => state.clearAgenticMessages);
  const [notifiedPrdIds, setNotifiedPrdIds] = useState<Set<string>>(new Set());
  const [showBounce, setShowBounce] = useState(false);

  const DOCUMENT_TYPES = {
    'brand-messaging': {
      type: 'brand-messaging',
      title: 'Brand Messaging',
      text: 'brand messaging'
    },
    'draft': {
      type: 'prd',
      title: 'Draft PRD',
      text: 'PRD'
    }
  } as const;

  const getDocumentType = (mode: ChatMode) => {
    return mode === 'brand-messaging' ? DOCUMENT_TYPES['brand-messaging'] : DOCUMENT_TYPES['draft'];
  };

  // Check for PRD summary on mount
  useEffect(() => {
    const prdSummary = localStorage.getItem('prdSummary');
    if (prdSummary) {
      setInput(prdSummary);
      // Clear the summary after using it
      localStorage.removeItem('prdSummary');
    }
  }, []);

  // Add useEffect for initial message
  useEffect(() => {
    if (messages.length === 0) {
      if (mode === 'draft') {
        setMessages([{
          role: 'assistant',
          content: "Share your product idea or concept, a JTDB, and any extra context you have that you want me to know"
        }]);
      } else if (mode === 'schedule') {
        setMessages([{
          role: 'assistant',
          content: "Find and schedule customer feedback. What kind of customers are you looking for? For example: customers who hate our list import, customers who need more django filters, or customers who will help me build a new feature"
        }]);
      } else if (mode === 'brainstorm') {
        setMessages([{
          role: 'assistant',
          content: "Develop an idea into a feature our customers will love. Share your initial thoughts or questions, and I can help you think through them."
        }]);
      } else if (mode === 'brand-messaging') {
        setMessages([{
          role: 'assistant',
          content: "Share your brand messaging document. Please share your brand messaging strategy, goals, or the key areas you'd like to focus on."
        }]);
      }
    }
  }, [mode, messages.length]);

  // Add useEffect for auto-scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        setInput('')
      }
    }
  }, [messages, messages.length]);

  // Effect to handle setting input when switching to PRD mode
  useEffect(() => {
    if (mode === 'draft' && pendingSummary) {
      console.log('Setting input from pending summary:', pendingSummary);
      setInput(pendingSummary);
      setPendingSummary(null);
    }
  }, [mode, pendingSummary]);

  // Listen for poppy-agentic-message events
  useEffect(() => {
    function handleAgenticMessage(event: CustomEvent<{ prdId: string }>) {
      const { prdId } = event.detail || {};
      if (!prdId || notifiedPrdIds.has(prdId)) return;
      setNotifiedPrdIds(prev => new Set(prev).add(prdId));
    }
    window.addEventListener('poppy-agentic-message', handleAgenticMessage as EventListener);
    return () => window.removeEventListener('poppy-agentic-message', handleAgenticMessage as EventListener);
  }, [notifiedPrdIds]);

  // Bounce the agentic button a few times when agentic messages appear
  useEffect(() => {
    if (agenticMessages.length > 0 && mode !== 'agent') {
      setShowBounce(true);
      const timer = setTimeout(() => setShowBounce(false), 2400); // ~3 slow bounces
      return () => clearTimeout(timer);
    }
    // If entering agent mode, stop bounce
    if (mode === 'agent') {
      setShowBounce(false);
    }
  }, [agenticMessages.length, mode]);

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    setDraftStep('initial');
    setQuestions([]);
    setCurrentQuestionIndex(-1);
    setQuestionAnswers({});
    setTeamTerms([]);
    setCurrentTermIndex(-1);
    setTermDefinitions({});
    setMatchedContext([]);
    
    if (newMode === 'draft') {
      setMessages([{
        role: 'assistant',
        content: "I&apos;ll help you draft a PRD. Please share your product idea or concept, a JTDB, and any extra context you have that you want me to know"
      }]);
    } else if (newMode === 'schedule') {
      setMessages([{
        role: 'assistant',
        content: "I&apos;ll help you find and schedule customer feedback. What kind of customers are you looking for? For example: &apos;customers who hate our list import&apos;, &apos;customers who need more django filters&apos;, or &apos;customers who will help me build a new feature&apos;"
      }]);
    } else if (newMode === 'brainstorm') {
      setMessages([{
        role: 'assistant',
        content: "I&apos;ll help you brainstorm ideas. Share your initial thoughts or questions, and I&apos;ll help you think through them."
      }]);
    } else if (newMode === 'brand-messaging') {
      setMessages([{
        role: 'assistant',
        content: "I&apos;ll help you create a brand messaging document. Please share your brand messaging strategy, goals, or the key areas you&apos;d like to focus on."
      }]);
    }
  };

  const showNextQuestion = async () => {
    if (!questions || questions.length === 0) {
      console.error("No questions available");
      return;
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Add a small delay before showing the next question
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: questions[nextIndex].text
      }]);
    } else {
      // Add a small delay before moving to content generation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // All questions answered, move to content generation
      setDraftStep('content');
      setLoading(true);
      
      // Show writing message
      const docType = getDocumentType(mode);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: <span className="animate-pulse">I&apos;m writing your {docType.text} document now...</span>
      }]);

      try {
        const docData = await generateDocument(
          'prd',
          'Draft PRD',
          typeof messages[1].content === 'string' ? messages[1].content : String(messages[1].content),
          questionAnswers
        );

        if (!docData.url) {
          throw new Error("No document URL received");
        }

        // Remove the thinking message
        setMessages(prev => prev.filter(msg => {
          if (typeof msg.content === 'string') {
            return msg.content !== "Thinking...";
          }
          if (React.isValidElement(msg.content)) {
            const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
            return element.props.children !== "Thinking...";
          }
          return true;
        }));

        // Show writing message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: <span className="animate-pulse">I&apos;m writing your {docType.text} document now...</span>
        }]);

        // Remove the writing message
        setMessages(prev => {
          const withoutWriting = prev.filter(msg => {
            if (typeof msg.content === 'string') {
              return msg.content !== `I&apos;m writing your ${docType.text} document now...`;
            }
            if (React.isValidElement(msg.content)) {
              const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
              return element.props.children !== `I&apos;m writing your ${docType.text} document now...`;
            }
            return true;
          });
          return [...withoutWriting, {
            role: 'assistant',
            content: (
              <div className="flex flex-col items-center gap-4">
                <p>Your {docType.text} is ready! Click below to view it in Google Docs.</p>
                <a
                  href={docData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-poppy text-white rounded-full font-medium hover:bg-poppy/90 transition-colors shadow-md"
                >
                  View {docType.title} in Google Docs
                </a>
              </div>
            )
          }];
        });

        // Save the document link
        const savedDocs = JSON.parse(localStorage.getItem("savedPRD") || "[]");
        savedDocs.push({
          url: docData.url,
          title: docData.title,
          createdAt: new Date().toISOString(),
          id: docData.docId,
        });
        localStorage.setItem("savedPRD", JSON.stringify(savedDocs));
        window.dispatchEvent(new CustomEvent("prdCountUpdated", { detail: { count: savedDocs.length } }));
        window.dispatchEvent(new CustomEvent("savedPRDUpdated"));
      } catch (error) {
        console.error("Error generating content:", error);
        setMessages(prev => {
          const withoutWriting = prev.filter(msg => msg.content !== "I&apos;m writing your PRD document now...");
          return [...withoutWriting, {
            role: 'assistant',
            content: "Sorry, I encountered an error while generating the content. Please try again."
          }];
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const showNextTerm = async () => {
    if (currentTermIndex < teamTerms.length - 1) {
      const nextIndex = currentTermIndex + 1;
      setCurrentTermIndex(nextIndex);
      
      // Add a small delay before showing the next term
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Can you please define "${teamTerms[nextIndex].term}"?`
      }]);
    } else {
      // Add a small delay before moving to questions
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // All terms defined, move to questions
      setDraftStep('questions');
      // Generate questions
      generateQuestions();
    }
  };

  const generateQuestions = async () => {
    try {
      // Add thinking message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: <span className="animate-pulse">Thinking of some questions to help us build a better PRD...</span>
      }]);

      const questionsResponse = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: mode === 'brand-messaging' ? "Brand Messaging" : "Draft PRD",
          query: messages[1].content,
          matchedContext: matchedContext,
          type: mode === 'brand-messaging' ? 'brand-messaging' : 'prd',
          teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}"),
          storedContext: localStorage.getItem("personalContext")
        }),
      });
      
      if (!questionsResponse.ok) {
        throw new Error("Failed to generate questions");
      }
      
      const questionsText = await collectStream(questionsResponse);
      const questionsData = JSON.parse(questionsText);
      
      // Validate the response
      if (!questionsData.questions || !Array.isArray(questionsData.questions) || questionsData.questions.length === 0) {
        console.error("Invalid questions response:", questionsData);
        throw new Error("No questions generated");
      }

      // Set the questions and internal terms
      setQuestions(questionsData.questions);
      if (questionsData.internalTerms) {
        setInternalTerms(questionsData.internalTerms);
      }
      
      // Remove the thinking message
      setMessages(prev => prev.filter(msg => {
        if (typeof msg.content === 'string') {
          return msg.content !== "Thinking of some questions to help us build a better PRD...";
        }
        if (React.isValidElement(msg.content)) {
          const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
          return element.props.children !== "Thinking of some questions to help us build a better PRD...";
        }
        return true;
      }));
      
      // Show the first question immediately
      setCurrentQuestionIndex(0);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: questionsData.questions[0].text
      }]);
    } catch (error) {
      console.error("Error generating questions:", error);
      // Remove the thinking message if there's an error
      setMessages(prev => prev.filter(msg => {
        if (typeof msg.content === 'string') {
          return msg.content !== "Thinking of some questions to help us build a better PRD...";
        }
        if (React.isValidElement(msg.content)) {
          const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
          return element.props.children !== "Thinking of some questions to help us build a better PRD...";
        }
        return true;
      }));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error while generating questions. Please try again."
      }]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const userMessage: ChatMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Thinking..." 
      }]);

      if (mode === 'draft') {
        switch (draftStep) {
          case 'initial':
            // First, embed the request
            const embedResponse = await fetch("/api/embed-request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: input }),
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
                query: input,
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
            setTeamTerms(formattedTerms);
            setDraftStep('vocabulary');
            // Show the first term immediately
            setCurrentTermIndex(0);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Can you please define "${formattedTerms[0].term}"?`
            }]);
            break;

          case 'vocabulary':
            // Save the definition for the current term
            const currentTerm = teamTerms[currentTermIndex];
            const newDefinitions = {
              ...termDefinitions,
              [currentTerm.term]: input
            };
            setTermDefinitions(newDefinitions);
            // Merge with existing teamTerms in localStorage
            const existingTeamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}") || {};
            const mergedTeamTerms = { ...existingTeamTerms, ...newDefinitions };
            localStorage.setItem("teamTerms", JSON.stringify(mergedTeamTerms));
            showNextTerm();
            break;

          case 'questions':
            // Save the answer for the current question
            const currentQuestion = questions[currentQuestionIndex];
            if (!currentQuestion) {
              console.error("No current question found");
              return;
            }

            console.log('Question status:', {
              currentIndex: currentQuestionIndex,
              totalQuestions: questions.length,
              isLastQuestion: currentQuestionIndex === questions.length - 1,
              answers: questionAnswers
            });

            setQuestionAnswers(prev => ({
              ...prev,
              [currentQuestion.id]: input
            }));

            // If this is the last question, we need to handle the transition to content generation
            if (currentQuestionIndex === questions.length - 1) {
              console.log('Handling last question, transitioning to content generation');
              // Remove the thinking message
              setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
              
              // Show writing message
              const docType = getDocumentType(mode);
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: <span className="animate-pulse">I&apos;m writing your {docType.text} document now...</span>
              }]);

              try {
                const docData = await generateDocument(
                  'prd',
                  'Draft PRD',
                  typeof messages[1].content === 'string' ? messages[1].content : String(messages[1].content),
                  questionAnswers
                );

                if (!docData.url) {
                  throw new Error("No document URL received");
                }

                // Remove the writing message
                setMessages(prev => {
                  const withoutWriting = prev.filter(msg => {
                    if (typeof msg.content === 'string') {
                      return msg.content !== `I&apos;m writing your ${docType.text} document now...`;
                    }
                    if (React.isValidElement(msg.content)) {
                      const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
                      return element.props.children !== `I&apos;m writing your ${docType.text} document now...`;
                    }
                    return true;
                  });
                  return [...withoutWriting, {
                    role: 'assistant',
                    content: (
                      <div className="flex flex-col items-center gap-4">
                        <p>Your {docType.text} is ready! Click below to view it in Google Docs.</p>
                        <a
                          href={docData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-poppy text-white rounded-full font-medium hover:bg-poppy/90 transition-colors shadow-md"
                        >
                          View {docType.title} in Google Docs
                        </a>
                      </div>
                    )
                  }];
                });

                // Save the document link
                const savedDocs = JSON.parse(localStorage.getItem("savedPRD") || "[]");
                savedDocs.push({
                  url: docData.url,
                  title: docData.title,
                  createdAt: new Date().toISOString(),
                  id: docData.docId,
                });
                localStorage.setItem("savedPRD", JSON.stringify(savedDocs));
                window.dispatchEvent(new CustomEvent("prdCountUpdated", { detail: { count: savedDocs.length } }));
                window.dispatchEvent(new CustomEvent("savedPRDUpdated"));
              } catch (error) {
                console.error("Error generating content:", error);
                setMessages(prev => {
                  const withoutWriting = prev.filter(msg => msg.content !== "I&apos;m writing your PRD document now...");
                  return [...withoutWriting, {
                    role: 'assistant',
                    content: "Sorry, I encountered an error while generating the content. Please try again."
                  }];
                });
              }
            } else {
              // If not the last question, show the next one
              console.log('Showing next question');
              showNextQuestion();
            }
            break;

          case 'content':
            // Remove the thinking message
            setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
            // In content mode, we don't need to do anything with the user's message
            // Just acknowledge it and continue
            const docType = getDocumentType(mode);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `I&apos;ve noted your feedback. The ${docType.text} has been generated and saved to Google Docs.`
            }]);
            break;
        }
      } else if (mode === 'schedule') {
        // Get embedding for the query
        const embedRes = await fetch("/api/embed-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
        });
        
        if (!embedRes.ok) throw new Error("Failed to get embedding");
        const { queryEmbedding } = await embedRes.json();
        if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response");

        const embedding = queryEmbedding[0].embedding;

        // Get matched feedback from Pinecone
        const matchRes = await fetch("/api/match-embeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({embedding, useCase: 'schedule'}),
        });

        if (!matchRes.ok) throw new Error("Failed to match embeddings");
        const { matchedContext } = await matchRes.json();
        if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response");

        // Remove the thinking message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));

        // Format each match as a text response
        const responses = matchedContext.map((match) => {
          const metadata = match.metadata;
          return `Feedback: ${metadata.NPS_VERBATIM}\nScore: ${metadata.NPS_SCORE_RAW}\nDate: ${metadata.SURVEY_END_DATE}\nEmail: ${metadata.RECIPIENT_EMAIL}\nGMV: ${metadata.GMV}\nKlaviyo Account ID: ${metadata.KLAVIYO_ACCOUNT_ID}\nRow: ${metadata.row_number}`;
        });

        // Add each response as a separate message
        for (const response of responses) {
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        }
      } else if (mode === 'brainstorm') {
        // Get embedding for the query
        const embedRes = await fetch("/api/embed-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
        });
        
        if (!embedRes.ok) throw new Error("Failed to get embedding");
        const { queryEmbedding } = await embedRes.json();
        if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response");

        const embedding = queryEmbedding[0].embedding;

        // Get matched context from Pinecone
        const matchRes = await fetch("/api/match-embeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embedding }),
        });

        if (!matchRes.ok) throw new Error("Failed to match embeddings");
        const { matchedContext } = await matchRes.json();
        if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response");

        setMatchedContext(matchedContext);

        // Generate brainstorm response
        const response = await fetch("/api/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            additionalContext: matchedContext.join("\n"),
            teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}"),
            storedContext: localStorage.getItem("personalContext"),
            startPrd: false
          }),
        });
        const responseText = await collectStream(response);

        // Remove the thinking message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      } else if (mode === 'brand-messaging') {
        switch (draftStep) {
          case 'initial':
            // First, embed the request
            const embedResponse = await fetch("/api/embed-request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: input }),
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
                title: "Brand Messaging",
                query: input,
                matchedContext: matchedContext,
                type: 'brand-messaging',
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
            setTeamTerms(formattedTerms);
            setDraftStep('vocabulary');
            // Show the first term immediately
            setCurrentTermIndex(0);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Can you please define "${formattedTerms[0].term}"?`
            }]);
            break;

          case 'vocabulary':
            // Save the definition for the current term
            const currentTerm = teamTerms[currentTermIndex];
            const newDefinitions = {
              ...termDefinitions,
              [currentTerm.term]: input
            };
            setTermDefinitions(newDefinitions);
            // Merge with existing teamTerms in localStorage
            const existingTeamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}") || {};
            const mergedTeamTerms = { ...existingTeamTerms, ...newDefinitions };
            localStorage.setItem("teamTerms", JSON.stringify(mergedTeamTerms));
            showNextTerm();
            break;

          case 'questions':
            // Save the answer for the current question
            const currentQuestion = questions[currentQuestionIndex];
            if (!currentQuestion) {
              console.error("No current question found");
              return;
            }

            setQuestionAnswers(prev => ({
              ...prev,
              [currentQuestion.id]: input
            }));

            // If this is the last question, we need to handle the transition to content generation
            if (currentQuestionIndex === questions.length - 1) {
              // Remove the thinking message
              setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
              
              // Show writing message
              const docType = getDocumentType(mode);
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: <span className="animate-pulse">I&apos;m writing your {docType.text} document now...</span>
              }]);

              try {
                const docData = await generateDocument(
                  'brand-messaging',
                  'Brand Messaging',
                  typeof messages[1].content === 'string' ? messages[1].content : String(messages[1].content),
                  questionAnswers
                );

                if (!docData.url) {
                  throw new Error("No document URL received");
                }

                // Remove the writing message
                setMessages(prev => {
                  const withoutWriting = prev.filter(msg => {
                    if (typeof msg.content === 'string') {
                      return msg.content !== "I&apos;m writing your brand messaging document now...";
                    }
                    if (React.isValidElement(msg.content)) {
                      const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
                      return element.props.children !== "I&apos;m writing your brand messaging document now...";
                    }
                    return true;
                  });
                  return [...withoutWriting, {
                    role: 'assistant',
                    content: (
                      <div className="flex flex-col items-center gap-4">
                        <p>Your {docType.text} is ready! Click below to view it in Google Docs.</p>
                        <a
                          href={docData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-poppy text-white rounded-full font-medium hover:bg-poppy/90 transition-colors shadow-md"
                        >
                          View {docType.title} in Google Docs
                        </a>
                      </div>
                    )
                  }];
                });

                // Save the document link
                const savedDocs = JSON.parse(localStorage.getItem("savedBrandMessaging") || "[]");
                savedDocs.push({
                  url: docData.url,
                  title: docData.title,
                  createdAt: new Date().toISOString(),
                  id: docData.docId,
                });
                localStorage.setItem("savedBrandMessaging", JSON.stringify(savedDocs));
                window.dispatchEvent(new CustomEvent("brandMessagingCountUpdated", { detail: { count: savedDocs.length } }));
                window.dispatchEvent(new CustomEvent("savedBrandMessagingUpdated"));
              } catch (error) {
                console.error("Error generating content:", error);
                setMessages(prev => {
                  const withoutWriting = prev.filter(msg => msg.content !== "I&apos;m writing your brand messaging document now...");
                  return [...withoutWriting, {
                    role: 'assistant',
                    content: "Sorry, I encountered an error while generating the content. Please try again."
                  }];
                });
              }
            } else {
              // If not the last question, show the next one
              showNextQuestion();
            }
            break;

          case 'content':
            // Remove the thinking message
            setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
            // In content mode, we don't need to do anything with the user's message
            // Just acknowledge it and continue
            const docType = getDocumentType(mode);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `I&apos;ve noted your feedback. The ${docType.text} has been generated and saved to Google Docs.`
            }]);
            break;
        }
      } else {
        // Regular chat mode
        const response = await fetch("/api/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            additionalContext: "",
            teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}"),
            storedContext: localStorage.getItem("personalContext"),
            startPrd: false
          }),
        });
        const responseText = await collectStream(response);

        // Remove the thinking message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // const isStrategyMode = (mode: ChatMode): mode is 'brand-messaging' => {
  //   return mode === 'brand-messaging';
  // };

  // const getDocumentTypeText = (mode: ChatMode): string => {
  //   return isStrategyMode(mode) ? 'brand messaging' : 'PRD';
  // };

  // const getDocumentTitle = (mode: ChatMode): string => {
  //   return isStrategyMode(mode) ? 'Brand Messaging' : 'PRD';
  // };

  // Handler to open agent mode
  const openAgentMode = () => {
    setMode('agent');
    clearAgenticMessages();
    if (agenticMessages.length > 0) {
      const msg = agenticMessages[0];
      setInput(
        `Poppy noticed your PRD "${msg.prdTitle}" is at risk. Open questions:\n- ${msg.openQuestions.join('\n- ')}`
      );
    }
  };

  return (
    <div className="relative">
      {/* Agent mode UI */}
      {mode === 'agent' && (
        <div className="p-4">
          {agenticMessages.map((msg, idx) => (
            <PoppyProactiveMessage
              key={idx}
              prdTitle={msg.prdTitle}
              openQuestions={msg.openQuestions}
              onScheduleWithCommenters={() => alert('Schedule with commenters')}
              onScheduleWithCustomers={() => alert('Schedule with customers')}
              onBrainstorm={() => alert('Brainstorm solutions')}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col h-screen w-full max-w-5xl mx-auto font-sans" style={{ background: 'none' }}>
        {/* Fixed header */}
        <div className="flex-none text-center bg-neutral/80 backdrop-blur-sm py-8 z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-semibold text-primary font-sans tracking-tight mb-3"
          >
            Chat with <span className="text-poppy">Poppy</span>
          </motion.h1>
          <AnimatePresence mode="wait">
            <motion.p 
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ 
                duration: 0.3,
                ease: "easeOut"
              }}
              className="text-xl text-primary/80 font-sans max-w-2xl mx-auto"
            >
              {mode === 'draft' ? 'Drafting a PRD' : 
               mode === 'schedule' ? 'Search for feedback and send outreach emails' :
               mode === 'brainstorm' ? 'Start with an idea or JTBD and let Poppy help you brainstorm' :
               mode === 'brand-messaging' ? 'Create a comprehensive brand messaging document' :
               'Ask me anything about your product, strategy, or ideas.'}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Scrollable message container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <div className="relative z-0 flex flex-col space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col space-y-4"
              >
                <AnimatePresence mode="popLayout">
                  {messages
                    .filter(msg => !(msg.role === 'assistant' && msg.content === 'Thinking...'))
                    .map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: "easeOut"
                        }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2 transition-all duration-300 group`}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: 0.3,
                            ease: "easeOut"
                          }}
                          className={
                            msg.role === 'user'
                              ? 'px-6 py-4 rounded-2xl max-w-[75%] font-semibold text-white bg-poppy shadow-lg hover:shadow-xl transition-shadow duration-200'
                              : `px-6 py-4 rounded-2xl max-w-[75%] font-sans text-primary bg-white/90 shadow-md hover:shadow-lg transition-shadow duration-200 whitespace-pre-line relative ${msg.className || ''}`
                          }
                        >
                          {msg.content}
                          {msg.role === 'assistant' && mode === 'schedule' && typeof msg.content === 'string' && msg.content.includes('Feedback:') && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ 
                                duration: 0.3,
                                delay: 0.2,
                                ease: "easeOut"
                              }}
                            >
                              {msg.content.includes('hasRecentOutreach: true') ? (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                  ⚠️ Someone has reached out to them in the last 28 days
                                </div>
                              ) : (
                                <button
                                  className={`absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 px-4 py-2 rounded-full text-white hover:opacity-90 text-sm font-medium flex items-center gap-2 ${
                                    schedulingMessageId === idx ? 'opacity-100' : ''
                                  } bg-poppy shadow-md hover:shadow-lg`}
                                  onClick={async () => {
                                    try {
                                      setSchedulingMessageId(idx);
                                      const content = msg.content as string;
                                      // Extract row number from the message content
                                      const rowMatch = content.match(/Row: (\d+)/);
                                      if (!rowMatch) {
                                        console.error("Could not find row number in message");
                                        return;
                                      }
                                      const rowNumber = parseInt(rowMatch[1]);

                                      // Extract Klaviyo Account ID from the message content
                                      const klaviyoMatch = content.match(/Klaviyo Account ID: ([^\n]+)/);
                                      if (!klaviyoMatch) {
                                        console.error("Could not find Klaviyo Account ID in message");
                                        return;
                                      }
                                      const klaviyoAccountId = klaviyoMatch[1];

                                      // Extract feedback data from the message
                                      const feedbackData = {
                                        NPS_VERBATIM: content.match(/Feedback: ([^\n]+)/)?.[1] || '',
                                        NPS_SCORE_RAW: content.match(/Score: ([^\n]+)/)?.[1] || '',
                                        SURVEY_END_DATE: content.match(/Date: ([^\n]+)/)?.[1] || '',
                                        RECIPIENT_EMAIL: content.match(/Email: ([^\n]+)/)?.[1] || '',
                                        GMV: content.match(/GMV: ([^\n]+)/)?.[1] || ''
                                      };

                                      // Get the email first
                                      const response = await fetch('/api/get-email', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          documentId: '1OTgVU9sTa2D8QFiDhYy-NuYAN3fQnKQQgrD1iR63jUo',
                                          rowNumber: rowNumber,
                                          columnIndex: 1 // Email is in column B (index 1)
                                        })
                                      });

                                      if (!response.ok) {
                                        console.error("Failed to fetch email");
                                        return;
                                      }
                                      const { email, hasRecentOutreach } = await response.json();
                                      console.log('Got email:', email, 'Has recent outreach:', hasRecentOutreach);

                                      if (hasRecentOutreach) {
                                        // Update the message content to include the outreach status
                                        setMessages(prev => prev.map((m, i) => 
                                          i === idx 
                                            ? { ...m, content: m.content + '\n\nhasRecentOutreach: true' }
                                            : m
                                        ));
                                        setSchedulingMessageId(null);
                                        return;
                                      }

                                      // Update the sheet with the feedback data
                                      const updateResponse = await fetch('/api/update-sheet', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          documentId: '1OTgVU9sTa2D8QFiDhYy-NuYAN3fQnKQQgrD1iR63jUo',
                                          klaviyoAccountId,
                                          feedbackData,
                                          email
                                        })
                                      });

                                      if (!updateResponse.ok) {
                                        console.error("Failed to update sheet");
                                        return;
                                      }

                                      const emailContent = `Hi there,

Thank you for taking the time to share your thoughts!

Here are the details from your feedback:
- Feedback: ${content.match(/Feedback: ([^\n]+)/)?.[1] || ''}
- Score: ${content.match(/Score: ([^\n]+)/)?.[1] || ''}
- Date: ${content.match(/Date: ([^\n]+)/)?.[1] || ''}
- GMV: ${content.match(/GMV: ([^\n]+)/)?.[1] || ''}

I&apos;d love to schedule some time to discuss this further. Would you be available for a quick call?

Best regards,
Your Name`;

                                      console.log('Email content:', emailContent);
                                      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&body=${encodeURIComponent(emailContent)}`;
                                      console.log('Opening Gmail URL:', gmailUrl);
                                      
                                      // Try to open the window
                                      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
                                    } catch (error) {
                                      console.error('Error:', error);
                                    }
                                    setSchedulingMessageId(null);
                                  }}
                                  disabled={schedulingMessageId === idx || (typeof msg.content === 'string' && msg.content.includes('hasRecentOutreach: true'))}
                                >
                                  {schedulingMessageId === idx ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Scheduling...
                                    </>
                                  ) : typeof msg.content === 'string' && msg.content.includes('hasRecentOutreach: true') ? (
                                    'Already Contacted'
                                  ) : (
                                    'Schedule Time'
                                  )}
                                </button>
                              )}
                            </motion.div>
                          )}
                        </motion.div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="px-6 py-4 rounded-2xl bg-white/90 text-primary/60 text-base font-sans animate-pulse shadow-md">
                      {mode === 'schedule' ? 'Searching...' : 'Thinking...'}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Fixed input form */}
        <div className="flex-none px-4 py-6 bg-transparent">
          <form onSubmit={sendMessage} className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <div className="w-full border border-neutral/40 rounded-xl bg-white/90 overflow-hidden flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="w-full border-2 border-poppy/50 rounded-xl bg-white/90 overflow-hidden flex flex-col">
                  <textarea
                    className="w-full rounded-t-xl px-6 py-4 focus:ring-2 focus:ring-poppy focus:outline-none text-base bg-neutral/80 placeholder-gray-400 transition-all font-sans resize-none border-0 shadow-none"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={
                      mode === 'draft' 
                        ? draftStep === 'questions' 
                          ? `Answer question ${currentQuestionIndex + 1} of ${questions.length}...`
                          : draftStep === 'vocabulary'
                            ? `Define term ${currentTermIndex + 1} of ${teamTerms.length}...`
                            : "Share your product idea..."
                        : mode === 'schedule'
                          ? "Customers who hate our list import, customers who need more django filters, customers who will help me build a new feature..."
                          : mode === 'brainstorm'
                            ? "Like talking to a version of you who remembers everything"
                            : mode === 'brand-messaging'
                              ? draftStep === 'questions'
                                ? `Answer question ${currentQuestionIndex + 1} of ${questions.length}...`
                                : draftStep === 'vocabulary'
                                  ? `Define term ${currentTermIndex + 1} of ${teamTerms.length}...`
                                  : "Share your brand messaging strategy, goals, and key focus areas..."
                        : "Ask me anything..."
                    }
                    disabled={loading}
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                  />
                  <div className="flex gap-3 p-3 border-t border-neutral/40 bg-neutral/80">
                    <div className="flex gap-3">
                      <motion.button
                        type="button"
                        onClick={() => handleModeChange('brainstorm')}
                        className={`p-2.5 rounded-full transition-all duration-200 ${
                          mode === 'brainstorm' 
                          ? 'bg-poppy/20 text-poppy shadow-inner' 
                          : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy hover:shadow-md'
                        }`}
                        title="Brainstorm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleModeChange('draft')}
                        className={`p-2.5 rounded-full transition-all duration-200 ${
                          mode === 'draft' 
                          ? 'bg-poppy/20 text-poppy shadow-inner' 
                          : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy hover:shadow-md'
                        }`}
                        title="Draft PRD"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FileText className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleModeChange('schedule')}
                        className={`p-2.5 rounded-full transition-all duration-200 ${
                          mode === 'schedule' 
                          ? 'bg-poppy/20 text-poppy shadow-inner' 
                          : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy hover:shadow-md'
                        }`}
                        title="Schedule"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Calendar className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleModeChange('brand-messaging')}
                        className={`p-2.5 rounded-full transition-all duration-200 ${
                          mode === 'brand-messaging' 
                          ? 'bg-poppy/20 text-poppy shadow-inner' 
                          : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy hover:shadow-md'
                        }`}
                        title="Brand Messaging"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Megaphone className="w-4 h-4" />
                      </motion.button>
                      {/* Agentic (Bot) button: show if agentic messages exist or in agent mode */}
                      {(agenticMessages.length > 0 || mode === 'agent') && (
                        <motion.button
                          type="button"
                          className={`p-2.5 rounded-full transition-all duration-200 bg-poppy/20 text-poppy shadow-inner ${
                            showBounce ? 'animate-bounce-slow' : ''
                          } ${mode === 'agent' ? 'ring-2 ring-poppy bg-poppy text-white' : ''}`}
                          title="Poppy has a suggestion!"
                          onClick={openAgentMode}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.96 }}
                        >
                          <Bot className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                    <div className="flex-1" />
                    <motion.button
                      type="submit"
                      className={`p-2.5 rounded-full transition-all duration-200 ${
                        input.trim() 
                          ? 'bg-poppy text-white hover:bg-poppy/90' 
                          : 'bg-white/80 text-poppy/40 hover:bg-white'
                      }`}
                      disabled={loading || !input.trim()}
                      whileHover={{ scale: input.trim() ? 1.02 : 1 }}
                      whileTap={{ scale: input.trim() ? 0.98 : 1 }}
                    >
                      <svg className="w-4 h-4 -rotate-45" fill={input.trim() ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 