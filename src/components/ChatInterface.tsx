'use client';
import React, { useState, useRef, useEffect } from 'react';
import { collectStream } from "@/lib/collectStream"
import { FileText, Sparkles, Calendar, Target } from "lucide-react"
import { useRouter } from 'next/navigation';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
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

type ChatMode = 'chat' | 'draft' | 'brainstorm' | 'schedule' | 'strategy';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('chat');
  const [draftStep, setDraftStep] = useState<'initial' | 'vocabulary' | 'questions' | 'content'>('initial');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [matchedContext, setMatchedContext] = useState<any[]>([]);
  const [teamTerms, setTeamTerms] = useState<TeamTerm[]>([]);
  const [currentTermIndex, setCurrentTermIndex] = useState<number>(-1);
  const [termDefinitions, setTermDefinitions] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [schedulingMessageId, setSchedulingMessageId] = useState<number | null>(null);
  const router = useRouter();

  // Add useEffect for auto-scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]); // Scroll when messages change or loading state changes

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
        content: "I'll help you draft a PRD. Please share your product idea or concept, and I'll guide you through the process."
      }]);
    } else if (newMode === 'schedule') {
      setMessages([{
        role: 'assistant',
        content: "I'll help you find and schedule customer feedback. What kind of customers are you looking for? For example: 'customers who hate our list import', 'customers who need more django filters', or 'customers who will help me build a new feature'"
      }]);
    } else if (newMode === 'brainstorm') {
      setMessages([{
        role: 'assistant',
        content: "I'll help you brainstorm ideas. Share your initial thoughts or questions, and I'll help you think through them."
      }]);
    }
  };

  const showNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: questions[nextIndex].text
      }]);
    } else {
      // All questions answered, move to content generation
      setDraftStep('content');
      generateContent();
    }
  };

  const showNextTerm = () => {
    if (currentTermIndex < teamTerms.length - 1) {
      const nextIndex = currentTermIndex + 1;
      setCurrentTermIndex(nextIndex);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Can you please define "${teamTerms[nextIndex].term}"?`
      }]);
    } else {
      // All terms defined, move to questions
      setDraftStep('questions');
      // Generate questions
      generateQuestions();
    }
  };

  const generateContent = async () => {
    try {
      setLoading(true);
      // Format questions and answers for the content generation
      const questionsWithAnswers = questions.map(q => ({
        id: q.id,
        text: q.text,
        reasoning: q.reasoning,
        answer: questionAnswers[q.id]
      }));

      // Format the questions and answers as a clear string for OpenAI
      const qaContext = questionsWithAnswers
        .map(q => `Question: ${q.text}\nReasoning: ${q.reasoning}\nAnswer: ${q.answer}`)
        .join('\n\n');

      const storedContext = localStorage.getItem("personalContext");
      const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}");

      // Show writing message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm writing your PRD document now..."
      }]);

      const contentResponse = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Draft PRD",
          query: messages[1].content, // The initial product idea
          matchedContext: matchedContext,
          type: 'prd',
          storedContext: storedContext,
          questions: questionsWithAnswers,
          teamTerms: teamTerms
        }),
      });
      const contentText = await collectStream(contentResponse);

      // Create Google Doc
      const docResponse = await fetch("/api/create-google-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Draft PRD",
          content: contentText
        }),
      });
      const docData = await docResponse.json();
      console.log('Doc response:', docData); // Add logging to debug

      if (!docData.url) {
        throw new Error("No document URL received");
      }

      // Remove the writing message and add the document link
      setMessages(prev => {
        const withoutWriting = prev.filter(msg => msg.content !== "I'm writing your PRD document now...");
        return [...withoutWriting, {
          role: 'assistant',
          content: (
            <div className="flex flex-col items-center gap-4">
              <p>Your PRD is ready! Click below to view it in Google Docs.</p>
              <a
                href={docData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-poppy text-white rounded-full font-medium hover:bg-poppy/90 transition-colors shadow-md"
              >
                View PRD in Google Docs
              </a>
            </div>
          )
        }];
      });
    } catch (error) {
      console.error("Error generating content:", error);
      setMessages(prev => {
        const withoutWriting = prev.filter(msg => msg.content !== "I'm writing your PRD document now...");
        return [...withoutWriting, {
          role: 'assistant',
          content: "Sorry, I encountered an error while generating the content. Please try again."
        }];
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    try {
      const questionsResponse = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Draft PRD",
          query: messages[1].content,
          matchedContext: matchedContext,
          type: 'prd'
        }),
      });
      const questionsText = await collectStream(questionsResponse);
      const questionsData = JSON.parse(questionsText);
      if (!questionsData.questions || questionsData.questions.length === 0) {
        throw new Error("No questions generated");
      }
      setQuestions(questionsData.questions);
      // Show the first question immediately
      setCurrentQuestionIndex(0);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: questionsData.questions[0].text
      }]);
    } catch (error) {
      console.error("Error generating questions:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error while generating questions. Please try again."
      }]);
    }
  };

  const handleSummarizeAndSave = async () => {
    if (!messages.length) return;
    try {
      setLoading(true);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm summarizing our conversation and preparing to start the PRD..." 
      }]);

      const storedContext = localStorage.getItem("personalContext");
      const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}");
      const chatMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          additionalContext: Array.isArray(matchedContext) ? matchedContext.join("\n") : "",
          teamTerms,
          storedContext,
          startPrd: true
        }),
      });
      const text = await res.text();
      let prd;
      try {
        prd = JSON.parse(text);
      } catch {
        alert('Failed to parse PRD summary. Please try again.');
        return;
      }

      // Remove the loading message
      setMessages(prev => prev.filter(msg => msg.content !== "I'm summarizing our conversation and preparing to start the PRD..."));

      // Switch to PRD mode
      setMode('draft');
      setDraftStep('initial');
      
      // Clear existing messages and add the summary
      setMessages([{
        role: 'assistant',
        content: "I'll help you draft a PRD. Please share your product idea or concept, and I'll guide you through the process."
      }]);

      // Set the input to the PRD summary
      setInput(prd.summary);

      // Save the PRD data for later use
      localStorage.setItem('prdDraft', JSON.stringify(prd));
    } catch (error) {
      console.error(error);
      alert('Failed to generate PRD summary.');
    } finally {
      setLoading(false);
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

      if (mode === 'schedule') {
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
      } else if (mode === 'draft') {
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
              body: JSON.stringify(embedding),
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
                type: 'prd'
              }),
            });
            const vocabText = await collectStream(vocabResponse);
            const vocabData = JSON.parse(vocabText);
            if (!vocabData.teamTerms || vocabData.teamTerms.length === 0) {
              throw new Error("No terms generated");
            }
            // Transform the terms into our TeamTerm format
            const formattedTerms = vocabData.teamTerms.map((term: string, index: number) => ({
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
              [currentTerm.id]: input
            };
            setTermDefinitions(newDefinitions);
            // Save to localStorage
            localStorage.setItem("teamTerms", JSON.stringify(newDefinitions));
            showNextTerm();
            break;

          case 'questions':
            // Save the answer for the current question
            const currentQuestion = questions[currentQuestionIndex];
            setQuestionAnswers(prev => ({
              ...prev,
              [currentQuestion.id]: input
            }));
            showNextQuestion();
            break;

          case 'content':
            // Handle follow-up questions or clarifications
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
            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
            break;
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
          body: JSON.stringify({embedding, useCase: 'brainstorm'}),
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

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-5xl mx-auto font-sans" style={{ background: 'none' }}>
      <div className="flex-1 min-h-0 overflow-y-auto px-0 py-2 space-y-2">
        <div className="text-center sticky top-0 bg-white/80 backdrop-blur-sm py-4 z-10">
          <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Chat with <span className="text-poppy">Poppy</span></h1>
          <p className="text-lg text-primary/80 font-sans">
            {mode === 'draft' ? 'Drafting a PRD' : 
             mode === 'schedule' ? 'Search for feedback and send outreach emails' :
             mode === 'brainstorm' ? 'Start with an idea or JTBD and let Poppy help you brainstorm' :
             'Ask me anything about your product, strategy, or ideas.'}
          </p>
        </div>
        <div className="relative z-0 flex flex-col space-y-2">
          {messages
            .filter(msg => !(msg.role === 'assistant' && msg.content === 'Thinking...'))
            .map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300 group`}>
                <div className={
                  msg.role === 'user'
                    ? 'px-5 py-3 rounded-2xl max-w-[70%] text-base bg-poppy/20 text-primary font-sans shadow-md'
                    : 'px-5 py-3 rounded-2xl max-w-[70%] text-base bg-sprout/20 text-primary font-mono shadow-md whitespace-pre-line relative'
                }>
                  {msg.content}
                  {msg.role === 'assistant' && mode === 'schedule' && typeof msg.content === 'string' && msg.content.includes('Feedback:') && (
                    <>
                      {msg.content.includes('hasRecentOutreach: true') ? (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                          ⚠️ Someone has reached out to them in the last 28 days
                        </div>
                      ) : (
                        <button
                          className={`absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 rounded-full text-white hover:opacity-90 text-sm font-medium flex items-center gap-2 ${
                            schedulingMessageId === idx ? 'opacity-100' : ''
                          } bg-poppy`}
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

I'd love to schedule some time to discuss this further. Would you be available for a quick call?

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
                    </>
                  )}
                </div>
              </div>
            ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-5 py-3 rounded-2xl bg-neutral text-primary/60 text-base font-sans animate-pulse shadow-md">
                {mode === 'schedule' ? 'Searching...' : 'Thinking...'}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" /> {/* Add some padding at the bottom */}
        </div>
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 items-center px-0 py-6 bg-transparent" style={{ flexShrink: 0 }}>
        <div className="flex-1 relative">
          <div className="w-full border border-neutral rounded-xl bg-white/80 overflow-hidden flex flex-col">
            <textarea
              className="w-full rounded-t-xl px-5 py-3 focus:ring-2 focus:ring-poppy focus:outline-none text-base bg-neutral/80 placeholder-gray-400 transition-all font-sans resize-none border-0 shadow-none"
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
            <div className="flex gap-3 bg-neutral px-4 py-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => handleModeChange('draft')}
                className={`p-2 rounded-full transition-colors ${
                  mode === 'draft' 
                    ? 'bg-poppy/20 text-poppy' 
                    : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy'
                }`}
                title="Draft PRD"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('brainstorm')}
                className={`p-2 rounded-full transition-colors ${
                  mode === 'brainstorm' 
                    ? 'bg-poppy/20 text-poppy' 
                    : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy'
                }`}
                title="Brainstorm"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('schedule')}
                className={`p-2 rounded-full transition-colors ${
                  mode === 'schedule' 
                    ? 'bg-poppy/20 text-poppy' 
                    : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy'
                }`}
                title="Schedule"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('strategy')}
                className={`p-2 rounded-full transition-colors ${
                  mode === 'strategy' 
                    ? 'bg-poppy/20 text-poppy' 
                    : 'hover:bg-poppy/10 text-poppy/80 hover:text-poppy'
                }`}
                title="Strategy"
              >
                <Target className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-12 h-12 rounded-full bg-poppy text-white font-medium text-base hover:bg-poppy/90 transition-all duration-150 shadow-md border-0 flex items-center justify-center"
          disabled={loading}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        {mode === 'brainstorm' && (
          <button
            type="button"
            className="px-5 py-3 rounded-full bg-neutral text-primary font-medium text-base hover:bg-neutral/80 transition-all duration-150 shadow-md border-0 ml-2 font-sans"
            onClick={handleSummarizeAndSave}
            disabled={loading || !messages.length}
          >
            Summarize &amp; Start as PRD
          </button>
        )}
      </form>
    </div>
  );
} 