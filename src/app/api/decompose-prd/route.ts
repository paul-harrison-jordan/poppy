import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api'
import { Session } from 'next-auth'
import { decomposePRD } from '@/lib/services/openaiService'

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, req) => {
  try {
    const body = await req.json()
    const { content, prompt } = body

    if (!content) {
      return NextResponse.json({ error: 'PRD content is required' }, { status: 400 })
    }

    // Default test prompt for now
    const decompositionPrompt = prompt || `# PRD Decomposition Prompt for Phased Releases

You are a product strategist specializing in breaking down Product Requirement Documents (PRDs) into sequential, narrow releases that enable faster development and early learning. Your goal is to transform a comprehensive PRD into a phased release plan that delivers value incrementally while reducing risk.

## Input
Here is a Product Requirement Document  ${content}

## Your Task
Analyze the PRD and create a phased release plan that:
1. Breaks down the full scope into 3-7 sequential phases
2. Each phase should be independently valuable and testable
3. Earlier phases should de-risk and inform later phases
4. Focus on product maturity milestones, not just technical implementation

## Analysis Framework

### Step 1: Core Capability Extraction
First, identify:
- What is the absolute minimum capability that proves the concept?
- What's the riskiest assumption that needs validation?
- What's the simplest version that delivers user value?

### Step 2: Decomposition Principles
Apply these principles when breaking down the PRD:

1. **Crawl → Walk → Run**: Start with basic functionality, add complexity gradually
2. **Visibility Before Automation**: Build observability before automated workflows
3. **Manual Before Magical**: Implement manual processes before automating
4. **Learn Before Scale**: Prioritize learning and feedback loops early
5. **Narrow Before Wide**: Focus on one use case before generalizing

### Step 3: Phase Structure
For each phase, provide:

**Phase [N]: [Descriptive Name]**
- **Goal**: What specific outcome this phase achieves
- **Scope**: 2-3 bullet points of what's included
- **Success Criteria**: How you'll know this phase is working
- **Learning Objectives**: What you'll learn to inform the next phase
- **Dependencies**: What must exist before starting this phase
- **Estimated Effort**: T-shirt size (S/M/L)

### Step 4: Sequencing Rationale
After listing all phases, provide a brief explanation of:
- Why this sequence maximizes learning and minimizes risk
- What assumptions each phase validates
- How each phase builds upon the previous one

## Output Format

### Phase Breakdown

[List each phase with the structure defined above]

### Sequencing Rationale
[2-3 paragraphs explaining the logic behind the sequence]

### Risk Mitigation
[Brief list of key risks addressed by this phased approach]

### Alternative Consideration
[One alternative sequencing approach and why you didn't choose it]

## Example Patterns to Consider

**Pattern 1: Detection → Visibility → Action**
- First, detect/identify the condition
- Then, make it visible to users
- Finally, enable users to act on it

**Pattern 2: Read → Write → Automate**
- First, surface existing data
- Then, allow manual data entry
- Finally, automate the process

**Pattern 3: Single → Batch → Real-time**
- First, handle individual cases
- Then, enable bulk operations
- Finally, provide real-time processing

## Key Questions to Answer

1. What's the thinnest slice that delivers real value?
2. What can we learn from each phase before building the next?
3. How does each phase reduce risk for subsequent phases?
4. Where are the natural break points in the feature?
5. What feedback loops can we establish early?

## Remember

- Each phase should be shippable and provide value
- Prefer smaller, more frequent releases over larger, complex ones
- Focus on learning and iteration, not just feature delivery
- Consider both technical and product risks
- Think about user adoption curves and change management

Analyze the provided PRD and create a phased release plan following this framework.

## IMPORTANT: Response Format
Respond with ONLY a valid JSON array of phase objects. Each phase object should have this structure:
{
  "name": "Phase name",
  "description": "Detailed description of what this phase accomplishes",
  "customer_value": "Justification and explination of customer value achieved by releasing this phase"
  "priority": 1
}

Do not include any markdown formatting, explanations, or text outside the JSON array. Return only the JSON array.`

    // Simple streaming - just return the full response using the centralized service
    return await decomposePRD({
      content,
      prompt: decompositionPrompt
    })

  } catch (error) {
    console.error('Error decomposing PRD:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decompose PRD' },
      { status: 500 }
    )
  }
})