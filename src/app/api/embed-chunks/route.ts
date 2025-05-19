import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { buildPineconeRecords } from '@/app/embed';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const chunks = body.chunks;
    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isSchedulePage = referer.includes('/schedule');
   

    if (isSchedulePage) {
      return NextResponse.json({
        message: 'Schedule page request received',
        formattedEmbeddings: [],
      });
    } else {
      const documentId = body.documentId;
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
    }
  } catch (error) {
    console.error('Error syncing document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 