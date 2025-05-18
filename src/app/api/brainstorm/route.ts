import { NextResponse } from 'next/server';
import { brainstorm } from '@/lib/services/openaiService';

export const dynamic = 'force-dynamic'; // (Vercel quirk)

export async function POST(request: Request) {
  try {
    // 2. Parse and validate request body
    const { messages, additionalContext, teamTerms, storedContext, startPrd } = await request.json();

    if (!Array.isArray(messages) || !additionalContext || !storedContext) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    return await brainstorm({ messages, additionalContext, teamTerms, storedContext, startPrd });

  } catch (error) {
    console.error('Error in brainstorm API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}