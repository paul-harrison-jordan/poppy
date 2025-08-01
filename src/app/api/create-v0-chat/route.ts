import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'v0-sdk';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { designPrompt, prdContent, chatId, apiKey: clientApiKey } = await request.json();

    if (!designPrompt) {
      return NextResponse.json(
        { error: 'Design prompt is required' },
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

    // Combine design prompt with PRD context for better designs
    let combinedMessage = designPrompt;
    if (prdContent) {
      combinedMessage = `${designPrompt}

Context from PRD:
${prdContent.substring(0, 2000)}${prdContent.length > 2000 ? '...' : ''}`;
    }

    console.log('Creating v0 chat with enhanced prompt:', {
      designPromptLength: designPrompt.length,
      hasPrdContent: !!prdContent,
      prdContentLength: prdContent?.length,
      combinedMessageLength: combinedMessage.length,
      chatId: chatId || 'new'
    });

    let result;

    if (chatId) {
      // Continue existing chat using the new SDK method
      console.log('Continuing v0 chat:', chatId);
      result = await v0Client.chats.sendMessage({
        chatId: chatId,
        message: combinedMessage
      });
    } else {
      // Create new chat with enhanced system prompt for better designs
      console.log('Creating new v0 chat with design-focused system prompt');
      result = await v0Client.chats.create({
        message: combinedMessage,
        system: `You are an expert React and Next.js developer with a focus on creating exceptional user experiences. 

When creating designs:
1. Prioritize user experience and intuitive interactions
2. Use modern, responsive design patterns with Tailwind CSS
3. Create visually appealing interfaces with proper spacing and typography
4. Implement accessibility best practices
5. Focus on the core user workflow and value proposition
6. Use semantic HTML and proper component structure
7. Consider mobile-first responsive design

Create clean, production-ready code that follows React best practices.`,
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
      { error: 'Failed to create v0 chat', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}