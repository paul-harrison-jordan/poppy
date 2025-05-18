import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';

export const POST = withAuth(async (session, request: Request) => {
  try {

    const { documentId, rowNumber, columnIndex } = await request.json();
    
    if (!documentId || !rowNumber || columnIndex === undefined) {
      return NextResponse.json({ 
        error: 'Document ID, row number, and column index are required' 
      }, { status: 400 });
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

    // Get all sheets in the spreadsheet
    const { data: sheetsData } = await sheets.spreadsheets.get({
      spreadsheetId: documentId,
      includeGridData: false,
    });

    // Get the second sheet's data (for email)
    const firstSheet = sheetsData.sheets?.[1];
    if (!firstSheet) {
      return NextResponse.json({ error: 'No sheets found' }, { status: 404 });
    }

    const sheetTitle = firstSheet.properties?.title || 'Sheet1';
    const range = `${sheetTitle}!A${rowNumber}:ZZ${rowNumber}`;

    const { data: valuesData } = await sheets.spreadsheets.values.get({
      spreadsheetId: documentId,
      range: range,
    });

    const rowData = valuesData.values?.[0];
    if (!rowData || !rowData[columnIndex]) {
      return NextResponse.json({ error: 'No data found at specified location' }, { status: 404 });
    }

    const email = rowData[columnIndex];

    // Check third sheet for recent outreach
    const thirdSheet = sheetsData.sheets?.[2];
    if (!thirdSheet) {
      return NextResponse.json({ error: 'Third sheet not found' }, { status: 404 });
    }

    const thirdSheetTitle = thirdSheet.properties?.title || 'Sheet3';
    const thirdSheetRange = `${thirdSheetTitle}!A:Z`; // Get all columns

    const { data: thirdSheetData } = await sheets.spreadsheets.values.get({
      spreadsheetId: documentId,
      range: thirdSheetRange,
    });

    const rows = thirdSheetData.values || [];
    const now = new Date();
    const twentyEightDaysAgo = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000));

    // Check for recent outreach (email in column 2, date in column 4)
    const hasRecentOutreach = rows.some(row => {
      if (row[1] === email) { // Column B (index 1) contains email
        const outreachDate = new Date(row[3]); // Column D (index 3) contains date
        return outreachDate > twentyEightDaysAgo;
      }
      return false;
    });

    return NextResponse.json({ 
      email,
      hasRecentOutreach,
      rowData // Include full row data for context
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}); 
