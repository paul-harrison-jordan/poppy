import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { getUserVectorStore, openai } from '@/lib/openai-vector';

export const POST = withAuth<NextResponse, Session, [NextRequest]>(async (session, req: NextRequest) => {
  try {
    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { content, documentTitle, vectorStoreId: clientVectorStoreId } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!documentTitle || typeof documentTitle !== 'string') {
      return NextResponse.json({ error: 'Document title is required' }, { status: 400 });
    }

    const formattedUsername = (session.user.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Use client-provided vector store ID if available and valid, otherwise get from server
    let vectorStoreId: string;
    
    if (clientVectorStoreId && clientVectorStoreId.startsWith('vs_')) {
      vectorStoreId = clientVectorStoreId;
      console.log('Using client-provided vector store ID:', vectorStoreId);
    } else {
      const userStore = await getUserVectorStore(formattedUsername);
      vectorStoreId = userStore.vectorStoreId;
      console.log('Using server-side vector store ID:', vectorStoreId);
    }

    // Check if vector store is valid (not a placeholder)
    if (!vectorStoreId.startsWith('vs_')) {
      console.warn(`Invalid vector store ID: ${vectorStoreId}. Vector stores may be disabled.`);
      return NextResponse.json({ 
        message: 'Document processed but vector store is disabled',
        vectorStoreId: vectorStoreId
      });
    }

    try {
      // Create a file from the content
      const file = new File([content], `${documentTitle}.txt`, { type: 'text/plain' });
      
      // Upload file to OpenAI
      const uploadedFile = await openai.files.create({
        file: file,
        purpose: 'assistants'
      });

      // Add file to the vector store
      await openai.vectorStores.files.create(vectorStoreId, {
        file_id: uploadedFile.id
      });

      console.log(`Successfully uploaded document "${documentTitle}" to vector store ${vectorStoreId}`);

      return NextResponse.json({
        message: 'Document uploaded successfully',
        fileId: uploadedFile.id,
        vectorStoreId: vectorStoreId,
        documentTitle: documentTitle
      });

    } catch (error) {
      console.error('Error uploading to vector store:', error);
      
      // If OpenAI API fails, still return success so the sync doesn't fail completely
      return NextResponse.json({
        message: 'Document processed but upload to vector store failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        vectorStoreId: vectorStoreId
      });
    }

  } catch (error) {
    console.error('Error in vector store upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload to vector store' },
      { status: 500 }
    );
  }
});