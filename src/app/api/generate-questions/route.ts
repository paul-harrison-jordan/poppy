import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { generateQuestions, type GenerateQuestionsRequest } from '@/lib/services/openaiService';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json() as GenerateQuestionsRequest;
    const result = await generateQuestions(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
