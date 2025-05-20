import { Tool } from '../tools';

export interface AgentState {
  currentGoal: string;
  completedSteps: AgentStep[];
  pendingSteps: AgentStep[];
  context: {
    documents: any[];
    teamTerms: Record<string, string>;
    personalContext: string;
  };
}

export interface AgentStep {
  tool: string;
  parameters: Record<string, any>;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface AgentConfig {
  tools: Record<string, Tool>;
  maxRetries?: number;
  onStepComplete?: (step: AgentStep) => void;
  onStepError?: (step: AgentStep, error: Error) => void;
  onGoalComplete?: (state: AgentState) => void;
} 