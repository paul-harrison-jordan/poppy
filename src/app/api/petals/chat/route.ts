import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { run } from '@openai/agents'
import { triageAgent } from '@/services/agents/documentReviewAgents'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  documentContext: z.string().optional(),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  sections: z.record(z.string()).optional(),
  focusArea: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validatedData = ChatRequestSchema.parse(body)
    
    const { message, documentContext, chatHistory, sections, focusArea } = validatedData
    
    let fullPrompt = message
    
    if (documentContext) {
      fullPrompt = `
Document Context:
${documentContext}

${sections ? `
Document Sections:
${Object.entries(sections).map(([name, content]) => 
  `${name}:\n${content}`
).join('\n\n')}
` : ''}

${chatHistory && chatHistory.length > 0 ? `
Previous Conversation:
${chatHistory.slice(-5).map(msg => 
  `${msg.role}: ${msg.content}`
).join('\n')}
` : ''}

User Request: ${message}

${focusArea ? `Focus Area: ${focusArea}` : ''}
`
    }
    
    const result = await run(triageAgent, fullPrompt)
    
    const finalOutput = result.finalOutput || ''
    const suggestions = extractSuggestions(finalOutput)
    const improvements = extractImprovements(finalOutput)
    
    const response = {
      response: finalOutput,
      agent: 'Document Review Triage',
      suggestions,
      improvements,
      metadata: {
        hasActionableItems: suggestions.length > 0 || improvements.length > 0,
        confidence: 'medium' as const
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in Petals chat:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

function extractSuggestions(output: string): string[] {
  const suggestions: string[] = []
  
  const patterns = [
    /(?:suggest|recommend|consider|try|could|should)\s+(.+?)(?:\.|$)/gi,
    /(?:improvement|enhancement):\s*(.+?)(?:\.|$)/gi
  ]
  
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(output)) !== null) {
      if (match[1] && match[1].length > 10 && match[1].length < 200) {
        suggestions.push(match[1].trim())
      }
    }
  })
  
  return [...new Set(suggestions)].slice(0, 5)
}

function extractImprovements(output: string): Array<{text: string, section?: string}> {
  const improvements: Array<{text: string, section?: string}> = []
  
  const sectionPattern = /(?:for|in)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+section:/gi
  const improvementPattern = /(?:improve|revise|rewrite|update):\s*(.+?)(?:\.|$)/gi
  
  let match
  let currentSection: string | undefined
  
  while ((match = sectionPattern.exec(output)) !== null) {
    currentSection = match[1]
  }
  
  while ((match = improvementPattern.exec(output)) !== null) {
    if (match[1]) {
      improvements.push({
        text: match[1].trim(),
        section: currentSection
      })
    }
  }
  
  return improvements.slice(0, 3)
}

