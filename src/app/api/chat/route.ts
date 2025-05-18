import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const dynamic = 'force-dynamic';


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, storedContext: bodyContext, teamTerms: bodyTeamTerms } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Use context provided in the request body
    const storedContext = typeof bodyContext === 'string' ? bodyContext : '';
    const teamTerms = typeof bodyTeamTerms === 'object' && bodyTeamTerms !== null ? bodyTeamTerms : {};

    // Format team terms for the prompt
    const formattedTeamTerms = Object.entries(teamTerms)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    // Construct system prompt
    const systemPrompt = `
      You are Poppy, an AI assistant helping product managers with their work. You have access to the following context:

      Here are the team's key terms:
      ${formattedTeamTerms}

      Here is the user's personal context:
      ${storedContext}

      Answer the user's questions using the above context. If the context is not enough, say so. You are meant to be a representation of the user's work, so you should know the answers to the questions.

      Your responses should be helpful, insightful, and concise. You should strive to be direct and to the point.
    `;

    // Call OpenAI with message history
    const chatMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: ChatMessage) => ({ 
        role: m.role, 
        content: m.content 
      } as ChatCompletionMessageParam)),
    ];

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: chatMessages,
      stream: true,
    });

    // Return streaming response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 