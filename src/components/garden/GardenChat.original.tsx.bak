'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, CheckCircle, Clock, FileText, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Removed ChatInput import - using custom input instead

import type { AgentUpdate, AgentType, HumanQuestion } from '@/services/garden/types';
import HumanInputModal from './HumanInputModal';

interface GardenChatProps {
  storedContext?: string;
  teamTerms?: Record<string, string>;
}

const AGENT_ICONS = {
  orchestrator: <Brain className="w-4 h-4" />,
  planning: <CheckCircle className="w-4 h-4" />,
  strategy: <Sparkles className="w-4 h-4" />,
  research: <Clock className="w-4 h-4" />,
  design: <Sparkles className="w-4 h-4" />,
  engineering: <CheckCircle className="w-4 h-4" />,
  writing: <FileText className="w-4 h-4" />
};

const AGENT_COLORS = {
  orchestrator: 'bg-lavender-50 border-lavender-300 text-lavender-700',
  planning: 'bg-poppy-50 border-poppy-200 text-poppy-700',
  strategy: 'bg-sprout-50 border-sprout-300 text-sprout-700',
  research: 'bg-warmGray-50 border-warmGray-300 text-warmGray-700',
  design: 'bg-lavender-100 border-lavender-400 text-lavender-800',
  engineering: 'bg-warmGray-100 border-warmGray-400 text-warmGray-800',
  writing: 'bg-poppy-100 border-poppy-300 text-poppy-800'
};

export default function GardenChat({ storedContext, teamTerms }: GardenChatProps) {
  const [messages, setMessages] = useState<AgentUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [googleDoc, setGoogleDoc] = useState<{
    docId: string;
    docUrl: string;
    title: string;
    createdAt: string;
    fullContent: string;
  } | null>(null);
  const [progressSteps, setProgressSteps] = useState<{
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed';
  }[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showHumanInput, setShowHumanInput] = useState(false);
  const [humanQuestions, setHumanQuestions] = useState<HumanQuestion[]>([]);
  const [questioningAgent, setQuestioningAgent] = useState<AgentType>('planning');
  const [currentWorkflowData, setCurrentWorkflowData] = useState<{
    query: string;
    storedContext?: string;
    teamTerms?: Record<string, string>;
    existingDocument?: { title: string; content: string };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate progress steps based on PRD workflow
  const initializeProgressSteps = () => {
    setProgressSteps([
      { id: 'understanding', label: 'Understanding your PRD request', status: 'active' },
      { id: 'problem_analysis', label: 'Analyzing user problems & requirements', status: 'pending' },
      { id: 'question_generation', label: 'Identifying critical questions', status: 'pending' },
      { id: 'human_input', label: 'Gathering your input (if needed)', status: 'pending' },
      { id: 'solution_validation', label: 'Validating proposed solutions', status: 'pending' },
      { id: 'research', label: 'Conducting supporting research', status: 'pending' },
      { id: 'synthesis', label: 'Creating comprehensive PRD', status: 'pending' },
      { id: 'finalization', label: 'Final review and formatting', status: 'pending' }
    ]);
  };

  const updateProgressStep = (stepId: string, status: 'pending' | 'active' | 'completed') => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput(''); // Clear input immediately

    setLoading(true);
    
    // Only clear state if starting fresh (no existing document)
    if (!googleDoc) {
      setMessages([]);
      setSelectedAgents([]);
      setProgressSteps([]);
    }
    
    // Initialize progress steps
    initializeProgressSteps();

    console.log('🚀 Garden Chat: Starting workflow');
    console.log('📋 Query:', query);
    console.log('📂 Context length:', storedContext?.length || 0);
    console.log('🏷️ Team terms:', Object.keys(teamTerms || {}).length);
    console.log('📄 Existing document:', !!googleDoc);

    try {
      const requestData = { 
        query, 
        storedContext, 
        teamTerms,
        existingDocument: googleDoc ? {
          title: googleDoc.title,
          content: googleDoc.fullContent
        } : undefined
      };
      
      console.log('📤 Making API request to /api/garden/chat');
      console.log('📦 Request payload size:', JSON.stringify(requestData).length, 'characters');
      
      const response = await fetch('/api/garden/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      console.log('📥 API response received');
      console.log('✅ Response status:', response.status, response.statusText);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error('Failed to start Garden workflow');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const update: AgentUpdate = JSON.parse(line.slice(6));
              
              console.log(`📨 Agent Update:`, {
                type: update.type,
                agent: update.agent,
                contentPreview: update.content.substring(0, 100) + '...',
                hasQuestions: !!update.questions
              });
              
              setMessages(prev => [...prev, update]);
              
              // Handle optional human input requests (don't pause workflow)
              if (update.type === 'needs_human_input' && update.questions) {
                setHumanQuestions(update.questions);
                setQuestioningAgent(update.agent);
                setCurrentWorkflowData({ query, storedContext, teamTerms, existingDocument: googleDoc });
                setShowHumanInput(true);
                // Continue processing - don't stop loading or return
              }
              
              // Update progress steps based on PRD workflow
              if (update.type === 'thinking' && update.agent === 'orchestrator') {
                updateProgressStep('understanding', 'completed');
                updateProgressStep('problem_analysis', 'active');
              } else if (update.type === 'orchestration' && update.agents_selected) {
                setSelectedAgents(update.agents_selected);
                updateProgressStep('problem_analysis', 'completed');
                if (update.agents_selected.includes('planning')) {
                  updateProgressStep('question_generation', 'active');
                } else {
                  updateProgressStep('solution_validation', 'active');
                }
              } else if (update.type === 'agent_executing' && update.agent === 'planning') {
                // Planning agent is conducting deep analysis
                updateProgressStep('question_generation', 'active');
              } else if (update.type === 'agent_response' && update.agent === 'planning') {
                // Planning completed - may have questions or continue
                if (!showHumanInput) {
                  updateProgressStep('question_generation', 'completed');
                  updateProgressStep('solution_validation', 'active');
                }
              } else if (update.type === 'agent_executing' && update.agent === 'research') {
                updateProgressStep('solution_validation', 'completed');
                updateProgressStep('research', 'active');
              } else if (update.type === 'agent_response' && update.agent === 'research') {
                updateProgressStep('research', 'completed');
                updateProgressStep('synthesis', 'active');
              } else if (update.type === 'agent_response' && update.agent === 'writing') {
                updateProgressStep('synthesis', 'completed');
                updateProgressStep('finalization', 'active');
              } else if (update.type === 'final_response') {
                updateProgressStep('finalization', 'completed');
                if (update.googleDoc) {
                  setGoogleDoc(update.googleDoc);
                }
              }
            } catch (error) {
              console.error('Error parsing Garden update:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Garden workflow error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        agent: 'orchestrator',
        content: 'An error occurred while processing your request. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleHumanResponse = async (responses: Record<string, string>) => {
    if (!currentWorkflowData) return;

    setShowHumanInput(false);
    setLoading(true);

    try {
      // Continue the workflow with human responses
      const response = await fetch('/api/garden/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gardenRequest: currentWorkflowData,
          humanResponses: responses
        })
      });

      if (!response.ok) {
        throw new Error('Failed to continue Garden workflow');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update: AgentUpdate = JSON.parse(line);
              
              setMessages(prev => [...prev, update]);
              
              // Handle human response received
              if (update.type === 'human_response_received') {
                updateProgressStep('human_input', 'completed');
                updateProgressStep('solution_validation', 'active');
              }
              
              // Update progress tracking for continued workflow
              if (update.type === 'final_response' && update.googleDoc) {
                setGoogleDoc(update.googleDoc);
                updateProgressStep('finalization', 'completed');
              }
            } catch (error) {
              console.error('Error parsing continuation update:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Continuation workflow error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        agent: 'orchestrator',
        content: 'An error occurred while processing your responses. Please try again.'
      }]);
    } finally {
      setLoading(false);
      setCurrentWorkflowData(null);
    }
  };

  const handleSkipQuestions = () => {
    setShowHumanInput(false);
    setCurrentWorkflowData(null);
    // Don't add any messages - the workflow is already continuing
  };

  // Render chat interface based on whether document exists
  if (!googleDoc) {
    // Full-screen chat mode (no document yet)
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-lavender-50 via-poppy-50 to-sprout-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
              <Brain className="w-6 h-6 text-lavender-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-warmGray-800">Garden</h2>
              <span className="text-xs text-warmGray-600">Multi-Agent PM Assistant</span>
            </div>
          </div>
          
          {/* Selected Agents Display */}
          {selectedAgents.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-2">Active Agents:</p>
              <div className="flex flex-wrap gap-2">
                {selectedAgents.map(agent => (
                  <span 
                    key={agent}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${AGENT_COLORS[agent as AgentType]}`}
                  >
                    {AGENT_ICONS[agent as AgentType]}
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-br from-lavender-100 to-poppy-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Brain className="w-10 h-10 text-lavender-600" />
              </div>
              <h3 className="text-xl font-semibold bg-gradient-to-r from-lavender-600 to-poppy-500 bg-clip-text text-transparent mb-2">Welcome to Garden</h3>
              <p className="text-warmGray-600 max-w-md mx-auto leading-relaxed">
                Ask me anything about product management. I&apos;ll coordinate specialist agents to give you comprehensive insights on planning, strategy, research, design, and engineering.
              </p>
            </div>
          )}

          {/* Progress Tracker */}
          {progressSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-warmGray-800 mb-6">Analysis Progress</h3>
              {progressSteps.map((step) => (
                <div key={step.id} className="group flex items-center gap-3 transition-all duration-300">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    step.status === 'completed' ? 'bg-sprout-500 border-sprout-500 shadow-sprout scale-110' :
                    step.status === 'active' ? 'bg-lavender-500 border-lavender-500 shadow-lavender animate-pulse scale-105' :
                    'bg-warmGray-100 border-warmGray-300 group-hover:border-warmGray-400'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : step.status === 'active' ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    ) : (
                      <div className="w-2 h-2 bg-warmGray-400 rounded-full" />
                    )}
                  </div>
                  <span className={`text-sm transition-all duration-300 ${
                    step.status === 'completed' ? 'text-sprout-700 font-semibold' :
                    step.status === 'active' ? 'text-lavender-700 font-semibold' :
                    'text-warmGray-500 group-hover:text-warmGray-700'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
              
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowAuditLog(!showAuditLog)}
                  className="text-sm text-lavender-600 hover:text-lavender-700 flex items-center gap-2 transition-colors duration-200"
                >
                  <FileText className="w-4 h-4" />
                  {showAuditLog ? 'Hide' : 'Show'} detailed audit log
                </button>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {showAuditLog && messages.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-md font-semibold text-warmGray-800 mb-4">Detailed Audit Log</h4>
              {messages.map((message, index) => (
                <div key={index} className={`p-2 rounded border text-xs ${AGENT_COLORS[message.agent]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {AGENT_ICONS[message.agent]}
                    <span className="font-medium text-xs capitalize">
                      {message.agent === 'orchestrator' ? 'Orchestrator' : `${message.agent} Agent`}
                    </span>
                    <span className="text-xs opacity-75">
                      {message.type === 'thinking' && '💭 Thinking'}
                      {message.type === 'orchestration' && '🎯 Planning'}
                      {message.type === 'agent_executing' && '⚙️ Executing'}
                      {message.type === 'agent_response' && '📝 Response'}
                      {message.type === 'final_response' && '✅ Complete'}
                      {message.type === 'error' && '❌ Error'}
                    </span>
                  </div>
                  <div className="text-xs">
                    {message.content.substring(0, 200)}{message.content.length > 200 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-lavender-400 to-poppy-400 rounded-full animate-spin blur-sm"></div>
                <div className="relative bg-white rounded-full p-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-lavender-500 border-t-transparent"></div>
                </div>
              </div>
              <span className="ml-3 text-warmGray-600 font-medium">Creating your document...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Garden about your PM challenges..."
                disabled={loading}
                rows={1}
                className="w-full p-3 pr-12 rounded-xl border border-warmGray-200 resize-none focus:ring-2 focus:ring-lavender-400 focus:border-lavender-400 outline-none text-base placeholder-warmGray-400 min-h-[48px] max-h-32 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gradient-to-r from-lavender-500 to-poppy-500 text-white hover:from-lavender-600 hover:to-poppy-600 disabled:from-warmGray-300 disabled:to-warmGray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                    <path d="M2 2l7.586 7.586"/>
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Human Input Modal */}
        <HumanInputModal
          isOpen={showHumanInput}
          onClose={handleSkipQuestions}
          onSubmit={handleHumanResponse}
          questions={humanQuestions}
          agent={questioningAgent}
          loading={loading}
        />
      </div>
    );
  }

  // Split-screen mode (document + chat sidebar)
  return (
    <div className="flex h-screen bg-gradient-to-br from-cream via-white to-warmGray-50">
      {/* Main Document Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Document Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-warmGray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-warmGray-600 hover:text-warmGray-900 hover:bg-warmGray-100 rounded-lg transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <div className="h-4 w-px bg-warmGray-300" />
            <div>
              <h1 className="text-xl font-semibold text-warmGray-900">{googleDoc.title}</h1>
              <p className="text-sm text-warmGray-500">
                Created {new Date(googleDoc.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <a
            href={googleDoc.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-poppy-500 to-lavender-500 text-white text-sm font-medium rounded-lg hover:from-poppy-600 hover:to-lavender-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Edit in Google Docs
          </a>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {googleDoc.fullContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-96 bg-white/95 backdrop-blur-sm border-l border-warmGray-200 shadow-xl flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-warmGray-200 bg-gradient-to-r from-lavender-50 via-poppy-50 to-sprout-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
              <Brain className="w-5 h-5 text-lavender-600" />
            </div>
            <h3 className="font-semibold text-warmGray-900">Garden</h3>
          </div>
          <div className="flex mt-2 gap-2">
            <button
              onClick={() => setShowAuditLog(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                !showAuditLog ? 'bg-gradient-to-r from-lavender-500 to-poppy-500 text-white shadow-md' : 'bg-warmGray-100 text-warmGray-600 hover:bg-warmGray-200'
              }`}
            >
              Progress
            </button>
            <button
              onClick={() => setShowAuditLog(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                showAuditLog ? 'bg-gradient-to-r from-lavender-500 to-poppy-500 text-white shadow-md' : 'bg-warmGray-100 text-warmGray-600 hover:bg-warmGray-200'
              }`}
            >
              Audit Log
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {!showAuditLog ? (
            /* Progress View */
            <div className="space-y-3">
              {progressSteps.map((step) => (
                <div key={step.id} className="group flex items-center gap-2 transition-all duration-200">
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    step.status === 'completed' ? 'bg-sprout-500 border-sprout-500 shadow-sm' :
                    step.status === 'active' ? 'bg-lavender-500 border-lavender-500 animate-pulse shadow-sm' :
                    'bg-warmGray-100 border-warmGray-300'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-3 h-3 text-white" />
                    ) : step.status === 'active' ? (
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    ) : (
                      <div className="w-1 h-1 bg-warmGray-400 rounded-full" />
                    )}
                  </div>
                  <span className={`text-xs transition-colors duration-200 ${
                    step.status === 'completed' ? 'text-sprout-700 font-semibold' :
                    step.status === 'active' ? 'text-lavender-700 font-semibold' :
                    'text-warmGray-500 group-hover:text-warmGray-700'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Audit Log View */
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div key={index} className={`p-2 rounded border text-xs ${AGENT_COLORS[message.agent]}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {AGENT_ICONS[message.agent]}
                    <span className="font-medium text-xs">
                      {message.agent === 'orchestrator' ? 'Orchestrator' : message.agent}
                    </span>
                  </div>
                  <div className="text-xs">
                    {message.content.substring(0, 100)}{message.content.length > 100 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t p-3 space-y-2">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Continue the conversation..."
                disabled={loading}
                rows={2}
                className="w-full p-2 pr-8 rounded-lg border border-warmGray-200 resize-none focus:ring-2 focus:ring-lavender-400 focus:border-lavender-400 outline-none text-xs placeholder-warmGray-400 bg-white hover:border-warmGray-300 transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-gradient-to-r from-lavender-500 to-poppy-500 text-white hover:from-lavender-600 hover:to-poppy-600 disabled:from-warmGray-300 disabled:to-warmGray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                    <path d="M2 2l7.586 7.586"/>
                  </svg>
                )}
              </button>
            </div>
          </form>
          <button
            onClick={() => {
              setGoogleDoc(null);
              setMessages([]);
              setSelectedAgents([]);
            }}
            className="w-full px-3 py-1.5 text-xs bg-warmGray-100 text-warmGray-600 rounded-lg hover:bg-warmGray-200 transition-all duration-200 font-medium"
          >
            Start New Analysis
          </button>
        </div>
      </div>
      
      {/* Human Input Modal */}
      <HumanInputModal
        isOpen={showHumanInput}
        onClose={handleSkipQuestions}
        onSubmit={handleHumanResponse}
        questions={humanQuestions}
        agent={questioningAgent}
        loading={loading}
      />
    </div>
  );
}