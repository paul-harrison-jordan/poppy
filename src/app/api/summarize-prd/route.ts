import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { summarizePRD } from '@/lib/services/openaiService';

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

    // Create a focused summary for customer feedback matching using centralized service
    const summary = await summarizePRD({
      prdContent,
      title
    });

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