import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthServerSession } from '@/lib/auth';
import { Pinecone } from '@pinecone-database/pinecone';
import { chunkTextByMultiParagraphs, enhanceChunks } from '@/app/chunk';
import { buildPineconeRecords } from '@/app/embed';

interface Session {
  accessToken?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

interface DocumentContent {
  name: string;
  content: string;
}

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const folderId = body.folderId;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Set the access token from the session
    const session = await getAuthServerSession() as Session;
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    auth.setCredentials({
      access_token: session.accessToken,
    });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    // List all files in the specified folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document'`,
      fields: 'files(id, name)',
    });

    const documents = response.data.files || [];
    const documentContents: DocumentContent[] = [];

    // Fetch content for each document
    for (const doc of documents) {
      try {
        const content = await drive.files.export({
          fileId: doc.id!,
          mimeType: 'text/plain',
        });

        documentContents.push({
          name: doc.name || 'Untitled Document',
          content: content.data as string,
        });
      } catch (error) {
        console.error(`Error fetching document ${doc.name}:`, error);
        continue; // Skip this document but continue with others
      }
    }

    // Initialize Pinecone
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pc.index('pm-context-manual-embedding');

    // Process and store each document
    const allFormattedEmbeddings = [];
    const syncedPrds = [];
    for (const doc of documentContents) {
      try {
        const chunks = chunkTextByMultiParagraphs(doc.content);
        const formattedEmbeddings = await buildPineconeRecords(chunks);
        allFormattedEmbeddings.push(formattedEmbeddings);
        syncedPrds.push(doc.name);
      } catch (error) {
        console.error(`Error processing document ${doc.name}:`, error);
        continue; // Skip this document but continue with others
      }
    }
    for (const formattedEmbeddings of allFormattedEmbeddings) {
      await index.namespace('ns1').upsert(formattedEmbeddings);
    }
    
    return NextResponse.json({
      message: 'PRDs synced successfully',
      totalDocuments: documentContents.length,
      syncedPrds: syncedPrds,
    });
  } catch (error) {
    console.error('Error syncing PRDs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 