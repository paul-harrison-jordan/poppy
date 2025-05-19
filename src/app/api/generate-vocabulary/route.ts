import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { generateVocabulary } from '@/lib/services/openaiService';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { title, query, matchedContext, type, teamTerms } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const result = await generateVocabulary({ title, query, matchedContext, type, teamTerms });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating vocabulary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate vocabulary' },
      { status: 500 }
    );
  }
});
