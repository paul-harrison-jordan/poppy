import { LLMAgent } from './LLMAgent';
import { AgentContext, AgentResult } from './types';

export interface PRDSection {
  sectionName: string;
  content: string;
}

export class PRDWriterAgent extends LLMAgent {
  constructor() {
    super(
      'PRDWriterAgent',
      'Write specific sections of PRD with full context',
      'o3',
      1200,
      `You are a product manager writing a specific section of a Product Requirements Document (PRD). 

Section to write: {{sectionName}}

Context provided: {{context}}

Write a comprehensive, well-structured section that:
- Is clear and actionable for engineering teams
- Follows standard PRD formatting and structure
- Incorporates the provided context appropriately
- Is detailed enough to guide implementation decisions

Focus only on the requested section. Write in markdown format.`,
      true, // Force o3 model for high-quality generation
      { type: 'generation', criticality: 0.9, outputComplexity: 0.9 } // High-quality generation task
    );
  }

  protected parseResponse(response: string): PRDSection {
    // For PRD sections, we want to preserve the raw markdown content
    const content = response.trim();
    
    // Extract the section name from context if available, or default
    const sectionName = this.currentSectionName || 'unknown_section';
    
    return {
      sectionName,
      content
    };
  }

  private currentSectionName: string = '';

  async execute(context: AgentContext): Promise<AgentResult> {
    // Store the section name for the parseResponse method
    this.currentSectionName = (context.sectionName as string) || 'unknown_section';
    
    const result = await super.execute(context);
    
    if (result.success && typeof result.result === 'object' && result.result !== null) {
      // Add the section name to the result
      (result.result as PRDSection).sectionName = this.currentSectionName;
    }
    
    return result;
  }
}