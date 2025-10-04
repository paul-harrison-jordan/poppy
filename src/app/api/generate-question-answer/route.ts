import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { searchQuestionWithWebSearch } from '@/lib/services/openaiWebSearch';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { question, featureName, jtbd } = await request.json() as {
      question: string;
      featureName: string;
      jtbd: string;
    };

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    console.log(`[generate-question-answer] Searching and generating answer for: "${question}"`);

    // Use OpenAI Responses API with web search
    const result = await searchQuestionWithWebSearch(question, featureName, jtbd);

    console.log(`[generate-question-answer] Generated answer for "${question}" with ${result.sources.length} sources`);

    return NextResponse.json({
      answer: result.answer,
      reasoning: result.reasoning,
      sources: result.sources.map(s => s.url),
    });
  } catch (error) {
    console.error('[generate-question-answer] Error generating answer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate answer' },
      { status: 500 }
    );
  }
});
