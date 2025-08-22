import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { getUserVectorStore, openai, createFeedbackVectorStore } from '@/lib/openai-vector';
import { performAssistantSearch, performExpandedSearch } from '@/lib/openai-assistants-search';
import { headers } from 'next/headers';

let feedbackVectorStoreId: string | null = null;
let feedbackAssistantId: string | null = null;

async function getFeedbackStore() {
  if (!feedbackVectorStoreId) {
    feedbackVectorStoreId = await createFeedbackVectorStore();
    
    const assistant = await openai.beta.assistants.create({
      name: 'Feedback Assistant',
      instructions: 'You are a helpful assistant that searches through customer feedback and returns relevant information.',
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

// Validate if assistant ID follows OpenAI pattern
function isValidAssistantId(assistantId: string): boolean {
  return assistantId.startsWith('asst_') && assistantId.length > 5;
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
      const { feedbackVectorStoreId: vectorStoreId, feedbackAssistantId: assistantId } = await getFeedbackStore();
      
      if (!vectorStoreId || !assistantId) {
        return NextResponse.json({ error: 'Feedback store not initialized' }, { status: 500 });
      }

      if (!isValidVectorStoreId(vectorStoreId) || !isValidAssistantId(assistantId)) {
        console.warn('Invalid store IDs, returning placeholder results');
        return NextResponse.json({ 
          matchedContext: [{
            metadata: {
              text: `Search functionality is currently limited. Query: "${query}"`,
              score: 0,
              file_id: 'placeholder',
              filename: 'system_message'
            }
          }]
        });
      }

      // Use expanded search for better results
      const searchResults = await performExpandedSearch(assistantId, vectorStoreId, query, 10);

      // Format results for schedule page
      const matchedContext = searchResults.map((result: SearchResult) => ({
        metadata: {
          text: result.content,
          score: result.score,
          file_id: result.file_id,
          filename: result.filename
        }
      }));

      // Ensure we have at least some context
      if (matchedContext.length === 0) {
        matchedContext.push({
          metadata: {
            text: `No specific matches found for: "${query}". Consider uploading more relevant documents.`,
            score: 0,
            file_id: 'no-results',
            filename: 'system_message'
          }
        });
      }

      return NextResponse.json({ matchedContext });
    } else {
      // Use user's vector store for other pages
      // Always get the full user store to ensure we have both IDs
      const userStore = await getUserVectorStore(formattedUsername);
      
      const vectorStoreId = clientVectorStoreId && isValidVectorStoreId(clientVectorStoreId)
        ? clientVectorStoreId
        : userStore.vectorStoreId;
      
      if (clientVectorStoreId && isValidVectorStoreId(clientVectorStoreId)) {
        console.log('Using cached vector store ID:', vectorStoreId);
      } else {
        console.log('Using server-side vector store ID:', vectorStoreId);
      }
      
      const assistantId = userStore.assistantId;

      if (!isValidVectorStoreId(vectorStoreId) || !isValidAssistantId(assistantId)) {
        console.warn('Invalid store IDs, returning limited results');
        return NextResponse.json({ 
          matchedContext: Array(10).fill(0).map((_, i) => ({
            content: `Context chunk ${i + 1}. Vector store search is currently unavailable.`,
            score: 0.1,
            file_id: `placeholder-${i}`,
            filename: 'system_placeholder'
          }))
        });
      }

      // Use expanded search for comprehensive results
      const searchResults = await performExpandedSearch(assistantId, vectorStoreId, query, 20);

      console.log(`Vector store search for "${query}" returned ${searchResults.length} results`);

      // Format results as context chunks
      let matchedContext = searchResults.map((result: SearchResult) => ({
        content: result.content,
        score: result.score,
        file_id: result.file_id,
        filename: result.filename
      }));

      // If we have fewer than 10 results, try individual keyword search
      if (matchedContext.length < 10) {
        console.log(`Only ${matchedContext.length} results found, attempting keyword expansion...`);
        
        // Extract important keywords (longer words, likely to be meaningful)
        const keywords = query
          .split(/\s+/)
          .filter(word => word.length > 4)
          .slice(0, 3); // Top 3 keywords
        
        if (keywords.length > 0) {
          // Search for each keyword individually
          const keywordPromises = keywords.map(keyword =>
            performAssistantSearch(assistantId, vectorStoreId, keyword, 5)
          );
          
          const keywordResults = await Promise.all(keywordPromises);
          const allKeywordResults = keywordResults.flat();
          
          // Merge with existing results, avoiding duplicates
          const existingFileIds = new Set(matchedContext.map(ctx => ctx.file_id));
          const newResults = allKeywordResults
            .filter(result => !existingFileIds.has(result.file_id))
            .map((result: SearchResult) => ({
              content: result.content,
              score: result.score * 0.7, // Lower score for keyword-only matches
              file_id: result.file_id,
              filename: result.filename
            }));
          
          matchedContext = [...matchedContext, ...newResults];
        }
      }

      // Sort by score and take top 10
      matchedContext = matchedContext
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // If still less than 10, add informative placeholders
      while (matchedContext.length < 10) {
        matchedContext.push({
          content: `Additional context slot ${matchedContext.length + 1}. Upload more documents to improve search results.`,
          score: 0.05,
          file_id: `placeholder-${matchedContext.length}`,
          filename: 'system_placeholder'
        });
      }

      console.log(`Returning ${matchedContext.length} context chunks`);
      return NextResponse.json({ matchedContext });
    }
  } catch (error) {
    console.error('Error searching vector store:', error);
    
    // Return graceful degradation response
    const fallbackContext = Array(10).fill(0).map((_, i) => ({
      content: `Search temporarily unavailable (chunk ${i + 1}/10). Please try again.`,
      score: 0,
      file_id: `error-${i}`,
      filename: 'error_message'
    }));
    
    return NextResponse.json({ 
      matchedContext: fallbackContext,
      error: error instanceof Error ? error.message : 'Search service error'
    }, { status: 200 }); // Return 200 with error in body to prevent frontend crash
  }
});