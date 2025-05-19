import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, []>(async (session) => {
  try {
    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!session.user.name) {
      return NextResponse.json({ error: 'User name not found' }, { status: 401 });
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Format username to comply with Pinecone naming requirements
    const formattedUsername = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-') // Replace multiple consecutive hyphens with a single one
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const indexName = `${formattedUsername}`;

    // Check if the index already exists
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === indexName) || false;

    if (!indexExists) {
      // Create a new index if it doesn't exist
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // dimension for text-embedding-3-small
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });

      return NextResponse.json({
        message: 'Pinecone index created successfully',
        username: session.user.name,
        indexName,
      });
    } else {
      return NextResponse.json({
        message: 'Pinecone index already exists',
        username: session.user.name,
        indexName,
      });
    }
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize Pinecone index' },
      { status: 500 }
    );
  }
});
