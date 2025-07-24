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

  // Calculate opacity based on distance from top border
  const calculateOpacity = (element: HTMLElement) => {
    if (!containerRef.current) return 1;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const fadeZone = 100; // pixels from top where fade effect starts
    
    const distanceFromTop = elementRect.top - containerRect.top;
    
    if (distanceFromTop > fadeZone) return 1;
    if (distanceFromTop < 0) return 0;
    
    return Math.max(0, distanceFromTop / fadeZone);
  };

  // Update opacities on scroll or resize
  useEffect(() => {
    const updateOpacities = () => {
      if (!containerRef.current) return;
      
      const messageElements = containerRef.current.querySelectorAll('[data-message-index]');
      const newOpacities = Array.from(messageElements).map((element) => 
        calculateOpacity(element as HTMLElement)
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
                    ? 'px-4 py-3 rounded-2xl max-w-[85%] bg-poppy text-white text-sm shadow-sm'
                    : `px-4 py-3 rounded-2xl max-w-[85%] bg-white text-gray-900 text-sm whitespace-pre-line shadow-sm border border-gray-200 ${msg.className || ''}`
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
          <div className="px-4 py-3 rounded-2xl bg-white text-gray-500 text-sm border border-gray-200 shadow-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Thinking...
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}