import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DATABASES = ['arjun-madgavkar', 'jeremy-blanchard', 'kevin-twomey'];

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, req) => {
  try {
    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { documentBody } = await req.json();

    if (!documentBody) {
      return NextResponse.json({ error: 'Document body is required' }, { status: 400 });
    }

    // Generate embedding for the document
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: documentBody,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Search each database for matches
    const searchResults = await Promise.all(
      DATABASES.map(async (database) => {
        const index = pc.index(database);
        const queryResponse = await index.namespace('ns1').query({
          vector: embedding,
          topK: 5,
          includeMetadata: true,
        });

        if (!queryResponse?.matches) {
          console.error(`No matches found in ${database} database:`, queryResponse);
          return {
            database,
            averageScore: 0,
            topMatches: [],
          };
        }

        const averageScore = queryResponse.matches.reduce((acc, match) => acc + match.score, 0) / queryResponse.matches.length;

        return {
          database,
          averageScore,
          topMatches: queryResponse.matches.map(match => ({
            score: match.score,
            metadata: match.metadata,
          })),
        };
      })
    );

    // Filter databases with meaningful matches (average score > 0.7)
    const relevantDatabases = searchResults
      .filter(result => result.averageScore > 0.7)
      .map(result => result.database);

    // Use OpenAI to analyze the matches and provide context
    const analysisPrompt = `Analyze the following document and its matches across different databases. 
    The document has been matched with the following databases: ${relevantDatabases.join(', ')}.
    Provide a brief analysis of why these matches are relevant and what insights can be drawn.`;

    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes document matches and provides insights.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      max_tokens: 200,
    });

    const analysis = analysisResponse.choices[0]?.message?.content || 'No analysis available';

    return NextResponse.json({
      relevantDatabases,
      analysis,
      searchResults,
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze document' },
      { status: 500 }
    );
  }
}); 