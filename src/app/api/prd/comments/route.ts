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
    const docs = google.docs({ version: 'v1', auth: oauth2Client })

    // Fetch both comments and file metadata in parallel
    const [commentsResponse, fileResponse] = await Promise.all([
      drive.comments.list({
        fileId: documentId,
        fields: 'comments(id,content,createdTime,author(displayName,emailAddress,me),resolved,replies(id,content,createdTime,author(displayName,emailAddress,me)))',
        pageSize: 100
      }),
      drive.files.get({
        fileId: documentId,
        fields: 'modifiedTime'
      })
    ])

    // Get the current user's email
    const aboutResponse = await google.oauth2('v2').userinfo.get({
      auth: oauth2Client
    })
    const currentUserEmail = aboutResponse.data.email

    // Transform the comments to match our interface
    const formattedComments = commentsResponse.data.comments?.flatMap(comment => {
      // If the comment is from the current user, use their email
      const isCurrentUser = comment.author?.me
      const email = isCurrentUser ? currentUserEmail : comment.author?.emailAddress

      // Format the main comment
      const mainComment = {
        id: comment.id!,
        prd_id: documentId,
        user_id: email || 'unknown',
        user_name: comment.author?.displayName || 'Unknown User',
        content: comment.content || '',
        created_at: comment.createdTime || new Date().toISOString(),
        resolved: comment.resolved || false,
        is_reply: false
      }

      // Format the replies
      const replies = (comment.replies || []).map(reply => {
        const isReplyFromCurrentUser = reply.author?.me
        const replyEmail = isReplyFromCurrentUser ? currentUserEmail : reply.author?.emailAddress

        return {
          id: reply.id!,
          prd_id: documentId,
          user_id: replyEmail || 'unknown',
          user_name: reply.author?.displayName || 'Unknown User',
          content: reply.content || '',
          created_at: reply.createdTime || new Date().toISOString(),
          is_reply: true,
          parent_id: comment.id
        }
      })

      return [mainComment, ...replies]
    }) || []

    let documentTitle = null;
    try {
      const document = await docs.documents.get({
        documentId: documentId,
        fields: 'title'
      });
      documentTitle = document.data.title || null;
    } catch (error) {
      console.error('Error fetching document title:', error);
      // Continue without the title - we'll use the existing one
    }

    return NextResponse.json({
      comments: formattedComments,
      last_modified: fileResponse.data.modifiedTime,
      title: documentTitle
    })
  } catch (error) {
    console.error('Error fetching document data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document data' },
      { status: 500 }
    )
  }
} 