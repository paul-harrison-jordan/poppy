import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { getUserVectorStore, uploadDocumentToVectorStore, openai } from '@/lib/openai-vector';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { content, documentId, documentTitle } = await request.json();
    
    if (!content || !documentId) {
      return NextResponse.json(
        { error: 'Content and documentId are required' },
        { status: 400 }
      );
    }

    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!session.user.name) {
      return NextResponse.json({ error: 'User name not found' }, { status: 401 });
    }

    const formattedUsername = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    console.log('Attempting to get vector store for formatted username:', formattedUsername);
    
    try {
      const userStore = await getUserVectorStore(formattedUsername);
      console.log('Got user store result:', userStore);
      
      if (!userStore || !userStore.vectorStoreId) {
        console.error('Vector store or vectorStoreId is undefined:', { userStore, formattedUsername });
        return NextResponse.json(
          { error: 'Failed to get vector store ID', debug: { userStore, formattedUsername } },
          { status: 500 }
        );
      }
      
      const vectorStoreId = userStore.vectorStoreId;
      console.log('Using vector store ID:', vectorStoreId);
    
      if (!session.accessToken) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      // List existing files in the vector store
      const existingFiles = await openai.vectorStores.files.list(vectorStoreId);
      
      // Find and delete existing file with same documentId
      for (const file of existingFiles.data) {
        const fileDetails = await openai.files.retrieve(file.id);
        if (fileDetails.filename === `${documentId}.txt`) {
          await openai.vectorStores.files.delete(vectorStoreId, file.id);
          await openai.files.delete(file.id);
        }
      }

      // Upload new document
      const fileName = `${documentId}.txt`;
      const fileId = await uploadDocumentToVectorStore(
        vectorStoreId,
        content,
        fileName
      );
      
      return NextResponse.json({
        message: 'Document synced successfully',
        documentId,
        fileId,
        vectorStoreId
      });
    } catch (vectorStoreError) {
      console.error('Error with vector store operations:', vectorStoreError);
      return NextResponse.json(
        { error: 'Vector store operation failed', details: vectorStoreError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error syncing document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});