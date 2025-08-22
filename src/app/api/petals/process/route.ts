import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api'
import { Session } from 'next-auth'

interface PetalRequest {
  selectedText: string
  prompt: string
  documentContext: string
  vectorStoreContext?: Array<{ content: string }>
  conversationHistory?: Array<{
    suggestion: string
    feedback: string
  }>
}

export const POST = withAuth<NextResponse, Session, [Request]>(async (_, request) => {
  try {
    const { 
      selectedText, 
      prompt, 
      documentContext, 
      vectorStoreContext = [],
      conversationHistory = []
    }: PetalRequest = await request.json()

    if (!selectedText || !prompt) {
      return NextResponse.json({ 
        error: 'Selected text and prompt are required' 
      }, { status: 400 })
    }

    // Build system prompt with Petal-specific context and guidelines
    const systemPrompt = `You are Petal, an AI assistant specialized in improving Product Requirement Documents (PRDs).

Your task is to improve the selected text based on the user's instructions.

Key guidelines:
1. Maintain the professional tone and structure of PRD documentation
2. Be specific and actionable in your improvements
3. Consider user needs, technical feasibility, and business value
4. Use clear, concise language that stakeholders can understand
5. Incorporate relevant context from the knowledge base when available

${vectorStoreContext.length > 0 ? `
Relevant context from knowledge base:
${vectorStoreContext.slice(0, 3).map((ctx) => ctx.content).join('\n\n')}
` : ''}

Document context:
${documentContext ? documentContext.substring(0, 2000) : 'Not provided'}

${conversationHistory.length > 0 ? `
Previous attempts and user feedback:
${conversationHistory.map((item) => `
Previous suggestion: ${item.suggestion}
User feedback: ${item.feedback}
`).join('\n')}

Based on the feedback above, provide a better improvement that addresses the user's concerns.
` : ''}`

    const userPrompt = `Original text to improve:
"${selectedText}"

User's improvement request:
"${prompt}"

Please provide:
1. An improved version of the text that addresses the request
2. A brief explanation of the key changes and why they improve the text`

    // Call generate-content endpoint with the Petal-specific prompts
    const contentResponse = await fetch(`${request.url.replace('/petals/process', '/generate-content')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        type: 'prd',
        title: 'Petal Text Improvement',
        query: userPrompt,
        questions: [],
        additionalContext: documentContext || '',
        teamTerms: {}, // Empty object to prevent undefined error
        storedContext: systemPrompt
      }),
    })

    if (!contentResponse.ok) {
      throw new Error('Failed to generate content')
    }

    const { content } = await contentResponse.json()
    
    // Parse the response to extract improved text and explanation
    const lines = content.split('\n').filter((line: string) => line.trim())
    
    let suggestedText = selectedText // fallback
    let explanation = 'Changes applied based on your request.'
    
    // Parse the structured response
    let inImprovedSection = false
    let inExplanationSection = false
    const improvedTextLines: string[] = []
    const explanationLines: string[] = []
    
    for (const line of lines) {
      if (line.match(/^1\.|improved.*text|revised.*text/i)) {
        inImprovedSection = true
        inExplanationSection = false
        continue
      } else if (line.match(/^2\.|explanation|key.*changes|why/i)) {
        inImprovedSection = false
        inExplanationSection = true
        continue
      }
      
      if (inImprovedSection && !line.match(/^[0-9]\./)) {
        improvedTextLines.push(line)
      } else if (inExplanationSection && !line.match(/^[0-9]\./)) {
        explanationLines.push(line)
      }
    }
    
    if (improvedTextLines.length > 0) {
      suggestedText = improvedTextLines.join('\n').replace(/^["']|["']$/g, '').trim()
    }
    
    if (explanationLines.length > 0) {
      explanation = explanationLines.join(' ').trim()
    } else if (!inImprovedSection && !inExplanationSection && lines.length > 0) {
      // Fallback: if no clear sections, assume first part is suggestion, rest is explanation
      const splitIndex = Math.ceil(lines.length * 0.6)
      suggestedText = lines.slice(0, splitIndex).join('\n').replace(/^["']|["']$/g, '').trim()
      explanation = lines.slice(splitIndex).join(' ').trim()
    }

    return NextResponse.json({
      suggestedText,
      explanation,
      contextUsed: vectorStoreContext.length,
      conversationTurns: conversationHistory.length
    })
  } catch (error) {
    console.error('Error processing Petal edit:', error)
    return NextResponse.json({ 
      error: 'Failed to process edit request' 
    }, { status: 500 })
  }
})