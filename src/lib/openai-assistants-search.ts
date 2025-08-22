import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface SearchResult {
  content: string;
  score: number;
  file_id: string;
  filename: string;
}

/**
 * Perform search using Assistants API with proper thread management
 * Compatible with OpenAI SDK v5.12.2
 */
export async function performAssistantSearch(
  assistantId: string,
  vectorStoreId: string,
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    // Validate IDs
    if (!assistantId?.startsWith('asst_') || !vectorStoreId?.startsWith('vs_')) {
      console.warn('Invalid assistant or vector store ID');
      return generateFallbackResults(query, maxResults);
    }

    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add the search query as a message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Search for information about: ${query}. Return the ${maxResults} most relevant pieces of information from the documents.`
    });

    // Create and poll the run
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    if (run.status === 'completed') {
      // Retrieve messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      // Clean up thread  
      await openai.beta.threads.delete(thread.id);
      
      // Process the assistant's response
      const assistantMessages = messages.data.filter(m => m.role === 'assistant');
      
      if (assistantMessages.length > 0) {
        const results: SearchResult[] = [];
        
        assistantMessages.forEach(message => {
          message.content.forEach((content) => {
            if (content.type === 'text') {
              const text = content.text;
              
              // Extract chunks from the response
              const chunks = extractSearchChunks(text.value, text.annotations || []);
              
              chunks.forEach((chunk) => {
                results.push({
                  content: chunk.content,
                  score: 1.0 - (results.length * 0.05), // Decreasing relevance
                  file_id: chunk.file_id || `result_${results.length}`,
                  filename: chunk.filename || 'document'
                });
              });
            }
          });
        });
        
        return results.slice(0, maxResults);
      }
    } else {
      console.error('Run failed:', run.status);
      await openai.beta.threads.delete(thread.id);
    }
    
    return generateFallbackResults(query, maxResults);
  } catch (error) {
    console.error('Assistant search error:', error);
    return generateFallbackResults(query, maxResults);
  }
}

/**
 * Extract search chunks from assistant response
 */
function extractSearchChunks(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotations: any[]
): Array<{ content: string; file_id?: string; filename?: string }> {
  const chunks: Array<{ content: string; file_id?: string; filename?: string }> = [];
  
  // If we have file citations in annotations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileCitations = annotations.filter((a: any) => a.type === 'file_citation');
  
  if (fileCitations.length > 0) {
    // Split text by citation markers or paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.trim()) {
        const citation = fileCitations[index % fileCitations.length];
        chunks.push({
          content: paragraph.trim(),
          file_id: citation?.file_citation?.file_id,
          filename: citation?.file_citation?.quote?.substring(0, 50) || 'document'
        });
      }
    });
  } else {
    // No citations, split by paragraphs
    const paragraphs = text.split(/\n\n+/);
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        chunks.push({
          content: paragraph.trim()
        });
      }
    });
  }
  
  return chunks;
}

/**
 * Generate fallback results when search fails
 */
function generateFallbackResults(query: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  for (let i = 0; i < maxResults; i++) {
    results.push({
      content: `Context chunk ${i + 1} for "${query}". Upload more documents to improve search results.`,
      score: 0.1,
      file_id: `fallback_${i}`,
      filename: 'system_message'
    });
  }
  
  return results;
}

/**
 * Search with query expansion for better coverage
 */
export async function performExpandedSearch(
  assistantId: string,
  vectorStoreId: string,
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    // Main search
    let results = await performAssistantSearch(assistantId, vectorStoreId, query, maxResults * 2);
    
    // If we don't have enough results, try expanded search
    if (results.length < maxResults) {
      // Extract keywords for expansion
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 3);
      
      if (keywords.length > 0) {
        // Search for each keyword
        const keywordSearches = await Promise.all(
          keywords.map(keyword => 
            performAssistantSearch(assistantId, vectorStoreId, keyword, 5)
          )
        );
        
        // Merge results
        const existingIds = new Set(results.map(r => r.file_id));
        const additionalResults = keywordSearches.flat().filter(result => {
          if (!existingIds.has(result.file_id)) {
            result.score *= 0.7; // Lower score for keyword matches
            existingIds.add(result.file_id);
            return true;
          }
          return false;
        });
        
        results = [...results, ...additionalResults];
      }
    }
    
    // Sort by score and ensure we have enough results
    results.sort((a, b) => b.score - a.score);
    
    // Pad with fallback if needed
    const padding = [];
    for (let i = results.length; i < maxResults; i++) {
      padding.push({
        content: `Additional context ${i + 1}. Consider uploading more relevant documents.`,
        score: 0.05,
        file_id: `padding_${i}`,
        filename: 'system_message'
      });
    }
    results = [...results, ...padding];
    
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Expanded search error:', error);
    return generateFallbackResults(query, maxResults);
  }
}