import { NextResponse } from 'next/server';
import { getUserIndex, createUserIndex } from '@/lib/pinecone';
import { embedChunks } from '@/app/embed';
import { writeSummary } from '@/app/search';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    // Ensure the index exists
    await createUserIndex(authSession.user.name);
    
    const index = getUserIndex(authSession.user.name);
    const body = await request.json();
    const query = body.query;
    const title = body.title;
    const questions = body.questions;

    interface FormValues {
      teamStrategy: string;
      howYouThinkAboutProduct: string;
      pillarGoalsKeyTermsBackground: string;
      examplesOfHowYouThink: string;
    }
    
    const parsed: FormValues = JSON.parse(body.storedContext);   
    const teamStrategy = parsed.teamStrategy;
    const howYouThinkAboutProduct = parsed.howYouThinkAboutProduct;
    const pillarGoalsKeyTermsBackground = parsed.pillarGoalsKeyTermsBackground;
    const examplesOfHowYouThink = parsed.examplesOfHowYouThink;

    const queryEmbedding = await embedChunks([query]);
    
    const queryResponse = await index.namespace('ns1').query({
      vector: queryEmbedding[0].embedding,
      topK: 10,
      includeMetadata: true
    });
    
    const results = queryResponse.matches.map((match) => (
        match.metadata?.text || 'No text available'
    ));

    const additionalContext = results.join("");

    const summary = await writeSummary(query, additionalContext, teamStrategy, howYouThinkAboutProduct, pillarGoalsKeyTermsBackground, examplesOfHowYouThink, questions);

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Set the access token from the session
    if (!authSession.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    auth.setCredentials({
      access_token: authSession.accessToken,
    });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });
    const docs = google.docs({ version: 'v1', auth });

      /* 1️⃣  Create our Google Doc file */
      const fileRes = await drive.files.create({
        requestBody: {
          name: title,
          mimeType: 'application/vnd.google-apps.document',
        },
        media: {
        mimeType: 'text/markdown',
          body: summary
        },
      fields: 'id',
      });
    
    const docId = fileRes.data.id!;
    const url = `https://docs.google.com/document/d/${docId}/edit`;
    
    return NextResponse.json({ title, url, docId });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 