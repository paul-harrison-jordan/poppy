import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { chunkTextByMultiParagraphs } from '@/app/chunk';
import { Session } from 'next-auth';

interface DocumentContent {
  name: string;
  content: string;
}

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const body = await request.json();
    const documentId = body.documentId;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    auth.setCredentials({ access_token: session.accessToken });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    // Fetch document content as HTML
    const contentResponse = await drive.files.export({
      fileId: documentId,
      mimeType: 'text/html',
    });

    // Get document name
    const fileResponse = await drive.files.get({
      fileId: documentId,
      fields: 'name',
    });

    const documentContent: DocumentContent = {
      name: fileResponse.data.name || 'Untitled Document',
      content: contentResponse.data as string,
    };

    // Chunk the content
    const chunks = chunkTextByMultiParagraphs(documentContent.content);

    return NextResponse.json({ chunks });
  } catch (error) {
    console.error('Error chunking document:', error);
    return NextResponse.json(
      { error: 'Failed to chunk document' },
      { status: 500 }
    );
  }
}); 
