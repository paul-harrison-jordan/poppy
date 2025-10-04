import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { query, type } = await request.json() as {
      query: string;
      type: 'term' | 'question';
      context?: { featureName?: string; jtbd?: string };
    };

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`[web-search] Searching for ${type}: "${query}"`);

    // This is a placeholder implementation
    // In production, this would use a real search API (Google Custom Search, Bing, etc.)
    // For now, we'll return mock results
    const mockResults = [
      {
        title: `Definition of ${query.split(' ')[0]}`,
        url: `https://example.com/${type}/${encodeURIComponent(query)}`,
        snippet: `This is a mock search result for "${query}". In production, this would return real search results from Google or another search provider.`
      },
      {
        title: `Understanding ${query.split(' ')[0]} in E-commerce`,
        url: `https://ecommerce-guide.com/${encodeURIComponent(query)}`,
        snippet: `Learn more about ${query} and how it applies to modern e-commerce platforms and marketing automation.`
      }
    ];

    console.log(`[web-search] Returning ${mockResults.length} results for "${query}"`);

    return NextResponse.json({
      results: mockResults,
      query,
      type
    });
  } catch (error) {
    console.error('[web-search] Error performing search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform search' },
      { status: 500 }
    );
  }
});
