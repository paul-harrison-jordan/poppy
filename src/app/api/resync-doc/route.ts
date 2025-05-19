import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getUserIndex } from '@/lib/pinecone';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const formattedUsername = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

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
      message: 'Document resynced successfully',
      documentId: documentId,
    });
  } catch (error) {
    console.error('Error resyncing document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resync document' },
      { status: 500 }
    );
  }
});
