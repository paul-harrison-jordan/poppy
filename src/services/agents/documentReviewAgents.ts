import { Agent } from '@openai/agents';

// Triage Agent - determines what type of review/assistance is needed
export const triageAgent = new Agent({
  name: 'Document Triage Agent',
  instructions: `You are a document triage agent. Your role is to:
- Quickly assess document review requests
- Identify the type of assistance needed (editing, feedback, restructuring, etc.)
- Route to appropriate specialist agents or provide direct assistance
- Understand context and user intent

Analyze the user's request and document context to provide the most relevant help.`,
  model: 'gpt-4o'
});

// Content Review Agent
export const contentReviewAgent = new Agent({
  name: 'Content Review Agent',
  instructions: `You are a content review specialist. You help with:
- Grammar and style improvements
- Clarity and readability enhancements
- Consistency checks
- Tone and voice adjustments

Provide specific, actionable feedback on document content.`,
  model: 'gpt-4o'
});

// Structure Review Agent
export const structureReviewAgent = new Agent({
  name: 'Structure Review Agent',
  instructions: `You are a document structure specialist. You help with:
- Document organization and flow
- Section ordering and hierarchy
- Information architecture
- Logical progression of ideas

Provide recommendations for improving document structure.`,
  model: 'gpt-4o'
});
