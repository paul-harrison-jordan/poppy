import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: prdId } = await params;
    
    if (!prdId) {
      return NextResponse.json({ error: 'PRD ID is required' }, { status: 400 });
    }

    // Get PRD details from database
    const supabase = createServiceClient();
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('id, title, "drive-link"')
      .eq('id', prdId)
      .eq('user', session.user.email)
      .single();

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 });
    }

    // Extract document ID and fetch content
    const docId = prd['drive-link'].match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!docId) {
      return NextResponse.json({ error: 'Invalid Google Drive link' }, { status: 400 });
    }

    // Fetch document content
    const docResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/get-google-doc-content`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ docId }),
    });

    if (!docResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch PRD content' }, { status: 500 });
    }

    const { content } = await docResponse.json();
    if (!content) {
      return NextResponse.json({ error: 'No content found in PRD' }, { status: 400 });
    }

    // First, summarize the PRD content
    const summaryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/summarize-prd`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        prdContent: content,
        title: prd.title
      }),
    });

    if (!summaryResponse.ok) {
      return NextResponse.json({ error: 'Failed to summarize PRD' }, { status: 500 });
    }

    const { summary } = await summaryResponse.json();

    // Then match customers using the summary
    const matchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/match-customers-to-prd`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        prdSummary: summary
      }),
    });

    if (!matchResponse.ok) {
      return NextResponse.json({ error: 'Failed to match customers' }, { status: 500 });
    }

    const matchData = await matchResponse.json();

    return NextResponse.json(matchData);

  } catch (error) {
    console.error('Error in manual customer matching:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}