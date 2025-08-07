import { LLMAgent } from './LLMAgent';
// import { AgentContext, AgentResult } from './types';

export interface EngineeringEstimateResult {
  storyPoints: number;
  rolesNeeded: string[];
  risks: string[];
}

export class EngineeringEstimatorAgent extends LLMAgent {
  constructor() {
    super(
      'EngineeringEstimatorAgent',
      'Provide a first-pass effort estimate and resource needs',
      'gpt-4o-mini',
      600,
      `Based on the feature scope and team structure provided, estimate the engineering effort required.

Feature Scope: {{scope}}
Team Structure: {{teamStructure}}

Consider:
- Technical complexity and implementation effort
- Dependencies and integration requirements
- Testing and quality assurance needs
- Documentation and deployment considerations

Provide estimates in story points (1-100 scale) and identify:
- Required engineering roles/skills
- Technical and project risks

Return JSON: { storyPoints: number, rolesNeeded: string[], risks: string[] }`,
      false, // Don't force model
      { type: 'analysis', criticality: 0.6 } // Estimation analysis task
    );
  }

  protected parseResponse(response: string): EngineeringEstimateResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate and ensure positive integer for story points
      let storyPoints = typeof parsed.storyPoints === 'number' ? Math.round(Math.abs(parsed.storyPoints)) : 5;
      if (storyPoints <= 0) {
        console.warn(`[${this.name}] Invalid story points ${parsed.storyPoints}, defaulting to 5`);
        storyPoints = 5;
      }

      // Ensure rolesNeeded is an array of strings
      const rolesNeeded = Array.isArray(parsed.rolesNeeded) 
        ? parsed.rolesNeeded.filter((role: any) => typeof role === 'string' && role.trim().length > 0)
        : [];

      // Ensure risks is an array of strings
      const risks = Array.isArray(parsed.risks)
        ? parsed.risks.filter((risk: any) => typeof risk === 'string' && risk.trim().length > 0)
        : [];

      return {
        storyPoints,
        rolesNeeded,
        risks
      };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return {
        storyPoints: 5,
        rolesNeeded: ['Full-stack Developer'],
        risks: ['Parsing error occurred - estimates may be inaccurate']
      };
    }
  }
}