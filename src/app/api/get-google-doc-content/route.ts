import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { docId } = await request.json();
    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    auth.setCredentials({ access_token: authSession.accessToken });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    // Fetch document content as HTML
    const contentResponse = await drive.files.export({
      fileId: docId,
      mimeType: 'text/html',
    });

    return NextResponse.json({ content: contentResponse.data });
  } catch (error) {
    console.error('Error fetching Google Doc content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document content' },
      { status: 500 }
    );
  }
} 