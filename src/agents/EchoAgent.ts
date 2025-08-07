import { LLMAgent } from './LLMAgent';
import { AgentContext, AgentResult } from './types';

export class EchoAgent extends LLMAgent {
  constructor() {
    super(
      'EchoAgent',
      'Simple test agent that echoes input',
      'gpt-4o-mini',
      100,
      'Echo this text: {{input}}',
      true, // Force model for deterministic testing
      { type: 'extraction', criticality: 0.1 } // Simple test task
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Override to provide deterministic behavior for testing
    const input = context.input || '';
    
    return {
      success: true,
      result: `Echo: ${input}`,
      metadata: {
        tokensUsed: 10,
        modelUsed: this.model,
        executionTime: 50
      }
    };
  }
}