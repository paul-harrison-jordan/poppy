import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

interface GoogleDoc {
  id: string;
  name: string;
}

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { driveFolderId = '', documentId = '' } = await request.json();

    // Initialize OAuth2 client with current user's access token
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    if (!session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    auth.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: 'v3', auth });

    // If a documentId was passed, return just that document
    if (documentId) {
      const { data } = await drive.files.get({
        fileId: documentId,
        fields: 'id, name',
        supportsAllDrives: true,
      });

      const document: GoogleDoc = {
        id: data.id!,
        name: data.name || 'Untitled Document',
      };

      return NextResponse.json({ documents: [document] });
    }

    // Otherwise, we know folderId must be present — list its docs
    const listRes = await drive.files.list({
      q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.document'`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });

    const documents: GoogleDoc[] = (listRes.data.files || []).map((doc) => ({
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
});
