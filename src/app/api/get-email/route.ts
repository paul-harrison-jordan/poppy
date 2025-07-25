import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, rowNumber } = await request.json();
    
    if (!documentId || !rowNumber) {
      return NextResponse.json({ 
        error: 'Document ID and row number are required' 
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

    // Find the "Relationship NPS Responses" sheet
    const npsSheet = sheetsData.sheets?.find(sheet => 
      sheet.properties?.title === 'Relationship NPS Responses'
    );
    
    if (!npsSheet) {
      return NextResponse.json({ error: 'Relationship NPS Responses sheet not found' }, { status: 404 });
    }

    const sheetTitle = npsSheet.properties?.title || 'Relationship NPS Responses';
    
    console.log('Looking for sheet:', sheetTitle);
    
    // First, get the header row to find the RECIPIENT_EMAIL column
    const headerRange = `${sheetTitle}!1:1`;
    console.log('Header range:', headerRange);
    
    const { data: headerData } = await sheets.spreadsheets.values.get({
      spreadsheetId: documentId,
      range: headerRange,
    });

    const headers = headerData.values?.[0];
    console.log('Headers found:', headers);
    
    if (!headers) {
      return NextResponse.json({ error: 'No header row found' }, { status: 404 });
    }

    // Find the RECIPIENT_EMAIL column index
    const emailColumnIndex = headers.findIndex(header => 
      header && header.toString().toUpperCase() === 'RECIPIENT_EMAIL'
    );
    
    console.log('RECIPIENT_EMAIL column index:', emailColumnIndex);
    console.log('Looking for RECIPIENT_EMAIL in headers:', headers.map((h, i) => `${i}: ${h}`));
    
    // If RECIPIENT_EMAIL not found, try column B (index 1) as fallback
    const columnToUse = emailColumnIndex !== -1 ? emailColumnIndex : 1;
    console.log('Using column index:', columnToUse);

    // Get the specific row data
    const dataRange = `${sheetTitle}!${rowNumber}:${rowNumber}`;
    console.log('Data range:', dataRange);
    
    const { data: valuesData } = await sheets.spreadsheets.values.get({
      spreadsheetId: documentId,
      range: dataRange,
    });

    const rowData = valuesData.values?.[0];
    console.log('Row data found:', rowData);
    
    if (!rowData || !rowData[columnToUse]) {
      console.log('No data at column', columnToUse);
      return NextResponse.json({ error: `No email found for this customer at column ${columnToUse}` }, { status: 404 });
    }

    const email = rowData[columnToUse];
    console.log('Email found:', email);

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
      { error: error instanceof Error ? error.message : 'Failed to fetch email' },
      { status: 500 }
    );
  }
}