import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'v0-sdk';
import { getAuthServerSession } from '@/lib/auth';

// Wrapper function with timeout and retry logic
async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 120000, // 2 minutes
  retries: number = 2
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms (attempt ${attempt})`)), timeoutMs)
        )
      ]);
    } catch (error) {
      if (attempt === retries) throw error;
      
      console.log(`Attempt ${attempt} failed, retrying...`, error);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
    }
  }
  throw new Error('All retry attempts exhausted');
}

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
      result = await withTimeout(
        v0Client.chats.sendMessage({
          chatId: chatId,
          message: combinedMessage
        }),
        120000, // 2 minutes timeout
        2 // 2 retries
      );
    } else {
      // Create new chat with enhanced system prompt for better designs
      console.log('Creating new v0 chat with design-focused system prompt');
      result = await withTimeout(
        v0Client.chats.create({
          message: combinedMessage,
          system: `You are an expert React and Next.js developer with a focus on creating exceptional user experiences. 

When creating designs:
1. Prioritize user experience and intuitive interactions
2. Use modern, responsive design patterns with Tailwind CSS
3. Create visually appealing interfaces with proper spacing and typography
4. Implement accessibility best practices
5. Focus on the core user workflow and value proposition
6. Use semantic HTML and proper component structure
7. Focus on desktop SaaS application design.

Create clean, production-ready code that follows React best practices.`,
        }),
        120000, // 2 minutes timeout
        2 // 2 retries
      );
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
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to create v0 chat';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'V0 design generation timed out. This can happen with complex designs. Please try again or simplify your request.';
        statusCode = 408; // Request Timeout
      } else if (error.message.includes('ECONNRESET') || error.message.includes('fetch failed')) {
        errorMessage = 'Connection to V0 service was interrupted. Please try again.';
        statusCode = 503; // Service Unavailable
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: statusCode === 408 || statusCode === 503
      },
      { status: statusCode }
    );
  }
}