import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Paintbrush } from 'lucide-react';

type ChatMode = 'chat' | 'draft' | 'brainstorm' | 'agent' | 'design';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  className?: string;
}

interface DesignSidebarProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  v0ChatId: string | null;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onModeChange: (mode: ChatMode) => void;
}

export default function DesignSidebar({
  messages,
  input,
  loading,
  v0ChatId,
  onInputChange,
  onSubmit,
  onModeChange
}: DesignSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      
      {/* Header with back navigation */}
      <div className="p-4 border-b border-poppy-primary/10 bg-gradient-to-r from-poppy-primary-light to-lavender-secondary-light">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-poppy-primary" />
            <span className="font-semibold text-poppy-primary">Design Studio</span>
          </div>
          <button
            onClick={() => onModeChange('brainstorm')}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-white/50 text-poppy-primary/70 hover:text-poppy-primary transition-colors"
            title="Exit Design Studio"
          >
            <ArrowLeft className="w-3 h-3" />
            Exit
          </button>
        </div>
        
        {/* Session status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${v0ChatId ? 'bg-sprout-success' : 'bg-lavender-secondary'}`}></div>
          <span className="text-xs text-poppy-primary/80">
            {v0ChatId ? 'Design session active' : 'Ready to create'}
          </span>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 design-mode-chat">
        <div className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
          Chat History
        </div>
        
        {messages.length === 0 ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-gray-400 mb-2">
              <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Describe your UI idea or ask for design changes. I&apos;ll help you iterate on your design.
            </p>
          </div>
        ) : (
          messages
            .filter(msg => !(msg.role === 'assistant' && msg.content === 'Thinking...'))
            .slice(-8) // Show more messages for better context
            .map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={`p-3 rounded-lg animate-slide-in ${
                  msg.role === 'user' 
                    ? 'bg-poppy-primary text-poppy-primary-foreground ml-6 shadow-lg' 
                    : 'bg-warm-neutral-light text-gray-800 mr-6 border border-poppy-primary/10'
                }`}
              >
                <div className="text-sm leading-relaxed">
                  {typeof msg.content === 'string' ? msg.content : (
                    <div className="text-xs text-gray-500 italic">
                      Design update applied
                    </div>
                  )}
                </div>
              </motion.div>
            ))
        )}
        
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 border border-poppy/20 mr-6 flex items-center gap-3"
          >
            <div className="w-4 h-4 border-2 border-poppy border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm text-poppy font-medium">
              {v0ChatId ? 'Updating your design...' : 'Creating your design...'}
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Enhanced input form */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={input}
              onChange={e => onInputChange(e.target.value)}
              placeholder={v0ChatId ? "Describe changes to make..." : "Describe your UI idea..."}
              disabled={loading}
              rows={3}
              className="w-full text-sm px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy resize-none text-gray-800 placeholder-gray-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 text-sm bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {v0ChatId ? 'Updating' : 'Creating'}
                </div>
              ) : (
                v0ChatId ? 'Update Design' : 'Create Design'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}