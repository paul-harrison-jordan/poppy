import { LLMAgent } from './LLMAgent';
import { AgentContext, AgentResult } from './types';

export interface OutcomeAnalysisResult {
  whatWorked: string[];
  whatFailed: string[];
  agentTweaks: string[];
}

export interface PRDOutcome {
  prd: string;
  feedback?: string;
  velocity?: {
    estimated: number;
    actual: number;
  };
  adoption?: {
    targetUsers: number;
    actualUsers: number;
  };
}

export class OutcomeAnalyzerAgent extends LLMAgent {
  constructor() {
    super(
      'OutcomeAnalyzerAgent',
      'Analyze PRD outcomes and extract learnings for continuous improvement',
      'gpt-4o',
      1000,
      `Analyze the PRD outcome data to identify what worked well, what failed, and how to improve the agent system.

PRD Content: {{prd}}
Engineering Feedback: {{feedback}}
Velocity Data: {{velocity}}  
Adoption Metrics: {{adoption}}

Analyze the outcome from these perspectives:
1. What aspects of the PRD were successful and should be replicated?
2. What aspects failed or caused problems and should be avoided?
3. What specific improvements could be made to the agent prompts or orchestration?

Return JSON: { whatWorked: string[], whatFailed: string[], agentTweaks: string[] }`,
      false, // Don't force model
      { type: 'analysis', criticality: 0.8, contextSize: 3000 } // Complex analysis task
    );
  }

  protected parseResponse(response: string): OutcomeAnalysisResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate structure and ensure arrays
      const whatWorked = Array.isArray(parsed.whatWorked) 
        ? parsed.whatWorked.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : [];
      
      const whatFailed = Array.isArray(parsed.whatFailed)
        ? parsed.whatFailed.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : [];
      
      const agentTweaks = Array.isArray(parsed.agentTweaks)
        ? parsed.agentTweaks.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : [];

      return {
        whatWorked,
        whatFailed,
        agentTweaks
      };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return {
        whatWorked: [],
        whatFailed: ['Failed to analyze outcome due to parsing error'],
        agentTweaks: ['Improve outcome analysis response format validation']
      };
    }
  }
}