import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'v0-sdk';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Fast auth check
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Minimal input validation
    const { chatId, message, apiKey: clientApiKey } = await request.json();
    if (!chatId || !message) {
      return NextResponse.json({ 
        error: 'Chat ID and message are required' 
      }, { status: 400 });
    }

    // Fast API key setup
    const apiKey = clientApiKey || process.env.V0_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'V0 API key required' }, { status: 400 });
    }

    // Initialize V0 client (fast)
    const v0Client = createClient({ apiKey });

    console.log('Sending message to V0 chat:', chatId);

    // Focused message sending
    const result = await v0Client.chats.sendMessage({
      chatId,
      message
    });

    // Fast response
    return NextResponse.json({
      chatId: result.id,
      chatUrl: result.url,
      demoUrl: result.demo,
      status: 'processing'
    });

  } catch (error) {
    console.error('V0 message send error:', error);
    
    return NextResponse.json({
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}