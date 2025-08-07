import { LLMAgent } from './LLMAgent';
import { AgentContext, AgentResult } from './types';

export interface ScopeAnalysisResult {
  inScope: string[];
  outOfScope: string[];
}

export class ScopeAnalyzerAgent extends LLMAgent {
  constructor() {
    super(
      'ScopeAnalyzerAgent',
      'Convert extracted jobs into clear in-scope/out-of-scope boundaries',
      'gpt-4o-mini',
      600,
      `Based on the jobs-to-be-done and constraints provided, define clear in-scope and out-of-scope boundaries. Return JSON: { inScope: string[], outOfScope: string[] }

Jobs to be done: {{jobs}}
Constraints: {{constraints}}

Consider what features, functionality, and requirements should be included in this release (in-scope) versus what should be excluded or deferred (out-of-scope).`,
      false, // Don't force model
      { type: 'analysis', criticality: 0.7 } // Analysis task
    );
  }

  protected parseResponse(response: string): ScopeAnalysisResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate structure
      if (!parsed.inScope || !parsed.outOfScope) {
        console.warn(`[${this.name}] Invalid response structure, returning empty scope arrays`);
        return { inScope: [], outOfScope: [] };
      }

      // Ensure arrays and filter out invalid entries
      const inScope = Array.isArray(parsed.inScope) 
        ? parsed.inScope.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : [];
      
      const outOfScope = Array.isArray(parsed.outOfScope)
        ? parsed.outOfScope.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        : [];

      return { inScope, outOfScope };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return { inScope: [], outOfScope: [] };
    }
  }
}