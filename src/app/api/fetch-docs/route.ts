import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthServerSession } from '@/lib/auth';

interface Session {
  accessToken?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

interface GoogleDoc {
  id: string;
  name: string;
}

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // List all files in the specified folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document'`,
      fields: 'files(id, name)',
    });

    const documents: GoogleDoc[] = (response.data.files || []).map(doc => ({
      id: doc.id!,
      name: doc.name || 'Untitled Document',
    }));

    return NextResponse.json({
      documents,
      totalDocuments: documents.length,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 