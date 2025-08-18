import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'v0-sdk';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, apiKey: clientApiKey } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
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

    console.log('Checking V0 chat status for:', chatId);

    // Get the current status of the chat
    const chat = await v0Client.chats.getById(chatId);
    
    console.log('V0 chat status:', {
      id: chat.id,
      status: chat.status,
      hasDemo: !!chat.demo,
      url: chat.url
    });

    // Determine if generation is complete
    const isComplete = chat.status === 'completed' || chat.status === 'error';
    const isError = chat.status === 'error';

    return NextResponse.json({
      chatId: chat.id,
      status: chat.status,
      isComplete,
      isError,
      chatUrl: chat.url,
      demoUrl: chat.demo, // This should contain the iframe URL when ready
      message: isError ? 'Generation failed' : 
               isComplete ? 'Design generation complete!' : 
               'Generating design...'
    });

  } catch (error) {
    console.error('V0 status check error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to check chat status';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        errorMessage = 'Chat not found. It may have been deleted or expired.';
        statusCode = 404;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : 'Unknown error',
        chatId: null,
        isComplete: true, // Stop polling on error
        isError: true
      },
      { status: statusCode }
    );
  }
}