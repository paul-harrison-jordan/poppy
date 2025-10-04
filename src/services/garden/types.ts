// Garden Types
export type AgentType = 'orchestrator' | 'planning' | 'strategy' | 'research' | 'design' | 'scoping' | 'writing';

// Extended types for improved functionality
export interface WorkflowPhase {
  id: string;
  name: string;
  icon: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  subSteps?: {
    name: string;
    status: 'pending' | 'active' | 'completed';
  }[];
  findings?: number;
  confidence?: number;
}

export interface ResearchFinding {
  source: 'vectordb' | 'klaviyo' | 'web' | 'competitive' | 'internal';
  summary: string;
  confidence: number;
  relevance: number;
  timestamp: string;
}

export interface QualityMetrics {
  completeness: number;
  confidence: number;
  research_depth: number;
}

export interface GardenRequest {
  query: string;
  storedContext?: string;
  teamTerms?: Record<string, string>;
  existingDocument?: {
    title: string;
    content: string;
  };
}

export interface AgentUpdate {
  type: 'thinking' | 'orchestration' | 'agent_executing' | 'agent_response' | 'final_response' | 'error' | 'needs_human_input' | 'human_response_received' | 'phase_start' | 'research_finding' | 'document_complete';
  agent: AgentType | 'system';
  content: string;
  agents_selected?: string[];
  googleDoc?: GoogleDocResult;
  questions?: HumanQuestion[];
  userResponses?: Record<string, string>;
  phase?: string;
  document?: any;
  metadata?: {
    source?: string;
    confidence?: number;
    relevance?: number;
    optional?: boolean;
    continuesWithout?: boolean;
    steps?: string[];
    quality_score?: number;
    completeness?: number;
    sections?: string[];
    tokensUsed?: number;
  };
}

export interface HumanQuestion {
  id: string;
  category: 'user_problem' | 'business_context' | 'technical' | 'market';
  question: string;
  why_important: string;
  required: boolean;
  options?: string[];
}

export interface AgentDefinition {
  type: AgentType;
  name: string;
  systemPrompt: string;
  description: string;
}

export interface OrchestrationPlan {
  thinking: string;
  agents_needed: AgentType[];
  sub_queries: Record<string, string>;
}

export interface AgentResponse {
  agent: AgentType;
  query: string;
  response: string;
  timestamp: string;
  tokensUsed?: number;
}

export interface GoogleDocResult {
  success: boolean;
  docId: string;
  docUrl: string;
  title: string;
  documentType: string;
  createdAt: string;
  preview: string;
  fullContent: string;
}

export interface WritingAgentResult {
  agent: 'writing';
  originalQuery: string;
  document: {
    title: string;
    content: string;
    documentType: string;
    sections: string[];
    suggestedFilename: string;
  };
  agentResponsesProcessed: number;
  timestamp: string;
  tokensUsed?: number;
}

export interface ResearchInsight {
  source: 'vectordb' | 'klaviyo' | 'web' | 'competitive' | 'internal';
  query: string;
  summary: string;
  details: any;
  confidence: number;
  relevance: number;
  timestamp: string;
}