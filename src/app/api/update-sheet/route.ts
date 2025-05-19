import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { documentId, klaviyoAccountId, feedbackData, email } = await request.json();
    
    if (!documentId || !klaviyoAccountId || !feedbackData) {
      return NextResponse.json({ 
        error: 'Document ID, Klaviyo Account ID, and feedback data are required' 
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

    // Get the third sheet
    const thirdSheet = sheetsData.sheets?.[2];
    if (!thirdSheet) {
      return NextResponse.json({ error: 'Third sheet not found' }, { status: 404 });
    }

    const sheetTitle = thirdSheet.properties?.title || 'Sheet3';
    
    // Prepare the row data
    const rowData = [
      klaviyoAccountId,
      email,
      feedbackData.NPS_VERBATIM,
      new Date().toISOString(),
      feedbackData.NPS_SCORE_RAW,
      feedbackData.SURVEY_END_DATE,
      feedbackData.GMV
    ];

    // Append the row to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: documentId,
      range: `${sheetTitle}!A:G`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sheet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sheet' },
      { status: 500 }
    );
  }
}); 
