import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { KlaviyoHelpScraper } from '@/lib/services/klaviyoHelpScraper';

export const POST = withAuth(async (session: Session, request: Request) => {
  try {
    const { helpUrls } = await request.json();
    
    if (!helpUrls || !Array.isArray(helpUrls)) {
      return NextResponse.json(
        { error: 'helpUrls must be an array' },
        { status: 400 }
      );
    }

    const scraper = new KlaviyoHelpScraper();
    const helpArticles = await scraper.scrapeMultipleArticles(helpUrls);
    
    if (helpArticles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to scrape any help articles' },
        { status: 500 }
      );
    }

    const styleGuide = scraper.extractStyleAndTone(helpArticles);

    const helpExamples = helpArticles.map(article => ({
      title: article.title,
      structure: article.sections.map(s => s.heading).join(', '),
      navigation: article.navigation.slice(0, 3),
      limitations: article.limitations.slice(0, 3),
      sample: article.sections[0]?.content.substring(0, 200)
    }));

    return NextResponse.json({ 
      styleGuide,
      helpExamples,
      articlesCount: helpArticles.length
    });
  } catch (error) {
    console.error('Error scraping help articles:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape help articles' },
      { status: 500 }
    );
  }
});