import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { withAuth } from '@/lib/api';
import { OAuth2Client } from 'google-auth-library';

export const POST = withAuth(async (session: Session, request: Request) => {
  // Blank body for now
  try{ 

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Set the access token from the session
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

    const body = await request.json();
    const docId = body.id;

    await drive.files.delete( {fileId: docId} );
    return NextResponse.json(`${docId} deleted` );
  } 
  catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
  return NextResponse.json({}, { status: 200 });
}); 
