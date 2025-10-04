import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WRITING_AGENT } from '@/services/garden/agents/writing';

interface AgentResponse {
  agent: string;
  query: string;
  response: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      originalQuery, 
      agentResponses, 
      documentType = 'analysis',
      storedContext = '',
      teamTerms = {} 
    } = body;

    if (!originalQuery || !agentResponses || !Array.isArray(agentResponses)) {
      return NextResponse.json({ 
        error: 'Original query and agent responses are required' 
      }, { status: 400 });
    }

    const formattedTeamTerms = Object.entries(teamTerms)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const agentSummary = agentResponses
      .map((resp: AgentResponse) => 
        `${resp.agent.toUpperCase()} AGENT:\n${resp.response}\n`
      )
      .join('\n');

    const writingPrompt = `ORIGINAL QUERY: ${originalQuery}

CONTEXT: ${storedContext}

TEAM TERMS:
${formattedTeamTerms}

AGENT RESPONSES:
${agentSummary}

DOCUMENT TYPE: ${documentType}

Create a comprehensive, well-structured document that synthesizes all agent insights into a professional PM document. Follow the formatting guidelines and respond with the specified JSON format.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: WRITING_AGENT.systemPrompt },
        { role: 'user', content: writingPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const documentResult = JSON.parse(response.choices[0].message.content || '{}');
    
    const result = {
      agent: 'writing',
      originalQuery,
      document: documentResult,
      agentResponsesProcessed: agentResponses.length,
      timestamp: new Date().toISOString(),
      tokensUsed: response.usage?.total_tokens || 0
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Writing agent error:', error);
    return NextResponse.json(
      { error: 'Writing agent failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}