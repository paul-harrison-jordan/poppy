import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// List of available databases to search
const AVAILABLE_DATABASES = ['feedback', 'product', 'support', 'engineering'];

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { documentBody } = await request.json();
    if (!documentBody) {
      return NextResponse.json({ error: 'Document body is required' }, { status: 400 });
    }

    // Get embedding for the document
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: documentBody,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Search each database for matches
    const searchResults = await Promise.all(
      AVAILABLE_DATABASES.map(async (dbName) => {
        try {
          const index = pc.index(dbName);
          const queryResponse = await index.namespace('ns1').query({
            vector: embedding,
            topK: 3,
            includeMetadata: true
          });

          return {
            database: dbName,
            matches: queryResponse.matches || [],
            averageScore: queryResponse.matches?.reduce((acc, match) => acc + (match.score || 0), 0) / (queryResponse.matches?.length || 1) || 0
          };
        } catch (error) {
          console.error(`Error searching database ${dbName}:`, error);
          return {
            database: dbName,
            matches: [],
            averageScore: 0
          };
        }
      })
    );

    // Filter databases with meaningful matches (average score > 0.7)
    const relevantDatabases = searchResults
      .filter(result => result.averageScore > 0.7)
      .map(result => result.database);

    // Use OpenAI to analyze the matches and provide context
    const analysisPrompt = `
      Based on the following document and its matches in these databases: ${relevantDatabases.join(', ')},
      provide a brief analysis of which databases are most relevant and why.
      Document: ${documentBody.substring(0, 500)}...
    `;

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes document content and determines which databases would be most relevant for storing or searching this content."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return NextResponse.json({
      relevantDatabases,
      analysis: analysisResponse.choices[0].message.content,
      searchResults: searchResults.map(result => ({
        database: result.database,
        averageScore: result.averageScore,
        topMatches: result.matches.slice(0, 2).map(match => ({
          score: match.score,
          metadata: match.metadata
        }))
      }))
    });

  } catch (error) {
    console.error('Error analyzing document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze document' },
      { status: 500 }
    );
  }
}); 