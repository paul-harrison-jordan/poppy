import { NextResponse } from 'next/server';
import { getUserIndex } from '@/lib/pinecone';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    
    // Format username to comply with Pinecone naming requirements
    const formattedUsername = authSession.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-') // Replace multiple consecutive hyphens with a single one
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const indexName = `${formattedUsername}`;
    
    const index = getUserIndex(indexName);

    const embedding = await request.json();

    
    const queryResponse = await index.namespace('ns1').query({
      vector: embedding,
      topK: 10,
      includeMetadata: true
    });
    
    const matchedContext = queryResponse.matches.map((match) => (
        match.metadata?.text || 'No text available'
    ));


    return NextResponse.json({ matchedContext });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 