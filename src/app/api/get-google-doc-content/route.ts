import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    // Check if user has Google authentication
    if (!session.accessToken) {
      console.error('No access token found in session:', JSON.stringify(session, null, 2));
      return NextResponse.json({ 
        error: 'Google authentication required. Please sign in with Google.' 
      }, { status: 401 });
    }

    const { docId } = await request.json();
    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    console.log('Attempting to fetch document:', docId);

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    auth.setCredentials({ access_token: session.accessToken });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    // First check if we can access the file
    try {
      await drive.files.get({ fileId: docId });
    } catch (accessError: unknown) {
      console.error('Access error:', accessError);
      if (accessError && typeof accessError === 'object' && 'code' in accessError) {
        const error = accessError as { code: number };
        if (error.code === 403) {
          return NextResponse.json({ 
            error: 'Access denied. You may not have permission to view this document.' 
          }, { status: 403 });
        } else if (error.code === 404) {
          return NextResponse.json({ 
            error: 'Document not found. The document may have been deleted or the link is invalid.' 
          }, { status: 404 });
        }
      }
      throw accessError;
    }

    // Fetch document content as plain text
    const contentResponse = await drive.files.export({
      fileId: docId,
      mimeType: 'text/plain',
    });

    const textContent = contentResponse.data as string;

    return NextResponse.json({ 
      content: textContent
    });
  } catch (error: unknown) {
    console.error('Error fetching Google Doc content:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch document content';
    let statusCode = 500;
    
    if (error && typeof error === 'object') {
      const err = error as { code?: number; message?: string };
      if (err.code === 401) {
        errorMessage = 'Authentication expired. Please sign out and sign back in.';
        statusCode = 401;
      } else if (err.code === 403) {
        errorMessage = 'Access denied. You may not have permission to view this document.';
        statusCode = 403;
      } else if (err.code === 404) {
        errorMessage = 'Document not found.';
        statusCode = 404;
      } else if (err.message) {
        errorMessage = err.message;
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}); 
