import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

interface SheetData {
  id: string;
  name: string;
  data: Array<{
    rowNumber: number;
    values: string[];
  }>;
}

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

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

    // Initialize Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Get the sheet name
    const { data: fileData } = await drive.files.get({
      fileId: documentId,
      fields: 'name',
      supportsAllDrives: true,
    });

    // Get all sheets in the spreadsheet
    const { data: sheetsData } = await sheets.spreadsheets.get({
      spreadsheetId: documentId,
      includeGridData: false,
    });

    // Get the second sheet's data
    const firstSheet = sheetsData.sheets?.[1];
    if (!firstSheet) {
      return NextResponse.json({ error: 'No sheets found' }, { status: 404 });
    }

    const sheetTitle = firstSheet.properties?.title || 'Sheet1';
    const range = `${sheetTitle}!A1:ZZ`; // Get all columns up to ZZ

    const { data: valuesData } = await sheets.spreadsheets.values.get({
      spreadsheetId: documentId,
      range: range,
    });

    const sheetData: SheetData = {
      id: documentId,
      name: fileData.name || 'Untitled Sheet',
      data: (valuesData.values || []).map((row, index) => ({
        rowNumber: index + 1,
        values: row
      })),
    };

    return NextResponse.json({ sheet: sheetData });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sheets' },
      { status: 500 }
    );
  }
});
