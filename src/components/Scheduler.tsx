'use client';
import React, { useState, useRef } from 'react';

function extractDriveIds(input: string): { documentId?: string } {
  try {
    const url = new URL(input);
    const docMatch = url.pathname.match(/\/(?:document|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
    if (docMatch) return { documentId: docMatch[1] };
  } catch {
    if (/^[A-Za-z0-9_-]{10,}$/.test(input)) {
      return { documentId: input };
    }
  }
  return {};
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Scheduler() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      // Add user message to chat immediately
      const userMessage: ChatMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);

      // Get embedding for the query
      const embedRes = await fetch("/api/embed-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      
      if (!embedRes.ok) throw new Error("Failed to get embedding");
      const { queryEmbedding } = await embedRes.json();
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response");

      const embedding = queryEmbedding[0].embedding;

      // Get matched feedback from Pinecone
      const matchRes = await fetch("/api/match-embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embedding),
      });

      if (!matchRes.ok) throw new Error("Failed to match embeddings");
      const { matchedContext } = await matchRes.json();
      if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response");

      // Format each match as a text response
      const responses = matchedContext.map((match) => {
        const metadata = match.metadata;
        return `Feedback: ${metadata.NPS_VERBATIM}\nScore: ${metadata.NPS_SCORE_RAW}\nDate: ${metadata.SURVEY_END_DATE}\nEmail: ${metadata.RECIPIENT_EMAIL}\nGMV: ${metadata.GMV}\nKlaviyo Account ID: ${metadata.KLAVIYO_ACCOUNT_ID}\nRow: ${metadata.row_number}`;
      });

      // Add each response as a separate message
      for (const response of responses) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }

      const { documentId } = extractDriveIds(driveLink);
      if (!documentId) {
        throw new Error("Invalid document ID");
      }
      console.log('Schedule form submitted with:', documentId);
      const sheetResponse = await fetch('/api/fetch-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({  documentId: documentId }),
      });
      const sheetData = await sheetResponse.json();
      console.log('Sheet response:', sheetData);
      
      // Store the sheet ID for later use
      localStorage.setItem('currentSheetId', documentId);
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
        <div className="text-center">
          <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Feedback Search</h1>
          <p className="text-lg text-primary/80 font-sans">Search through your feedback to find relevant responses.</p>
        </div>
        <div className="relative z-0 flex flex-col space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300 group`}>
              <div className={
                msg.role === 'user'
                  ? 'px-5 py-3 rounded-2xl max-w-[70%] text-base bg-poppy/20 text-primary font-sans shadow-md'
                  : 'px-5 py-3 rounded-2xl max-w-[70%] text-base bg-sprout/20 text-primary font-mono shadow-md whitespace-pre-line relative'
              }>
                {msg.content}
                {msg.role === 'assistant' && (
                  <button
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 rounded-full bg-poppy text-white hover:bg-poppy/90 text-sm font-medium"
                    onClick={async () => {
                      try {
                        // Extract row number from the message content
                        const rowMatch = msg.content.match(/Row: (\d+)/);
                        if (!rowMatch) throw new Error("Could not find row number in message");
                        const rowNumber = parseInt(rowMatch[1]);

                        // Extract Klaviyo Account ID from the message content
                        const klaviyoMatch = msg.content.match(/Klaviyo Account ID: ([^\n]+)/);
                        if (!klaviyoMatch) throw new Error("Could not find Klaviyo Account ID in message");
                        const klaviyoAccountId = klaviyoMatch[1];

                        // Extract feedback data from the message
                        const feedbackData = {
                          NPS_VERBATIM: msg.content.match(/Feedback: ([^\n]+)/)?.[1] || '',
                          NPS_SCORE_RAW: msg.content.match(/Score: ([^\n]+)/)?.[1] || '',
                          SURVEY_END_DATE: msg.content.match(/Date: ([^\n]+)/)?.[1] || '',
                          RECIPIENT_EMAIL: msg.content.match(/Email: ([^\n]+)/)?.[1] || '',
                          GMV: msg.content.match(/GMV: ([^\n]+)/)?.[1] || ''
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

                        if (!response.ok) throw new Error("Failed to fetch email");
                        const { email } = await response.json();
                        console.log('Got email:', email);

                        // Update the sheet with the feedback data
                        const updateResponse = await fetch('/api/update-sheet', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            documentId: '1OTgVU9sTa2D8QFiDhYy-NuYAN3fQnKQQgrD1iR63jUo',
                            klaviyoAccountId,
                            feedbackData
                          })
                        });

                        if (!updateResponse.ok) {
                          throw new Error("Failed to update sheet");
                        }

                        const emailContent = `Hi there,

 Thank you for taking the time to share your thoughts!

Here are the details from your feedback:
- Feedback: ${msg.content.match(/Feedback: ([^\n]+)/)?.[1] || ''}
- Score: ${msg.content.match(/Score: ([^\n]+)/)?.[1] || ''}
- Date: ${msg.content.match(/Date: ([^\n]+)/)?.[1] || ''}
- GMV: ${msg.content.match(/GMV: ([^\n]+)/)?.[1] || ''}

I'd love to schedule some time to discuss this further. Would you be available for a quick call?

Best regards,
Your Name`;

                        console.log('Email content:', emailContent);
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&body=${encodeURIComponent(emailContent)}`;
                        console.log('Opening Gmail URL:', gmailUrl);
                        
                        // Try to open the window and handle popup blocking
                        const newWindow = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
                        if (newWindow === null) {
                          // Popup was blocked
                          alert('Please allow popups for this site to open Gmail');
                          // Fallback: copy the URL to clipboard
                          navigator.clipboard.writeText(gmailUrl)
                            .then(() => alert('Gmail URL copied to clipboard. Please paste it in a new tab.'))
                            .catch(() => alert('Failed to copy URL. Please manually copy this URL: ' + gmailUrl));
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Failed to schedule time. Please try again.');
                      }
                    }}
                  >
                    Schedule Time
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-5 py-3 rounded-2xl bg-neutral text-primary/60 text-base font-sans animate-pulse shadow-md">Searching...</div>
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
          placeholder="Describe what you're looking for in the feedback..."
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
      </form>
    </div>
  );
} 