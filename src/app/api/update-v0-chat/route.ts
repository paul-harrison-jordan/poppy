import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'v0-sdk';

export async function POST(request: NextRequest) {
  try {
    const { chatId, message, apiKey } = await request.json();

    if (!chatId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing chatId or message' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'V0 API key is required. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    // Initialize v0 client with user's API key
    const v0 = createClient({
      apiKey: apiKey,
    });

    // Send message to existing chat
    const response = await v0.chats.sendMessage({
      chatId,
      message
    });

    console.log('v0 chat message sent:', response);

    return NextResponse.json({
      success: true,
      chat: {
        id: response.id,
        demo: response.demo,
        url: response.url
      }
    });

  } catch (error) {
    console.error('Error sending v0 chat message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send chat message. Please check your API key.' },
      { status: 500 }
    );
  }
} 