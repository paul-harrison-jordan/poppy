import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { getUserVectorStore, searchVectorStore, openai, createFeedbackVectorStore } from '@/lib/openai-vector';
import { headers } from 'next/headers';

let feedbackVectorStoreId: string | null = null;
let feedbackAssistantId: string | null = null;

async function getFeedbackStore() {
  if (!feedbackVectorStoreId) {
    feedbackVectorStoreId = await createFeedbackVectorStore();
    
    const assistant = await openai.beta.assistants.create({
      name: 'Feedback Assistant',
      instructions: 'You are a helpful assistant that searches through customer feedback.',
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [feedbackVectorStoreId]
        }
      }
    });
    
    feedbackAssistantId = assistant.id;
  }
  
  return { feedbackVectorStoreId, feedbackAssistantId };
}

export const POST = withAuth<NextResponse, Session, [NextRequest]>(async (session, req: NextRequest) => {
  try {
    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isSchedulePage = referer.includes('/schedule');

    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const formattedUsername = (session.user.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const { query, useCase } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query format' }, { status: 400 });
    }

    if (isSchedulePage || useCase === 'schedule') {
      // Use feedback vector store for schedule page
      const { feedbackAssistantId: assistantId, feedbackVectorStoreId: vectorStoreId } = await getFeedbackStore();
      
      if (!assistantId || !vectorStoreId) {
        return NextResponse.json({ error: 'Feedback store not initialized' }, { status: 500 });
      }

      const results = await searchVectorStore(
        assistantId,
        vectorStoreId,
        query,
        10
      );

      const matchedContext = results.map((result) => ({
        metadata: {
          text: result.content,
          annotations: result.annotations
        }
      }));

      return NextResponse.json({ matchedContext });
    } else {
      // Use user's vector store for other pages
      const { assistantId, vectorStoreId } = await getUserVectorStore(formattedUsername);
      
      const results = await searchVectorStore(
        assistantId,
        vectorStoreId,
        query,
        10
      );

      const matchedContext = results.map((result) => 
        result.content || 'No text available'
      );

      return NextResponse.json({ matchedContext });
    }
  } catch (error) {
    console.error('Error searching vector store:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search vector store' },
      { status: 500 }
    );
  }
});