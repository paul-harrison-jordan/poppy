import { streamChat } from '@/lib/services/openaiService';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { messages, storedContext: bodyContext, teamTerms: bodyTeamTerms } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Use context provided in the request body
    const storedContext = typeof bodyContext === 'string' ? bodyContext : '';
    const teamTerms = typeof bodyTeamTerms === 'object' && bodyTeamTerms !== null ? bodyTeamTerms : {};

    // Use centralized chat service
    return await streamChat({
      messages,
      storedContext,
      teamTerms
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 