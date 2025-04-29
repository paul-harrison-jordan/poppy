import { NextResponse } from 'next/server';
import { chunkTextByMultiParagraphs} from '@/app/chunk';
import {  buildPineconeRecords } from '@/app/embed';
import { getAuthServerSession } from '@/lib/auth';
import { getUserIndex, createUserIndex } from '@/lib/pinecone';


export async function POST(request: Request) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure the index exists
    await createUserIndex(session.user.name);
    
    const index = getUserIndex(session.user.name);
    const body = await request.json();
    const { title, query, answers, userId } = body;

    // Create a single vector from the PRD data
    const prdContent = `
Title: ${title}
Query: ${query}
Answers:
${Object.entries(answers).map(([question, answer]) => `- ${question}: ${answer}`).join('\n')}
`;

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