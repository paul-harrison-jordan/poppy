import { NextResponse } from 'next/server';
import { embedChunks } from '@/app/embed';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    const body = await request.json();

    const queryEmbedding = await embedChunks([`${body.title}\n${body.query}`]);
    
    return NextResponse.json({ queryEmbedding });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 