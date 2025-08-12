import { NextRequest, NextResponse } from 'next/server';
import { HelpDocsAnalyzer } from '@/agents/helpDocsAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const { helpDocsUrl } = await request.json();

    if (!helpDocsUrl) {
      return NextResponse.json(
        { error: 'Help documentation URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(helpDocsUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Extract domain name for competitor identification
    const competitor = url.hostname.replace(/^(www\.|help\.|docs\.|support\.)/, '').split('.')[0];
    
    // Initialize the help docs analyzer
    const analyzer = new HelpDocsAnalyzer();
    
    // Define targeted search queries for help documentation
    const searchQueries = [
      `site:${url.hostname} "how to" feature`,
      `site:${url.hostname} "getting started" guide`,
      `site:${url.hostname} benefits advantages`,
      `site:${url.hostname} "use cases" examples`,
      `site:${url.hostname} workflow automation`,
      `site:${url.hostname} integration API`,
      `site:${url.hostname} reporting analytics dashboard`,
      `site:${url.hostname} collaboration team`,
      `site:${url.hostname} security compliance`,
      `site:${url.hostname} pricing plans features`,
      `site:${url.hostname} customer success stories`,
      `site:${url.hostname} "best practices" tips`,
      `site:${url.hostname} troubleshooting common issues`,
      `site:${url.hostname} "what is" overview`,
      `site:${url.hostname} ROI value proposition`
    ];

    // Execute searches and analyze results
    const analysisResult = await analyzer.analyzeHelpDocs({
      url: helpDocsUrl,
      searchQueries,
      competitor
    });

    // Format response
    const response = {
      competitor: competitor.charAt(0).toUpperCase() + competitor.slice(1),
      helpDocsUrl,
      insights: analysisResult.insights,
      searchQueries: searchQueries.slice(0, 5), // Show first 5 queries for UI
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error analyzing help documentation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze help documentation', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}