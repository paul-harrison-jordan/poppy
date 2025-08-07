import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbedding, analyzeDocument } from '@/lib/services/openaiService';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
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

    // Generate embedding for the document using centralized service
    const embeddingResponse = await generateEmbedding({
      input: documentBody
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

        const averageScore = queryResponse.matches.reduce((acc, match) => acc + (match.score ?? 0), 0) / queryResponse.matches.length;

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

    // Use centralized service to analyze the matches and provide context
    const analysisPrompt = `Analyze the following document and its matches across different databases. 
    The document has been matched with the following databases: ${relevantDatabases.join(', ')}.
    Provide a brief analysis of why these matches are relevant and what insights can be drawn.`;

    const analysis = await analyzeDocument({
      documentBody,
      analysisPrompt
    });

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