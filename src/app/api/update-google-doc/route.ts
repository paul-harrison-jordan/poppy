import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { Session } from 'next-auth'

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    if (!session.accessToken) {
      return NextResponse.json({ 
        error: 'Google authentication required. Please sign in with Google.' 
      }, { status: 401 })
    }

    const { docId, content } = await request.json()
    
    if (!docId || !content) {
      return NextResponse.json({ 
        error: 'Document ID and content are required' 
      }, { status: 400 })
    }

    console.log('Attempting to update document:', docId)

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    })
    auth.setCredentials({ access_token: session.accessToken })

    // Initialize the Docs API
    const docs = google.docs({ version: 'v1', auth })

    // First, get the document to find its current length
    const docResponse = await docs.documents.get({
      documentId: docId,
    })

    const doc = docResponse.data
    let endIndex = 1
    
    // Find the last index of content in the document
    if (doc.body?.content) {
      const lastElement = doc.body.content[doc.body.content.length - 1]
      if (lastElement.endIndex) {
        endIndex = lastElement.endIndex - 1
      }
    }

    // Create requests to update the document
    const requests = [
      // Delete all existing content (except the first character)
      {
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: endIndex,
          },
        },
      },
      // Insert new content
      {
        insertText: {
          location: {
            index: 1,
          },
          text: content,
        },
      },
    ]

    // Update the document
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Document updated successfully'
    })
  } catch (error: unknown) {
    console.error('Error updating Google Doc:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to update document'
    let statusCode = 500
    
    if (error && typeof error === 'object') {
      const err = error as { code?: number; message?: string }
      if (err.code === 401) {
        errorMessage = 'Authentication expired. Please sign out and sign back in.'
        statusCode = 401
      } else if (err.code === 403) {
        errorMessage = 'Access denied. You may not have permission to edit this document.'
        statusCode = 403
      } else if (err.code === 404) {
        errorMessage = 'Document not found.'
        statusCode = 404
      } else if (err.message) {
        errorMessage = err.message
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
})