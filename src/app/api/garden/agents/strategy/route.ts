import { NextRequest, NextResponse } from 'next/server';
import { AgentRegistry } from '@/services/garden';
import { openai } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, storedContext = '', teamTerms = {} } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const formattedTeamTerms = Object.entries(teamTerms)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: AgentRegistry.getPrompt('strategy') },
        { 
          role: 'user', 
          content: `Context: ${storedContext}\n\nTeam Terms:\n${formattedTeamTerms}\n\nQuery: ${query}` 
        }
      ]
    });

    const result = {
      agent: 'strategy',
      query,
      response: response.choices[0].message.content || 'No response available',
      timestamp: new Date().toISOString(),
      tokensUsed: response.usage?.total_tokens || 0
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Strategy agent error:', error);
    return NextResponse.json(
      { error: 'Strategy agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}