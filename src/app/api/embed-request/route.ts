import { NextResponse } from 'next/server';
import { embedChunks } from '@/app/embed';
import { getAuthServerSession } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isSchedulePage = referer.includes('/schedule');
    const isBrainstormPage = referer.includes('/brainstorm');
    const body = await request.json();
    
    if (isSchedulePage) {
      const input = body.input || '';
      const queryEmbedding = await embedChunks([input]);
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
} 