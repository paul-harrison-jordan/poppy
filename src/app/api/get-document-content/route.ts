import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api'
import { Session } from 'next-auth'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, req) => {
  try {
    if (!session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { documentId } = await req.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Initialize OAuth2 client with current user's access token
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    })
    auth.setCredentials({ access_token: session.accessToken })

    // Initialize Drive API
    const drive = google.drive({ version: 'v3', auth })

    // Export the document as markdown
    const response = await drive.files.export({
      fileId: documentId,
      mimeType: 'text/markdown',
    })

    if (!response.data) {
      return NextResponse.json({ error: 'Failed to fetch document content' }, { status: 500 })
    }

    return NextResponse.json({ content: response.data })
  } catch (error) {
    console.error('Error fetching document content:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch document content' },
      { status: 500 }
    )
  }
}) 