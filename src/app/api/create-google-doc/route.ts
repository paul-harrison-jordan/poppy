import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { title, content } = await request.json();

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    auth.setCredentials({
      access_token: authSession.accessToken,
    });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    const fileRes = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      },
      media: {
        mimeType: 'text/markdown',
        body: content
      },
      fields: 'id',
    });
    
    const docId = fileRes.data.id!;
    const url = `https://docs.google.com/document/d/${docId}/edit`;
    
    return NextResponse.json({ docId, title, url });
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Google Doc' },
      { status: 500 }
    );
  }
}