export interface EvalMetric {
  name: string;
  score: number; // 0-1 scale
  weight: number; // How important this metric is (0-1)
  details?: Record<string, unknown>;
}

export interface EvalResult {
  id: string;
  timestamp: Date;
  operation: string; // e.g., 'generate-content', 'brainstorm', 'analyze-document'
  model: string;
  input: {
    prompt?: string;
    context?: Record<string, unknown>;
    tokens?: number;
  };
  output: {
    content?: string;
    tokens?: number;
    latency?: number;
  };
  metrics: EvalMetric[];
  overallScore: number; // Weighted average of metrics
  metadata: {
    userId?: string;
    sessionId?: string;
    version?: string;
  };
}

export interface QualityConfig {
  operation: string;
  metrics: {
    name: string;
    evaluator: 'llm' | 'heuristic' | 'external';
    prompt?: string;
    weight: number;
  }[];
}

export type EvalStatus = 'pending' | 'completed' | 'failed';

export interface EvalJob {
  id: string;
  status: EvalStatus;
  result?: EvalResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}