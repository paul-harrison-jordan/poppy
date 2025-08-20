import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

export const POST = withAuth(async (_session: Session, request: Request) => {
  try {
    const { urls } = await request.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    const previews = await Promise.all(
      urls.map(async (url) => {
        try {
          // Quick validation to check if URL is accessible
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            // Try to get the title from the page
            const fullResponse = await fetch(url);
            const html = await fullResponse.text();
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch 
              ? titleMatch[1].replace(' | Klaviyo', '').trim()
              : 'Klaviyo Help Article';
            
            return {
              url,
              title,
              isValid: true
            };
          } else {
            return {
              url,
              title: 'Invalid URL',
              isValid: false
            };
          }
        } catch {
          return {
            url,
            title: 'Failed to fetch',
            isValid: false
          };
        }
      })
    );

    return NextResponse.json({ previews });
  } catch (error) {
    console.error('Error validating URLs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate URLs' },
      { status: 500 }
    );
  }
});