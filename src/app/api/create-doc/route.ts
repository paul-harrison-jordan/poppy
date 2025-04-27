import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/documents'],
});

const docs = google.docs({ version: 'v1', auth });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, documentId } = body;

    if (documentId) {
      // Update existing document
      const updateResponse = await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: content,
              },
            },
          ],
        },
      });

      return NextResponse.json({ 
        success: true, 
        documentId,
        url: `https://docs.google.com/document/d/${documentId}/edit`
      });
    } else {
      // Create new document
      const createResponse = await docs.documents.create({
        requestBody: {
          title,
        },
      });

      const newDocumentId = createResponse.data.documentId;

      // Add content to the new document
      await docs.documents.batchUpdate({
        documentId: newDocumentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: content,
              },
            },
          ],
        },
      });

      return NextResponse.json({ 
        success: true, 
        documentId: newDocumentId,
        url: `https://docs.google.com/document/d/${newDocumentId}/edit`
      });
    }
  } catch (error) {
    console.error('Error creating/updating Google Doc:', error);
    return NextResponse.json(
      { error: 'Failed to create/update document' },
      { status: 500 }
    );
  }
} 