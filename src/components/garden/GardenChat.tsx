'use client';
import React from 'react';
import { 
  Brain, 
  Sparkles, 
  Search, 
  FileText, 
  MessageSquare,
  CheckCircle2,
  Circle,
  ArrowRight,
  Loader2,
  Database,
  Globe,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentUpdate } from '../../services/garden/types';
import { useGardenStore } from '../../lib/garden-store';
import HumanInputModal from './HumanInputModal';

// Document Preview Component
interface DocumentPreviewProps {
  messages: AgentUpdate[];
  onExport: (title: string, content: string) => void;
  isExporting: boolean;
}

function DocumentPreview({ messages, onExport, isExporting }: DocumentPreviewProps) {
  const documentComplete = messages.find(m => m.type === 'document_complete');
  const agentResponses = messages.filter(m => m.type === 'agent_response');
  
  // Extract JTBD, scope, and other key sections from messages
  const extractedContent = {
    jtbd: '',
    inScope: [],
    outOfScope: [],
    features: [],
    releasePhases: [],
    keyQuestions: []
  };

  // Parse agent responses to populate document sections
  agentResponses.forEach(msg => {
    if (msg.agent === 'planning') {
      // Extract JTBD and scope from planning agent
      if (msg.content.includes('Job to be Done') || msg.content.includes('JTBD')) {
        extractedContent.jtbd = msg.content;
      }
    }
    if (msg.agent === 'scoping') {
      // Extract release phases from scoping agent
      extractedContent.releasePhases.push(msg.content);
    }
  });

  if (documentComplete) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-sprout-success to-poppy-primary rounded-xl flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-warm-neutral">{documentComplete.document?.title || 'Product Requirements Document'}</h2>
            <p className="text-warm-neutral/70">Ready for review and implementation</p>
          </div>
        </div>
        
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {documentComplete.content}
          </ReactMarkdown>
        </div>
        
        <div className="flex gap-4 pt-6 border-t border-white/20">
          <button 
            onClick={() => onExport(documentComplete.document?.title || 'Product Requirements Document', documentComplete.content)}
            disabled={isExporting}
            className="px-6 py-3 bg-gradient-to-r from-poppy-primary to-lavender-secondary text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Export to Google Drive
              </>
            )}
          </button>
          <button className="px-6 py-3 border border-white/40 text-warm-neutral rounded-xl hover:bg-white/20 transition-all font-semibold">
            Continue Refining
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Document in Progress */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-xl flex items-center justify-center shadow-lg animate-pulse">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-warm-neutral">Crafting Your PRD</h2>
          <p className="text-warm-neutral/70">Agents are researching and building your document...</p>
        </div>
      </div>

      {/* Live Document Sections */}
      <div className="space-y-6">
        {/* JTBD Section */}
        <div className="bg-gradient-to-br from-white/80 to-poppy-primary/5 rounded-2xl p-6 border border-white/40">
          <h3 className="text-lg font-bold text-warm-neutral mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-poppy-primary" />
            Job to be Done (JTBD)
          </h3>
          {extractedContent.jtbd ? (
            <div className="prose max-w-none text-warm-neutral/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {extractedContent.jtbd}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-warm-neutral/60">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Defining the core problem and user needs...</span>
            </div>
          )}
        </div>

        {/* Release Phases Section */}
        <div className="bg-gradient-to-br from-white/80 to-sprout-success/5 rounded-2xl p-6 border border-white/40">
          <h3 className="text-lg font-bold text-warm-neutral mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-sprout-success" />
            Iterative Release Phases
          </h3>
          {extractedContent.releasePhases.length > 0 ? (
            <div className="space-y-4">
              {extractedContent.releasePhases.map((phase, idx) => (
                <div key={idx} className="prose max-w-none text-warm-neutral/80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {phase}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-warm-neutral/60">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Planning iterative delivery phases...</span>
            </div>
          )}
        </div>

        {/* Research Findings */}
        <div className="bg-gradient-to-br from-white/80 to-lavender-secondary/5 rounded-2xl p-6 border border-white/40">
          <h3 className="text-lg font-bold text-warm-neutral mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-lavender-secondary" />
            Research Insights
          </h3>
          <div className="grid gap-3">
            {messages.filter(m => m.type === 'research_finding').slice(-3).map((finding, idx) => (
              <div key={idx} className="p-3 bg-white/60 rounded-lg border border-white/30">
                <p className="text-sm text-warm-neutral/80">{finding.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-warm-neutral/60">
                  <span>Confidence: {Math.round((finding.metadata?.confidence || 0) * 100)}%</span>
                  <span>Relevance: {Math.round((finding.metadata?.relevance || 0) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface GardenChatProps {
  storedContext?: string;
  teamTerms?: Record<string, string>;
}


const SOURCE_ICONS = {
  vectordb: <Database className="w-4 h-4" />,
  klaviyo: <BookOpen className="w-4 h-4" />,
  web: <Globe className="w-4 h-4" />,
  competitive: <Target className="w-4 h-4" />,
  internal: <FileText className="w-4 h-4" />
};

const SOURCE_COLORS = {
  vectordb: 'bg-purple-100 text-purple-700 border-purple-300',
  klaviyo: 'bg-poppy-100 text-poppy-700 border-poppy-300',
  web: 'bg-blue-100 text-blue-700 border-blue-300',
  competitive: 'bg-amber-100 text-amber-700 border-amber-300',
  internal: 'bg-sprout-100 text-sprout-700 border-sprout-300'
};

export default function GardenChat({ storedContext, teamTerms }: GardenChatProps) {
  // Use Zustand store for all state management
  const store = useGardenStore();
  const [input, setInput] = React.useState('');

  // Icon mapping for workflow phases
  const getPhaseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Search': return <Search className="w-5 h-5" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5" />;
      case 'Brain': return <Brain className="w-5 h-5" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5" />;
      case 'FileText': return <FileText className="w-5 h-5" />;
      default: return <Circle className="w-5 h-5" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || store.loading) return;

    const query = input.trim();
    setInput('');
    store.setLoading(true);
    store.clearMessages();
    store.clearResearchFindings();
    store.setShowInput(false); // Hide input once workflow starts
    
    // Initialize phases based on request
    store.initializeWorkflowPhases('prd');

    try {
      const response = await fetch('/api/garden/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          storedContext, 
          teamTerms
          // No version flag needed - V2 is now default
        })
      });

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
              
              // Handle different update types
              if (update.type === 'phase_start') {
                store.updatePhaseStatus(update.phase || '', 'active');
              } else if (update.type === 'research_finding') {
                store.addResearchFinding({
                  source: update.metadata?.source || 'web',
                  summary: update.content,
                  confidence: update.metadata?.confidence || 0.5,
                  relevance: update.metadata?.relevance || 0.5,
                  timestamp: new Date().toISOString()
                });
              } else if (update.type === 'needs_human_input' && update.questions) {
                store.setHumanQuestions(update.questions);
                store.setShowHumanInput(true);
                store.setShowInput(true); // Show input when agents need questions answered
              } else if (update.type === 'document_complete') {
                store.updatePhaseStatus('writing', 'completed');
                store.updateQualityMetrics({
                  completeness: update.metadata?.completeness || 0,
                  confidence: update.metadata?.quality_score || 0,
                  research_depth: store.researchFindings.length * 10
                });
                store.setShowInput(true); // Show input when document is complete for refinements
              }
              
              store.addMessage(update);
              
            } catch (error) {
              console.error('Failed to parse update:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Garden workflow error:', error);
      store.addMessage({
        type: 'error',
        agent: 'system',
        content: 'An error occurred during the workflow'
      });
    } finally {
      store.setLoading(false);
    }
  };

  const exportToGoogleDrive = async (title: string, content: string) => {
    store.setExporting(true);
    try {
      const response = await fetch('/api/create-google-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (!response.ok) {
        throw new Error('Failed to create Google Doc');
      }

      const { url } = await response.json();
      store.setExportedDocUrl(url);
      
      // Open the document in a new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Google Drive. Please try again.');
    } finally {
      store.setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-lavender-50/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-poppy-primary/5 to-sprout-success/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-lavender-secondary/8 to-poppy-primary/3 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-2xl flex items-center justify-center shadow-poppy">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-poppy-primary to-lavender-secondary rounded-2xl blur-sm opacity-30 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-poppy-primary via-lavender-secondary to-sprout-success bg-clip-text text-transparent">
                  Garden Mode
                </h1>
                <p className="text-lg text-warm-neutral mt-1">Your AI amplifier for exceptional PRDs</p>
              </div>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
              <button
                onClick={() => store.setActiveTab('progress')}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  store.activeTab === 'progress' 
                    ? 'bg-gradient-to-r from-poppy-primary to-lavender-secondary text-white shadow-md transform scale-105' 
                    : 'text-warm-neutral hover:text-poppy-primary hover:bg-white/60'
                }`}
              >
                Progress View
              </button>
              <button
                onClick={() => store.setActiveTab('audit')}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  store.activeTab === 'audit' 
                    ? 'bg-gradient-to-r from-poppy-primary to-lavender-secondary text-white shadow-md transform scale-105' 
                    : 'text-warm-neutral hover:text-poppy-primary hover:bg-white/60'
                }`}
              >
                Audit Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden max-w-7xl mx-auto px-8 py-8 gap-8">
        {/* Left Panel - Progress or Audit */}
        <div className="w-2/5 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl overflow-hidden">
          {store.activeTab === 'progress' ? (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-warm-neutral mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-poppy-primary to-sprout-success rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                Workflow Progress
              </h2>
              
              {/* Quality Metrics */}
              {store.qualityMetrics.completeness > 0 && (
                <div className="mb-10 p-6 bg-gradient-to-br from-white/80 to-sprout-success/5 rounded-2xl border border-sprout-success/20 shadow-sprout">
                  <h3 className="text-lg font-bold text-warm-neutral mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-sprout-success" />
                    Quality Metrics
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-3 text-warm-neutral">
                        <span>Completeness</span>
                        <span className="text-sprout-success">{store.qualityMetrics.completeness}%</span>
                      </div>
                      <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-sprout-success to-poppy-primary transition-all duration-1000 rounded-full"
                          style={{ width: `${store.qualityMetrics.completeness}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-3 text-warm-neutral">
                        <span>Confidence</span>
                        <span className="text-lavender-secondary">{store.qualityMetrics.confidence}%</span>
                      </div>
                      <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-lavender-secondary to-poppy-primary transition-all duration-1000 rounded-full"
                          style={{ width: `${store.qualityMetrics.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workflow Phases */}
              <div className="space-y-5">
                {store.workflowPhases.map((phase) => (
                  <div 
                    key={phase.id}
                    className={`rounded-2xl border transition-all duration-500 shadow-sm hover:shadow-lg ${
                      phase.status === 'active' 
                        ? 'border-poppy-primary/30 bg-gradient-to-br from-poppy-primary/5 to-lavender-secondary/5 shadow-lg transform scale-[1.02]' 
                        : phase.status === 'completed'
                        ? 'border-sprout-success/30 bg-gradient-to-br from-sprout-success/5 to-white shadow-sprout'
                        : 'border-white/40 bg-white/60 backdrop-blur-sm'
                    }`}
                  >
                    <button
                      onClick={() => store.togglePhaseExpansion(phase.id)}
                      className="w-full p-6 flex items-center justify-between hover:bg-white/20 transition-all duration-300 rounded-2xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-all duration-300 ${
                          phase.status === 'active' 
                            ? 'bg-gradient-to-r from-poppy-primary to-lavender-secondary text-white shadow-lg' 
                            : phase.status === 'completed'
                            ? 'bg-gradient-to-r from-sprout-success to-poppy-primary text-white shadow-lg'
                            : 'bg-white/80 text-warm-neutral shadow-sm'
                        }`}>
                          {getPhaseIcon(phase.icon)}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-warm-neutral text-lg">{phase.name}</h3>
                          {phase.findings && (
                            <p className="text-sm text-warm-neutral/70 mt-1 font-medium">
                              {phase.findings} insights discovered
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {phase.status === 'active' && (
                          <Loader2 className="w-4 h-4 text-lavender-600 animate-spin" />
                        )}
                        {phase.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-sprout-600" />
                        )}
                        {store.expandedPhases.has(phase.id) ? (
                          <ChevronUp className="w-4 h-4 text-warmGray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-warmGray-400" />
                        )}
                      </div>
                    </button>
                    
                    {store.expandedPhases.has(phase.id) && phase.subSteps && (
                      <div className="px-4 pb-4">
                        <div className="ml-11 space-y-2">
                          {phase.subSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {step.status === 'completed' ? (
                                <CheckCircle2 className="w-3 h-3 text-sprout-600" />
                              ) : step.status === 'active' ? (
                                <Loader2 className="w-3 h-3 text-lavender-600 animate-spin" />
                              ) : (
                                <Circle className="w-3 h-3 text-warmGray-300" />
                              )}
                              <span className={`text-sm ${
                                step.status === 'completed' 
                                  ? 'text-sprout-700' 
                                  : step.status === 'active'
                                  ? 'text-lavender-700 font-medium'
                                  : 'text-warmGray-500'
                              }`}>
                                {step.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Research Findings */}
              {store.researchFindings.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-warmGray-700 mb-3">Research Insights</h3>
                  <div className="space-y-2">
                    {store.researchFindings.slice(-3).map((finding, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border ${SOURCE_COLORS[finding.source]} border-opacity-50`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{SOURCE_ICONS[finding.source]}</div>
                          <div className="flex-1">
                            <p className="text-xs line-clamp-2">{finding.summary}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs opacity-75">
                                Confidence: {Math.round(finding.confidence * 100)}%
                              </span>
                              <span className="text-xs opacity-75">
                                Relevance: {Math.round(finding.relevance * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-warmGray-800 mb-4">Audit Log</h2>
              <div className="space-y-2">
                {store.messages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-lg bg-warmGray-50 border border-warmGray-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-warmGray-600">
                        {msg.agent}
                      </span>
                      <span className="text-xs text-warmGray-400">
                        {msg.type}
                      </span>
                    </div>
                    <p className="text-sm text-warmGray-700 line-clamp-2">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Document View */}
        <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl overflow-hidden">
          {/* Document Header */}
          <div className="border-b border-white/20 p-6 bg-gradient-to-r from-white/80 to-lavender-secondary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-warm-neutral mb-2">Product Requirements Document</h3>
                <p className="text-warm-neutral/70">AI-enhanced PRD based on Klaviyo&apos;s proven template</p>
              </div>
              <div className="flex items-center gap-3">
                {store.loading && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-poppy-primary/10 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin text-poppy-primary" />
                    <span className="text-sm font-medium text-poppy-primary">Crafting...</span>
                  </div>
                )}
                {store.messages.some(m => m.type === 'document_complete') && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-sprout-success/10 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-sprout-success" />
                    <span className="text-sm font-medium text-sprout-success">Complete</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-y-auto">
            {store.messages.length === 0 ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-gradient-to-r from-poppy-primary/10 to-lavender-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-poppy-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-warm-neutral mb-3">Ready to Create Your PRD</h3>
                  <p className="text-warm-neutral/70 mb-6">Describe your product idea below and watch as our AI agents research, analyze, and craft a comprehensive PRD based on Klaviyo&apos;s proven template.</p>
                  <div className="grid grid-cols-2 gap-4 text-sm text-warm-neutral/60">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      <span>Deep Research</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <span>Scoped Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Smart Strategy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Release Phases</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <DocumentPreview messages={store.messages} onExport={exportToGoogleDrive} isExporting={store.isExporting} />
              </div>
            )}
          </div>

          {/* Input - Only show when appropriate */}
          {store.showInput && (
            <div className="border-t border-white/20 p-8 bg-gradient-to-r from-white/60 to-lavender-secondary/5 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={store.messages.some(m => m.type === 'document_complete') 
                  ? "Ask for refinements or start a new PRD... ✨" 
                  : "Describe the PRD you want to create... ✨"}
                className="flex-1 px-6 py-4 rounded-2xl border border-white/40 focus:border-poppy-primary focus:ring-4 focus:ring-poppy-primary/20 transition-all bg-white/80 backdrop-blur-sm text-lg placeholder-warm-neutral/60 shadow-lg"
                disabled={store.loading}
              />
              <button
                type="submit"
                disabled={store.loading || !input.trim()}
                className="px-8 py-4 bg-gradient-to-r from-poppy-primary via-lavender-secondary to-sprout-success text-white rounded-2xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-300 flex items-center gap-3 font-bold text-lg shadow-lg"
              >
                {store.loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Amplifying Your Ideas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {store.messages.some(m => m.type === 'document_complete') ? 'Refine PRD' : 'Amplify My PRD'}
                  </>
                )}
              </button>
            </form>
            </div>
          )}
        </div>
      </div>

      {/* Human Input Modal */}
      {store.showHumanInput && (
        <HumanInputModal
          isOpen={store.showHumanInput}
          onClose={() => store.setShowHumanInput(false)}
          onSubmit={() => {
            store.setShowHumanInput(false);
          }}
          questions={store.humanQuestions}
          agent="orchestrator"
        />
      )}
    </div>
  );
}