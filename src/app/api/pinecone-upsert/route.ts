import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { getUserIndex } from '@/lib/pinecone';

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
    
    const body = await request.json();
    const documentId = body.documentId;
    const formattedEmbeddings = body.formattedEmbeddings;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Set the access token from the session
    if (!authSession.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Remove any existing vectors associated with this document
    await index.namespace('ns1').deleteMany({ prefix: documentId });

    // Verify deletion succeeded before upserting
    const remaining = await index.namespace('ns1').listPaginated({ prefix: documentId });

    if (remaining.vectors && remaining.vectors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to delete existing vectors for document' },
        { status: 500 }
      );
    }

    await index.namespace('ns1').upsert(formattedEmbeddings);
    
    return NextResponse.json({
      message: 'Document synced successfully',
      documentId: documentId,
    });
  } catch (error) {
    console.error('Error syncing document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 