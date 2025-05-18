import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface CacheEntry {
  lastModified: string
  summary: string
}

const summaryCache = new Map<string, CacheEntry>()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      prdId,
      lastModified,
      comments,
      teamTerms,
      context
    } = (await request.json()) as {
      prdId?: string
      lastModified?: string | null
      comments?: Array<{ resolved: boolean; user_name: string; content: string }>
      teamTerms?: string
      context?: string
    }

    if (!prdId || !lastModified) {
      return NextResponse.json(
        { error: 'prdId and lastModified are required' },
        { status: 400 }
      )
    }

    const lastModifiedStr = String(lastModified)

    const cached = summaryCache.get(prdId)
    if (cached && cached.lastModified === lastModifiedStr) {
      return NextResponse.json({ summary: cached.summary })
    }

    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json({ error: 'Comments array is required' }, { status: 400 })
    }

    // Filter out resolved comments and format them for the prompt
    const unresolvedComments = comments
      .filter(comment => !comment.resolved)
      .map(comment => `${comment.user_name}: ${comment.content}`)
      .join('\n')

    if (!unresolvedComments) {
      return NextResponse.json({ summary: 'No unresolved comments to summarize.' })
    }

    const prompt = `As a product manager, analyze this thread of team comments and identify the key themes and questions that need to be addressed. Consider the context and flow of the conversation, including any follow-up questions or clarifications. Focus on actionable insights and prioritize the most critical points that need the PM's attention. 
    I have included relevant team terms ${teamTerms} and personal context ${context} that will help you understand the context of the conversation.
    
    Here is the comment thread:

${unresolvedComments}

Please provide a concise summary that:
1. Identifies the main themes and concerns
2. Highlights any unanswered questions or points needing clarification
3. Notes any areas where team members seem to be in agreement or disagreement
4. Suggests what actions the PM should take to address these points

Keep the summary focused and actionable.`

    const completion = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        {
          role: "system",
          content: "You are a product management assistant helping to analyze team feedback threads. Your goal is to identify key themes, questions, and action items that need the PM's attention. Consider the context and flow of the conversation when analyzing the comments."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })

    const summary = completion.choices[0].message.content || 'Unable to generate summary at this time.'

    summaryCache.set(prdId, { lastModified: lastModifiedStr, summary })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error summarizing comments:', error)
    return NextResponse.json(
      { error: 'Failed to summarize comments' },
      { status: 500 }
    )
  }
} 
