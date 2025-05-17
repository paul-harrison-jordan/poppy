import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const documentId = url.searchParams.get('documentId')
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken
    })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Fetch both comments and file metadata in parallel
    const [commentsResponse, fileResponse] = await Promise.all([
      drive.comments.list({
        fileId: documentId,
        fields: 'comments(id,content,createdTime,author(displayName,emailAddress),resolved)',
        pageSize: 100
      }),
      drive.files.get({
        fileId: documentId,
        fields: 'modifiedTime'
      })
    ])

    // Transform the comments to match our interface
    const formattedComments = commentsResponse.data.comments?.map(comment => ({
      id: comment.id!,
      prd_id: documentId,
      user_id: comment.author?.emailAddress || 'unknown',
      user_name: comment.author?.displayName || 'Unknown User',
      content: comment.content || '',
      created_at: comment.createdTime || new Date().toISOString(),
      resolved: comment.resolved || false
    })) || []

    return NextResponse.json({ 
      comments: formattedComments,
      last_modified: fileResponse.data.modifiedTime
    })
  } catch (error) {
    console.error('Error fetching document data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document data' },
      { status: 500 }
    )
  }
} 