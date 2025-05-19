import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getUserIndex } from '@/lib/pinecone';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { vectors } = await request.json();
    if (!vectors || !Array.isArray(vectors)) {
      return NextResponse.json(
        { error: 'Vectors array is required' },
        { status: 400 }
      );
    }

    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!session.user.name) {
      return NextResponse.json({ error: 'User name not found' }, { status: 401 });
    }

    // Format username to comply with Pinecone naming requirements
    const formattedUsername = session.user.name
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
    if (!session.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const namespace = index.namespace('ns1');
    const existingVectors = await namespace.listPaginated({ prefix: `${documentId}#` });
    const idsToDelete = existingVectors.vectors?.map(v => v.id) ?? [];
    if (idsToDelete.length > 0) {
      await namespace.deleteMany(idsToDelete);
    }

    await namespace.upsert(formattedEmbeddings);
    
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
}); 
