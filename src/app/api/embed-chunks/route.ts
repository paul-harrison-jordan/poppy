import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { buildPineconeRecords } from '@/app/embed';


export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const documentId = body.documentId;
    const chunks = body.chunks;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const formattedEmbeddings = await buildPineconeRecords(chunks, documentId);
    
    return NextResponse.json({
      message: 'Document synced successfully',
      formattedEmbeddings: formattedEmbeddings,
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