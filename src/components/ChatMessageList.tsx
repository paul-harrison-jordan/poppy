import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  className?: string;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessageList({ messages, loading, messagesEndRef }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [messageOpacities, setMessageOpacities] = useState<number[]>([]);

  // No fade effect - all messages fully visible
  const calculateOpacity = () => {
    return 1; // Always fully visible
  };

  // Update opacities on scroll or resize
  useEffect(() => {
    const updateOpacities = () => {
      if (!containerRef.current) return;
      
      const messageElements = containerRef.current.querySelectorAll('[data-message-index]');
      const newOpacities = Array.from(messageElements).map(() => 
        calculateOpacity()
      );
      setMessageOpacities(newOpacities);
    };

    updateOpacities();
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateOpacities);
      window.addEventListener('resize', updateOpacities);
      
      return () => {
        container.removeEventListener('scroll', updateOpacities);
        window.removeEventListener('resize', updateOpacities);
      };
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="space-y-3 relative">
      <AnimatePresence mode="popLayout">
        {messages
          .filter(msg => !(msg.role === 'assistant' && msg.content === 'Thinking...'))
          .map((msg, idx) => (
            <motion.div
              key={idx}
              data-message-index={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: messageOpacities[idx] ?? 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.2,
                ease: "easeOut"
              }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  msg.role === 'user'
                    ? 'px-5 py-3 rounded-2xl max-w-[85%] bg-poppy text-white text-base shadow-md'
                    : `px-5 py-3 rounded-2xl max-w-[85%] bg-gray-50 text-gray-900 text-base whitespace-pre-line shadow-sm border border-gray-100 ${msg.className || ''}`
                }
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
      {loading && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex justify-start"
        >
          <div className="px-5 py-3 rounded-2xl bg-poppy/10 text-poppy text-base border border-poppy/20 shadow-sm flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-poppy rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-poppy rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-poppy rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-medium">Poppy is thinking...</span>
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}