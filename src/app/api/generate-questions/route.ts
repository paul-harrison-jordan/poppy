import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { generateQuestions, type GenerateQuestionsRequest } from '@/lib/services/openaiService';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  const startTime = Date.now();
  try {
    const body = await request.json() as GenerateQuestionsRequest;
    console.log(`[generate-questions] Request parsed in ${Date.now() - startTime}ms`);

    const aiStart = Date.now();
    const result = await generateQuestions(body);
    console.log(`[generate-questions] AI generation took ${Date.now() - aiStart}ms`);
    console.log(`[generate-questions] Total request time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating questions:', error);
    console.log(`[generate-questions] Error after ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
});
