import { NextResponse } from 'next/server';
import { embedChunks } from '@/app/embed';
import { withAuth } from '@/lib/api';
import { headers } from 'next/headers';

export const POST = withAuth(async (session, request: Request) => {
  try {

    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isSchedulePage = referer.includes('/schedule');
    const isBrainstormPage = referer.includes('/brainstorm');
    const isChatPage = referer.includes('/chat') || referer.endsWith('/');
    const body = await request.json();
    
    if (isSchedulePage) {
      const input = body.input || '';
      const queryEmbedding = await embedChunks([input]);
      return NextResponse.json({ queryEmbedding });
    } 

    if (isChatPage) {
      const input = body.text || '';
      const queryEmbedding = await embedChunks([input])
      return NextResponse.json({ queryEmbedding });
    }
    else if (isBrainstormPage) {

      const input = body.input || '';
      const queryEmbedding = await embedChunks([input])
      return NextResponse.json({ queryEmbedding });
    }
    else {
      const query = body.query || '';
      const title = body.title || '';
      const queryEmbedding = await embedChunks([title ? `${title}\n${query}` : query ]);
      return NextResponse.json({ queryEmbedding });
    }
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}); 
