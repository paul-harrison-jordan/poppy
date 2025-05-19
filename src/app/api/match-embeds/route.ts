import { NextRequest, NextResponse } from 'next/server';
import { getUserIndex } from '@/lib/pinecone';
import { withAuth } from '@/lib/api';
import { headers } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';
import { Session } from 'next-auth';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});


export const POST = withAuth<NextResponse, Session, [NextRequest]>(async (session, req: NextRequest) => {
  try {
    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isSchedulePage = referer.includes('/schedule');

    // Format username to comply with Pinecone naming requirements
    const formattedUsername = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const { embedding, useCase } = await req.json();

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json({ error: 'Invalid embedding format' }, { status: 400 });
    }

    if (isSchedulePage || useCase === 'schedule') {
      const index = pc.index('feedback')
      // For schedule page, use feedback namespace and get up to 4 matches
      const queryResponse = await index.namespace('feedback').query({
        vector: embedding,
        topK: 10,
        includeMetadata: true
      });

      if (!queryResponse?.matches) {
        console.error('No matches found in Pinecone response:', queryResponse);
        return NextResponse.json({ matchedContext: [] });
      }

      const matchedContext = queryResponse.matches.map((match) => ({
        metadata: match.metadata
      }));

      return NextResponse.json({ matchedContext });
    } else {
      // Original behavior for other pages
      const index = getUserIndex(formattedUsername);
      const queryResponse = await index.namespace('ns1').query({
        vector: embedding,
        topK: 10,
        includeMetadata: true
      });

      if (!queryResponse?.matches) {
        console.error('No matches found in Pinecone response:', queryResponse);
        return NextResponse.json({ matchedContext: [] });
      }

      const matchedContext = queryResponse.matches.map((match) => (
        match.metadata?.text || 'No text available'
      ));

      return NextResponse.json({ matchedContext });
    }
  } catch (error) {
    console.error('Error matching embeddings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to match embeddings' },
      { status: 500 }
    );
  }
}); 
