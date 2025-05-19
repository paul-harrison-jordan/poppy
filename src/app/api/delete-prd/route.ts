import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { withAuth } from '@/lib/api';
import { OAuth2Client } from 'google-auth-library';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    if (!session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { documentId } = await request.json();

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

    auth.setCredentials({
      access_token: session.accessToken,
    });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    // Delete the document
    await drive.files.delete({
      fileId: documentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}); 
