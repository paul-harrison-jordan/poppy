import { NextRequest, NextResponse } from 'next/server';
import { CompetitiveLandscaperAgent } from '@/agents/competitiveLandscaper';

export async function POST(request: NextRequest) {
  try {
    const { query, urls, productContext, username } = await request.json();

    if (!query || !urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Query and URLs array are required' },
        { status: 400 }
      );
    }

    const agent = new CompetitiveLandscaperAgent();
    const result = await agent.analyzeWithHelpDocs(query, urls, productContext, username);

    // Return structured data for React component rendering
    return NextResponse.json({
      competitors: result.competitors,
      summary: result.summary,
      analysis: result.analysis,
      searchedUrls: result.searchedUrls,
      sourceCount: result.competitors.reduce((sum, comp) => sum + (comp.relevantArticles?.length || 0), 0)
    });

  } catch (error) {
    console.error('Competitive analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform competitive analysis' },
      { status: 500 }
    );
  }
}