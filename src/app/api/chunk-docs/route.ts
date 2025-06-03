import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { chunkTextByMultiParagraphs } from '@/app/chunk';
import { Session } from 'next-auth';
import { withErrorHandling } from '@/lib/api';
import { GaxiosError } from 'gaxios';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  return withErrorHandling(async () => {
    const { documentId, documentName } = await request.json();

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

    try {
      // Get document content
      const response = await drive.files.export({
        fileId: documentId,
        mimeType: 'text/plain',
      });

      const content = response.data;

      // Process content and return chunks
      const chunks = chunkTextByMultiParagraphs(content as string);
      return NextResponse.json({ chunks, documentName });
    } catch (error) {
      console.error('Error chunking document:', error);
      
      // Handle specific Google Drive API errors
      if (error instanceof GaxiosError) {
        if (error.response?.status === 404) {
          return NextResponse.json(
            { error: 'Document not found or access denied' },
            { status: 404 }
          );
        }
        
        if (error.response?.status === 403) {
          return NextResponse.json(
            { error: 'Permission denied to access document' },
            { status: 403 }
          );
        }
      }

      // Handle other errors
      return NextResponse.json(
        { error: 'Failed to process document' },
        { status: 500 }
      );
    }
  });
}); 
