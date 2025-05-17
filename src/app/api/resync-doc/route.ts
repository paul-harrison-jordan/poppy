import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { getUserIndex } from '@/lib/pinecone';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { chunkTextByMultiParagraphs } from '@/app/chunk';
import { buildPineconeRecords } from '@/app/embed';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const formattedUsername = authSession.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const index = getUserIndex(formattedUsername);

    if (!authSession.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    auth.setCredentials({ access_token: authSession.accessToken });
    const drive = google.drive({ version: 'v3', auth });

    const docResponse = await drive.files.get({
      fileId: documentId,
      fields: 'id, name',
      supportsAllDrives: true,
    });
    const doc = docResponse.data;
    if (!doc.name) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const contentResponse = await drive.files.export({
      fileId: documentId,
      mimeType: 'text/plain',
    });

    const chunks = chunkTextByMultiParagraphs(contentResponse.data as string);
    const vectors = await buildPineconeRecords(chunks, documentId);

    await index.namespace('ns1').delete1({ filter: { documentId } });
    await index.namespace('ns1').upsert(
      vectors.map(({ id, values, metadata }) => ({ id, values, metadata }))
    );

    return NextResponse.json({ message: 'Document resynced', documentId });
  } catch (error) {
    console.error('Error resyncing document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

