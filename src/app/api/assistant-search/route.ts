import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { getUserVectorStore, openai, createFeedbackVectorStore } from '@/lib/openai-vector';
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

interface SearchResult {
  content: string;
  score: number;
  file_id: string;
  filename: string;
}

// Validate if vector store ID follows OpenAI pattern
function isValidVectorStoreId(vectorStoreId: string): boolean {
  return vectorStoreId.startsWith('vs_') && vectorStoreId.length > 3;
}

// Use OpenAI's new Responses API with file search
async function performFileSearch(vectorStoreId: string, query: string, maxResults: number = 10): Promise<SearchResult[]> {
  // Check if vector store ID is valid (follows vs_* pattern)
  if (!isValidVectorStoreId(vectorStoreId)) {
    console.warn(`Invalid vector store ID: ${vectorStoreId}. Vector stores may be disabled or not properly configured.`);
    return [];
  }

  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: query,
      tools: [{
        type: 'file_search',
        vector_store_ids: [vectorStoreId],
        max_num_results: maxResults
      }],
      include: ['file_search_call.results']
    });

    // Extract search results from the response
    const fileSearchCall = response.output.find(item => item.type === 'file_search_call');
    
    if (!fileSearchCall || fileSearchCall.type !== 'file_search_call') {
      return [];
    }

    // Since the OpenAI types may not include search_results yet, we'll access it safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchResults = (fileSearchCall as any).search_results;
    if (!searchResults || !Array.isArray(searchResults)) {
      return [];
    }

    // Return the search results as chunks
    return searchResults.map((result: unknown): SearchResult => {
      const resultObj = result as Record<string, unknown>;
      return {
        content: (resultObj.content as string) || (resultObj.text as string) || 'No content available',
        score: (resultObj.score as number) || 0,
        file_id: (resultObj.file_id as string) || '',
        filename: (resultObj.filename as string) || ''
      };
    });
  } catch (error) {
    console.error('File search error:', error);
    throw error;
  }
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

    const { query, useCase, vectorStoreId: clientVectorStoreId } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query format' }, { status: 400 });
    }

    if (isSchedulePage || useCase === 'schedule') {
      // Use feedback vector store for schedule page
      const { feedbackVectorStoreId: vectorStoreId } = await getFeedbackStore();
      
      if (!vectorStoreId) {
        return NextResponse.json({ error: 'Feedback store not initialized' }, { status: 500 });
      }

      const searchResults = await performFileSearch(vectorStoreId, query, 10);

      // If search results are empty due to disabled vector stores, return helpful placeholder
      if (searchResults.length === 0) {
        const placeholderContext = [{
          metadata: {
            text: `No relevant context found for query: "${query}". Vector store search may be disabled or no documents have been uploaded.`,
            score: 0,
            file_id: 'placeholder',
            filename: 'system_message'
          }
        }];
        return NextResponse.json({ matchedContext: placeholderContext });
      }

      const matchedContext = searchResults.map((result: SearchResult) => ({
        metadata: {
          text: result.content,
          score: result.score,
          file_id: result.file_id,
          filename: result.filename
        }
      }));

      return NextResponse.json({ matchedContext });
    } else {
      // Use user's vector store for other pages
      // Prefer client-provided vector store ID if available and valid
      let vectorStoreId: string;
      
      if (clientVectorStoreId && isValidVectorStoreId(clientVectorStoreId)) {
        vectorStoreId = clientVectorStoreId;
        console.log('Using cached vector store ID:', vectorStoreId);
      } else {
        const userStore = await getUserVectorStore(formattedUsername);
        vectorStoreId = userStore.vectorStoreId;
        console.log('Using server-side vector store ID:', vectorStoreId);
      }
      
      const searchResults = await performFileSearch(vectorStoreId, query, 10);

      // If search results are empty due to disabled vector stores, return helpful placeholder
      if (searchResults.length === 0) {
        const placeholderContext = [`No relevant context found for query: "${query}". Vector store search may be disabled or no documents have been uploaded.`];
        return NextResponse.json({ matchedContext: placeholderContext });
      }

      // Format results as context chunks for PRD mode
      const matchedContext = searchResults.map((result: SearchResult) => ({
        content: result.content,
        score: result.score,
        file_id: result.file_id,
        filename: result.filename
      }));

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