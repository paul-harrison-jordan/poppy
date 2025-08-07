import { LLMAgent } from './LLMAgent';
import { AgentContext, AgentResult } from './types';

export interface Job {
  id: string;
  description: string;
  rank: number; // 1-5 scale
}

export interface JobsExtractionResult {
  jobs: Job[];
}

export class JobsExtractorAgent extends LLMAgent {
  constructor() {
    super(
      'JobsExtractorAgent',
      'Extract and rank jobs-to-be-done from raw feature input',
      'gpt-4o-mini',
      500,
      `Given the product idea below, list the top 3-5 jobs-to-be-done. Rank them by user importance. Return JSON: { jobs: [ {id: string, description: string, rank: 1-5} ] }

Product idea: {{input}}`,
      false, // Don't force model
      { type: 'extraction', criticality: 0.6 } // Extraction task
    );
  }

  protected parseResponse(response: string): JobsExtractionResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      // Validate structure
      if (!parsed.jobs || !Array.isArray(parsed.jobs)) {
        console.warn(`[${this.name}] Invalid response structure, returning empty jobs array`);
        return { jobs: [] };
      }

      // Filter and validate jobs
      const validJobs = parsed.jobs
        .filter((job: any) => 
          job && 
          typeof job.id === 'string' && 
          typeof job.description === 'string' && 
          typeof job.rank === 'number' &&
          job.rank >= 1 && job.rank <= 5
        )
        .sort((a: Job, b: Job) => a.rank - b.rank); // Sort by rank (1 = highest importance)

      return { jobs: validJobs };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return { jobs: [] };
    }
  }
}