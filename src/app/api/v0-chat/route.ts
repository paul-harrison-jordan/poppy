import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'v0-sdk';

export async function POST(request: NextRequest) {
  try {
    const { message, chatId, apiKey: clientApiKey } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use client-provided API key or fallback to server environment variable
    const apiKey = clientApiKey || process.env.V0_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'V0 API key is required. Provide via request body or V0_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Initialize v0 SDK with API key
    const v0Client = createClient({ apiKey });

    let result;

    if (chatId) {
      // Continue existing chat using the new SDK method
      console.log('Continuing v0 chat:', chatId);
      result = await v0Client.chats.sendMessage({
        chatId: chatId,
        message: message
      });
    } else {
      // Create new chat
      console.log('Creating new v0 chat with message:', message.substring(0, 100) + '...');
      result = await v0Client.chats.create({
        message: message,
        system: 'You are an expert React and Next.js developer. Create responsive, modern UI components using Tailwind CSS.',
      });
    }

    console.log('V0 chat result:', {
      id: result.id,
      url: result.url,
      demo: result.demo ? 'Present' : 'Not available'
    });

    return NextResponse.json({
      success: true,
      chatId: result.id,
      chatUrl: result.url,
      demoUrl: result.demo, // This should contain the iframe URL
      isNewChat: !chatId
    });

  } catch (error) {
    console.error('V0 SDK error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process v0 request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}