import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { generateVocabulary } from '@/lib/services/openaiService';

export const POST = withAuth(async (session, request: Request) => {
  try {

    const { title, query, matchedContext, type } = await request.json();
    const result = await generateVocabulary({ title, query, matchedContext, type });
    return NextResponse.json({ teamTerms: result });
  } catch (error) {
    console.error('Error generating vocabulary:', error);
    return NextResponse.json(
      { error: 'Failed to generate vocabulary' },
      { status: 500 }
    );
  }
});
