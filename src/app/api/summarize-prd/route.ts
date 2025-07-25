import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openai } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prdContent, title } = await request.json();
    
    if (!prdContent) {
      return NextResponse.json({ error: 'PRD content is required' }, { status: 400 });
    }

    console.log('Summarizing PRD for customer matching:', { title, contentLength: prdContent.length });

    // Create a focused summary for customer feedback matching
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a product manager assistant that creates concise summaries of PRDs specifically for matching against customer feedback.

Focus on:
1. Core user problems and pain points addressed
2. Key features and functionality described
3. User experience improvements mentioned
4. Specific use cases and scenarios
5. Target user types and personas

Create a clear, searchable summary that would match well against customer feedback about related problems, requests, or experiences. Use natural language that customers might use when describing these issues.

Keep the summary under 200 words but comprehensive enough to capture the essence of what customers might have feedback about.`
        },
        {
          role: 'user',
          content: `Please summarize this PRD for customer feedback matching:

Title: ${title || 'Untitled PRD'}

Content:
${prdContent}`
        }
      ]
    });

    const summary = completion.choices[0].message.content;
    
    if (!summary) {
      throw new Error('No summary generated from OpenAI');
    }

    console.log('PRD summary generated:', {
      originalLength: prdContent.length,
      summaryLength: summary.length,
      summary: summary.substring(0, 100) + '...'
    });

    return NextResponse.json({
      success: true,
      summary: summary,
      originalTitle: title
    });

  } catch (error) {
    console.error('Error summarizing PRD:', error);
    return NextResponse.json({
      error: 'Failed to summarize PRD',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}