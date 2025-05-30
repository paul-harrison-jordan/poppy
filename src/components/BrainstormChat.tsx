'use client';
import React, { useState, useRef } from 'react';
import { collectStream } from "@/lib/collectStream"
import { useRouter } from 'next/navigation';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function BrainstormChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [matchedContext, setMatchedContext] = useState<string[]>([])
  const router = useRouter();

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const storedContext = localStorage.getItem("personalContext")
    const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}")
    try{
        // Add user message to chat immediately
        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        const embedRes = await fetch("/api/embed-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input
            }),
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
          const genRes = await fetch("/api/brainstorm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [...messages, userMessage],
              additionalContext: matchedContext.join("\n"),
              teamTerms,
              storedContext,
              startPrd: false
            }),
          })
    
          const response = await collectStream(genRes)
          console.log("PRD generation response:", response)
          
          // Add assistant's response to chat
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Summarize and save as PRD
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
          additionalContext: matchedContext.join("\n"),
          teamTerms,
          storedContext,
          startPrd: true
        }),
      });
      const prd = await res.json();

      // Remove the loading message
      setMessages(prev => prev.filter(msg => msg.content !== "I'm summarizing our conversation and preparing to start the PRD..."));

      // Store just the summary for the PRD input
      localStorage.setItem('prdSummary', prd.summary);

      // Navigate to the PRD page
      router.push('/prd');
  } catch (error) {
    console.error(error);
    alert('Failed to generate PRD summary.');
    } finally {
      setLoading(false);
  }
};

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-5xl mx-auto font-sans" style={{ background: 'none' }}>
      <div className="flex-1 min-h-0 overflow-y-auto px-0 py-2 space-y-2">
      <div className="text-center">
            <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Brainstorm with <span className="text-poppy">Poppy</span></h1>
            <p className="text-lg text-primary/80 font-sans">Start with an idea or JTBD and let Poppy help you brainstorm. Hit &quot;Summarize &amp; Start as PRD&quot; when you have enough clarity, and Poppy will turn your conversation into a PRD Prompt.</p>
          </div>
        <div className="relative z-0 flex flex-col space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300`}>
              <div className={
                msg.role === 'user'
                  ? 'px-5 py-3 rounded-2xl max-w-[70%] text-base bg-poppy/20 text-primary font-sans shadow-md'
                  : 'px-5 py-3 rounded-2xl max-w-[70%] text-base bg-sprout/20 text-primary font-mono shadow-md'
              } style={{whiteSpace: 'pre-line'}}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-5 py-3 rounded-2xl bg-neutral text-primary/60 text-base font-sans animate-pulse shadow-md">Thinking…</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 items-center px-0 py-6 bg-transparent" style={{ flexShrink: 0 }}>
        <textarea
          className="flex-1 rounded-xl border border-neutral px-5 py-3 shadow-md focus:ring-2 focus:ring-poppy focus:outline-none text-base bg-neutral/80 placeholder-gray-400 transition-all font-sans resize-none"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Like talking to a version of you who remembers everything"
          disabled={loading}
          rows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
        />
        <button
          type="submit"
          className="w-12 h-12 rounded-full bg-poppy text-white font-medium text-base hover:bg-poppy/90 transition-all duration-150 shadow-md border-0 flex items-center justify-center"
          disabled={loading}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          type="button"
          className="px-5 py-3 rounded-full bg-neutral text-primary font-medium text-base hover:bg-neutral/80 transition-all duration-150 shadow-md border-0 ml-2 font-sans"
          onClick={handleSummarizeAndSave}
          disabled={loading || !messages.length}
        >
          Summarize &amp; Start as PRD
        </button>
      </form>
    </div>
  );
}