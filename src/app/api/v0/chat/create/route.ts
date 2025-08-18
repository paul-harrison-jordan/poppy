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
    const { message, apiKey: clientApiKey } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fast API key setup
    const apiKey = clientApiKey || process.env.V0_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'V0 API key required' }, { status: 400 });
    }

    // Initialize V0 client (fast)
    const v0Client = createClient({ apiKey });

    console.log('Creating V0 chat with optimized system prompt');

    // Focused V0 creation
    const result = await v0Client.chats.create({
      message,
      system: `You are an expert React/Next.js developer focused on exceptional UX.

Create modern, professional SaaS interfaces with:
• Intuitive navigation and clear visual hierarchy
• Modern responsive design with Tailwind CSS
• Accessibility best practices
• Desktop-optimized layouts
• Clean, production-ready code

Focus on core user workflow and value proposition.`,
      modelConfiguration: {
        modelId: 'v0-1.5-lg',
        imageGenerations: true,
        thinking: true
      }
    });

    // Fast response
    return NextResponse.json({
      chatId: result.id,
      chatUrl: result.url,
      demoUrl: result.demo,
      status: 'creating'
    });

  } catch (error) {
    console.error('V0 chat creation error:', error);
    
    return NextResponse.json({
      error: 'Failed to create chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}