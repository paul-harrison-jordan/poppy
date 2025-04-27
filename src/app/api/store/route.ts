import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { chunkTextByMultiParagraphs, enhanceChunks} from '@/app/chunk';
import { embedChunks, formatEmbeddings, buildPineconeRecords } from '@/app/embed';
const { nanoid } = require('nanoid');
import { cookies } from 'next/headers';


export async function POST(request: Request) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
  });
  const index = pc.index('pm-context-manual-embedding');
  try {
    const body = await request.json();
    

    const chunks = chunkTextByMultiParagraphs(body.personalBackground);

    const formattedEmbeddings = await buildPineconeRecords(chunks);
    
    // const upserted = await index.namespace('ns1').upsert(formattedEmbeddings);

    return NextResponse.json('success');
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 