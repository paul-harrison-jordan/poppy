import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthServerSession } from '@/lib/auth';
import { chunkTextByMultiParagraphs } from '@/app/chunk';



interface DocumentContent {
  name: string;
  content: string;
}

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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

    // Get document details
    const docResponse = await drive.files.get({
      fileId: documentId,
      fields: 'id, name',
    });

    const doc = docResponse.data;
    if (!doc.name) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Fetch document content
    const contentResponse = await drive.files.export({
      fileId: documentId,
      mimeType: 'text/plain',
    });

    const documentContent: DocumentContent = {
      name: doc.name,
      content: contentResponse.data as string,
    };

    // Process and store the document
    const chunks = chunkTextByMultiParagraphs(documentContent.content);

    
    return NextResponse.json({
      message: `${documentContent.name} chunked successfully`,
      chunks: chunks,
      id: documentId,
    });
  } catch (error) {
    console.error('Error syncing document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 