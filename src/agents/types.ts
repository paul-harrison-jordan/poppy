export interface AgentContext {
  [key: string]: unknown;
}

export interface AgentResult {
  success: boolean;
  result: unknown;
  metadata?: {
    tokensUsed?: number;
    modelUsed?: string;
    executionTime?: number;
  };
  error?: string;
}

export interface Agent {
  name: string;
  purpose: string;
  model: 'gpt-4o-mini' | 'gpt-4o' | 'o3';
  maxTokens: number;
  execute(context: AgentContext): Promise<AgentResult>;
}