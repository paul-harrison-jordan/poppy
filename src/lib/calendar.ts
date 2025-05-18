import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Initialize Google Calendar API client with the provided OAuth access token.
 */
export function getCalendarClient(accessToken: string) {
  const auth = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });

  auth.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth });
}

