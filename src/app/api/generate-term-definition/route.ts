import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { searchTermWithWebSearch } from '@/lib/services/openaiWebSearch';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { term } = await request.json() as {
      term: string;
    };

    if (!term) {
      return NextResponse.json(
        { error: 'Term is required' },
        { status: 400 }
      );
    }

    console.log(`[generate-term-definition] Searching and generating definition for: "${term}"`);

    // Use OpenAI Responses API with web search
    const result = await searchTermWithWebSearch(term);

    console.log(`[generate-term-definition] Generated definition for "${term}" with ${result.sources.length} sources`);

    return NextResponse.json({
      definition: result.definition,
      sources: result.sources,
    });
  } catch (error) {
    console.error('[generate-term-definition] Error generating definition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate definition' },
      { status: 500 }
    );
  }
});
