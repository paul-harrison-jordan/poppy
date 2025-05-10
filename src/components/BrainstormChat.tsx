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
            body: JSON.stringify({ input }),
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
   const text = await res.text();
   let prd;
   try {
     prd = JSON.parse(text);
   } catch {
     alert('Failed to parse PRD summary. Please try again.');
     return;
   }
   localStorage.setItem('prdDraft', JSON.stringify(prd));
   router.push(`/`);
 } catch (error) {
   alert('Failed to generate PRD summary.');
 }
  };

  return (
    <div className="flex flex-col h-[85vh] w-full max-w-5xl mx-auto p-0 mt-8 bg-white/90 rounded-2xl shadow-sm border border-neutral font-sans">
      <div className="w-full flex justify-center pt-2 pb-4">
        <div className="text-lg font-semibold text-primary tracking-tight">Brainstorm</div>
      </div>
      <div className="relative flex-1 overflow-y-auto px-0 py-2 space-y-2" style={{ minHeight: '60vh', maxHeight: '65vh' }}>
        <div className="relative z-0 flex flex-col space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300`}>
              <div className={
                msg.role === 'user'
                  ? 'px-4 py-2 rounded-2xl max-w-[70%] text-base bg-poppy/10 text-primary font-sans'
                  : 'px-4 py-2 rounded-2xl max-w-[70%] text-base bg-sprout/10 text-primary font-sans'
              } style={{whiteSpace: 'pre-line', boxShadow: 'none', border: 'none', fontFamily: msg.role === 'assistant' ? 'JetBrains Mono, monospace' : undefined}}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-2xl bg-neutral text-primary/60 text-base font-sans animate-pulse">Thinking…</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 items-center px-0 py-4 bg-transparent">
        <input
          className="flex-1 rounded-full border border-neutral px-4 py-3 shadow-none focus:ring-2 focus:ring-poppy focus:outline-none text-base bg-white/90 placeholder-gray-400 transition-all font-sans"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Like talking to a version of you who remembers everything"
          disabled={loading}
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-full bg-poppy text-white font-medium text-base hover:bg-poppy/90 transition-all duration-150 shadow-none border-0 font-sans"
          disabled={loading}
        >
          Send
        </button>
        <button
          type="button"
          className="px-5 py-3 rounded-full bg-neutral text-primary font-medium text-base hover:bg-neutral/80 transition-all duration-150 shadow-none border-0 ml-2 font-sans"
          onClick={handleSummarizeAndSave}
          disabled={loading || !messages.length}
        >
          Summarize &amp; Save as PRD
        </button>
      </form>
    </div>
  );
}