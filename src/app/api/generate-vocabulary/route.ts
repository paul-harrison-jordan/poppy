import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { generateVocabulary } from '@/lib/services/openaiService';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
}
