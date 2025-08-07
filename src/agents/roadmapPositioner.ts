import { LLMAgent } from './LLMAgent';
// import { AgentContext, AgentResult } from './types';

export interface RoadmapPositionResult {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  rationale: string;
  conflicts: string[];
}

export class RoadmapPositionerAgent extends LLMAgent {
  constructor() {
    super(
      'RoadmapPositionerAgent',
      'Position feature within existing roadmap and strategy',
      'gpt-4o',
      700,
      `Based on the current roadmap and the new feature idea, determine the best quarter to position this feature and identify any potential conflicts.

Current Roadmap: {{currentRoadmap}}
Feature Idea: {{featureIdea}}

Consider:
- Dependencies on existing roadmap items
- Resource availability and team capacity
- Strategic importance and business impact
- Technical complexity and development time

Return JSON: { quarter: string, rationale: string, conflicts: string[] }

Quarter must be one of: Q1, Q2, Q3, Q4`,
      false, // Don't force model
      { type: 'synthesis', criticality: 0.7 } // Strategic synthesis task
    );
  }

  protected parseResponse(response: string): RoadmapPositionResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate structure
      if (!parsed.quarter || !parsed.rationale) {
        console.warn(`[${this.name}] Invalid response structure, using default values`);
        return { 
          quarter: 'Q2', 
          rationale: 'Default positioning due to parsing error',
          conflicts: []
        };
      }

      // Validate quarter format
      const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarter = validQuarters.includes(parsed.quarter) ? parsed.quarter : 'Q2';
      
      if (!validQuarters.includes(parsed.quarter)) {
        console.warn(`[${this.name}] Invalid quarter "${parsed.quarter}", defaulting to Q2`);
      }

      // Ensure conflicts is an array
      const conflicts = Array.isArray(parsed.conflicts) 
        ? parsed.conflicts.filter((conflict: unknown): conflict is string => typeof conflict === 'string' && conflict.trim().length > 0)
        : [];

      return {
        quarter: quarter as 'Q1' | 'Q2' | 'Q3' | 'Q4',
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : 'No rationale provided',
        conflicts
      };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return { 
        quarter: 'Q2', 
        rationale: 'Default positioning due to parsing error',
        conflicts: []
      };
    }
  }
}