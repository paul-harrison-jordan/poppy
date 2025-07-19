import { NextRequest, NextResponse } from 'next/server';
import { v0 } from 'v0-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create a new chat with v0
    const chat = await v0.chats.create({
      message: message
    });

    console.log('Chat created:', chat.id);
    console.log('Demo URL:', chat.demo);

    return NextResponse.json({
      success: true,
      chat: {
        id: chat.id,
        demo: chat.demo,
        url: chat.url
      }
    });

  } catch (error) {
    console.error('Error creating v0 chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
} 