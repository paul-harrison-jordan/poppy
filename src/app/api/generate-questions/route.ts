import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { generateQuestions, type GenerateQuestionsRequest } from '@/lib/services/openaiService';

export const POST = withAuth(async (session, request: Request) => {
  try {
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
});
