export interface ActionPlan {
  id: string;
  objective: string;
  tasks: ActionTask[];
  expectedOutcome: string;
  totalEffort: string;
  impactScore: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  createdAt: Date;
  feedback?: string;
}

export interface ActionTask {
  id: string;
  action: string;
  rationale: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'minutes' | 'hours' | 'days';
  tool: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

export interface ToolCall {
  id: string;
  tool: string;
  description: string;
  status: 'calling' | 'completed' | 'failed';
  result?: unknown;
  timestamp: Date;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  plan?: ActionPlan;
  toolCalls?: ToolCall[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface DocumentInsight {
  type: 'gap' | 'risk' | 'opportunity' | 'strength';
  section: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction?: string;
}

export interface ProactiveAnalysis {
  documentScore: number;
  insights: DocumentInsight[];
  topRecommendations: string[];
  estimatedImprovementTime: string;
}