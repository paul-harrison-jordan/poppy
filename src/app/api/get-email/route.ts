import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (!authSession.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    auth.setCredentials({ access_token: authSession.accessToken });

    // Initialize Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth });

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
    const range = `${sheetTitle}!A${rowNumber}:ZZ${rowNumber}`; // Get the specific row

    const { data: valuesData } = await sheets.spreadsheets.values.get({
      spreadsheetId: documentId,
      range: range,
    });

    const rowData = valuesData.values?.[0];
    if (!rowData || !rowData[columnIndex]) {
      return NextResponse.json({ error: 'No data found at specified location' }, { status: 404 });
    }

    return NextResponse.json({ 
      email: rowData[columnIndex],
      rowData: rowData // Include full row data for context
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 