import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  type: 'document' | 'folder' | 'other';
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    me: boolean;
  }>;
}

export const GET = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const searchQuery = searchParams.get('search');
    const itemType = searchParams.get('itemType'); // 'documents' or 'folders'

    if (!session.accessToken) {
      return NextResponse.json({ 
        error: 'No access token available. Please re-authenticate with Google.',
      }, { status: 401 });
    }

    // Initialize OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    auth.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: 'v3', auth });

    const pageToken = searchParams.get('pageToken');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Build query based on parameters - prioritize owned files and recent updates
    let query = '';
    
    if (itemType === 'documents') {
      // Fetch only documents owned by the user
      query = `mimeType='application/vnd.google-apps.document' and 'me' in owners and trashed=false`;
    } else if (itemType === 'folders') {
      // Fetch only folders owned by the user
      query = `mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false`;
    } else if (searchQuery) {
      // Search across accessible files, prioritizing owned
      query = `name contains '${searchQuery.replace(/'/g, "\\'")}' and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.folder') and trashed=false`;
    } else if (folderId && folderId !== 'root') {
      // Browse specific folder
      query = `'${folderId}' in parents and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.folder') and trashed=false`;
    } else {
      // Browse root, prioritizing owned documents and recently modified items
      query = `((mimeType='application/vnd.google-apps.document' and 'me' in owners) or (mimeType='application/vnd.google-apps.folder' and 'me' in owners)) and trashed=false`;
    }

    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, iconLink, webViewLink, parents, owners)',
      orderBy: 'modifiedTime desc',
      pageSize,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });

    const files = response.data.files || [];
    
    const items: GoogleDriveItem[] = files.map((file) => ({
      id: file.id!,
      name: file.name || 'Untitled',
      mimeType: file.mimeType || '',
      type: file.mimeType === 'application/vnd.google-apps.folder' 
        ? 'folder' 
        : file.mimeType === 'application/vnd.google-apps.document'
        ? 'document'
        : 'other',
      modifiedTime: file.modifiedTime || undefined,
      iconLink: file.iconLink || undefined,
      webViewLink: file.webViewLink || undefined,
      owners: file.owners?.map(owner => ({
        displayName: owner.displayName || '',
        emailAddress: owner.emailAddress || '',
        me: owner.me || false,
      })),
    }));

    // Separate folders and documents for better UX
    const folders = items.filter(item => item.type === 'folder');
    const documents = items.filter(item => item.type === 'document');

    return NextResponse.json({
      folders,
      documents,
      total: items.length,
      nextPageToken: response.data.nextPageToken,
      hasNextPage: !!response.data.nextPageToken,
      searchQuery,
      folderId: folderId || 'root',
      pageSize,
    });

  } catch (error: unknown) {
    console.error('Error browsing Google Drive:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as { response?: { status?: number } })?.response?.status;
    
    if (errorStatus === 403) {
      return NextResponse.json(
        { error: 'Permission denied. Please re-authenticate with Google Drive access.' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to browse Google Drive files', details: errorMessage },
      { status: 500 }
    );
  }
});