import { LLMAgent } from './LLMAgent';
// import { AgentContext, AgentResult } from './types';

export interface Competitor {
  name: string;
  summary: string;
  ourEdge: string;
}

export interface CompetitiveLandscapeResult {
  competitors: Competitor[];
}

export class CompetitiveLandscaperAgent extends LLMAgent {
  constructor() {
    super(
      'CompetitiveLandscaperAgent',
      'Analyze competitive landscape and differentiation',
      'gpt-4o',
      800,
      `Based on the jobs-to-be-done provided, analyze the competitive landscape. Identify key competitors and how they solve these problems, then suggest our differentiation opportunities.

Jobs-to-be-done: {{jobs}}

For each competitor, provide:
- competitorName: The name of the competing product/company
- theirSolutionSummary: How they solve the jobs-to-be-done
- ourEdge: How we can differentiate from their approach

Return JSON: { competitors: [ {name: string, summary: string, ourEdge: string} ] }

TODO: plug search API for real-time competitive intelligence`,
      false, // Don't force model
      { type: 'analysis', criticality: 0.8, contextSize: 2000 } // Complex analysis task
    );
  }

  protected parseResponse(response: string): CompetitiveLandscapeResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate structure
      if (!parsed.competitors || !Array.isArray(parsed.competitors)) {
        console.warn(`[${this.name}] Invalid response structure, returning empty competitors array`);
        return { competitors: [] };
      }

      // Filter and validate competitors
      const validCompetitors = parsed.competitors
        .filter((competitor: unknown): competitor is Competitor => 
          competitor !== null &&
          typeof competitor === 'object' &&
          'name' in competitor &&
          'summary' in competitor &&
          'ourEdge' in competitor &&
          typeof (competitor as Competitor).name === 'string' && 
          typeof (competitor as Competitor).summary === 'string' && 
          typeof (competitor as Competitor).ourEdge === 'string' &&
          (competitor as Competitor).name.trim().length > 0 &&
          (competitor as Competitor).summary.trim().length > 0 &&
          (competitor as Competitor).ourEdge.trim().length > 0
        );

      return { competitors: validCompetitors };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return { competitors: [] };
    }
  }
}