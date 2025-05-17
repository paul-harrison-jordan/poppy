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

    await index.namespace('ns1').delete1({ filter: { documentId } });
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