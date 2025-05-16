import { NextRequest, NextResponse } from 'next/server';
import { getUserIndex } from '@/lib/pinecone';
import { getAuthServerSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});


export async function POST(req: NextRequest) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isSchedulePage = referer.includes('/schedule');

    // Format username to comply with Pinecone naming requirements
    const formattedUsername = authSession.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

   
    const { embedding, useCase } = await req.json();

    if (isSchedulePage || useCase === 'schedule') {
      const index = pc.index('feedback')
      // For schedule page, use feedback namespace and get up to 4 matches
      const queryResponse = await index.namespace('feedback').query({
        vector: embedding,
        topK: 10,
        includeMetadata: true
      });

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

      const matchedContext = queryResponse.matches.map((match) => (
        match.metadata?.text || 'No text available'
      ));

      return NextResponse.json({ matchedContext });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 