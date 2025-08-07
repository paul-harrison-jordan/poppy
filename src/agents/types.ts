export interface AgentContext {
  [key: string]: any;
}

export interface AgentResult {
  success: boolean;
  result: any;
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