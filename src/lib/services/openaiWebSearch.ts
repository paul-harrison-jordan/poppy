import { openai } from '@/lib/openai';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  outputText: string;
  citations: Array<{
    url: string;
    title: string;
    startIndex: number;
    endIndex: number;
  }>;
}

/**
 * Perform web search using OpenAI Responses API with web_search tool
 */
export async function performOpenAIWebSearch(
  query: string,
  options?: {
    allowedDomains?: string[];
    userLocation?: {
      country?: string;
      city?: string;
      region?: string;
    };
  }
): Promise<WebSearchResponse> {
  try {
    console.log(`[OpenAIWebSearch] Searching: "${query}"`);

    // Build web_search tool configuration
    const webSearchTool: {
      type: 'web_search';
      filters?: { allowed_domains: string[] };
      user_location?: { type: string; country?: string; city?: string; region?: string };
    } = {
      type: 'web_search',
    };

    // Add domain filtering if specified
    if (options?.allowedDomains && options.allowedDomains.length > 0) {
      webSearchTool.filters = {
        allowed_domains: options.allowedDomains,
      };
    }

    // Add user location if specified
    if (options?.userLocation) {
      webSearchTool.user_location = {
        type: 'approximate',
        ...options.userLocation,
      };
    }

    // Call OpenAI Responses API with web search
    // Note: responses API might not be fully typed yet in SDK
    const response = await (openai as { responses: { create: (params: {
      model: string;
      tools: unknown[];
      input: string;
    }) => Promise<{
      output_text?: string;
      output?: Array<{
        type: string;
        content?: Array<{
          annotations?: Array<{
            type: string;
            url: string;
            title?: string;
            start_index: number;
            end_index: number;
          }>;
        }>;
      }>;
    }> } }).responses.create({
      model: 'gpt-4o',
      tools: [webSearchTool],
      input: query,
    });

    // Extract output text
    const outputText = response.output_text || '';

    // Extract citations from annotations
    const citations: Array<{
      url: string;
      title: string;
      startIndex: number;
      endIndex: number;
    }> = [];

    // Look for message output with annotations
    const outputItems = response.output || [];
    for (const item of outputItems) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.annotations) {
            for (const annotation of content.annotations) {
              if (annotation.type === 'url_citation') {
                citations.push({
                  url: annotation.url,
                  title: annotation.title || '',
                  startIndex: annotation.start_index,
                  endIndex: annotation.end_index,
                });
              }
            }
          }
        }
      }
    }

    // Convert citations to search results
    const results: WebSearchResult[] = citations.map((citation) => ({
      title: citation.title,
      url: citation.url,
      snippet: outputText.substring(
        citation.startIndex,
        Math.min(citation.endIndex, citation.startIndex + 200)
      ),
    }));

    console.log(`[OpenAIWebSearch] Found ${results.length} results with citations`);

    return {
      query,
      results,
      outputText,
      citations,
    };
  } catch (error) {
    console.error('[OpenAIWebSearch] Error performing web search:', error);
    throw error;
  }
}

/**
 * Search for technical term definitions using web search
 */
export async function searchTermWithWebSearch(term: string): Promise<{
  term: string;
  definition: string;
  sources: Array<{ url: string; title: string }>;
}> {
  const query = `Define "${term}" in the context of e-commerce and product management. Provide a clear technical definition.`;

  const searchResponse = await performOpenAIWebSearch(query);

  return {
    term,
    definition: searchResponse.outputText,
    sources: searchResponse.citations.map((c) => ({
      url: c.url,
      title: c.title,
    })),
  };
}

/**
 * Search for answers to PRD questions using web search
 */
export async function searchQuestionWithWebSearch(
  question: string,
  featureName: string,
  jtbd: string
): Promise<{
  question: string;
  answer: string;
  reasoning: string;
  sources: Array<{ url: string; title: string }>;
}> {
  const query = `Answer this product management question: "${question}"

Context:
- Feature: ${featureName}
- Job to be Done: ${jtbd}

Provide a clear answer with business reasoning and strategic considerations based on case studies and best practices.`;

  const searchResponse = await performOpenAIWebSearch(query);

  // Extract answer and reasoning from output
  // The model will naturally structure its response
  const fullText = searchResponse.outputText;

  // Split into answer and reasoning (simple heuristic)
  const parts = fullText.split(/reasoning:|because:|context:/i);
  const answer = parts[0].trim();
  const reasoning = parts.length > 1 ? parts.slice(1).join(' ').trim() : answer;

  return {
    question,
    answer: answer || fullText,
    reasoning: reasoning || 'Based on web research and industry best practices.',
    sources: searchResponse.citations.map((c) => ({
      url: c.url,
      title: c.title,
    })),
  };
}
