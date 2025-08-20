import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export const POST = withAuth(async (session: Session, request: Request) => {
  try {
    const { prdTitle, prdUrl, generatedContent } = await request.json();
    
    if (!prdTitle || !generatedContent) {
      return NextResponse.json(
        { error: 'Missing required fields: prdTitle and generatedContent' },
        { status: 400 }
      );
    }

    // Create Google Doc
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    auth.setCredentials({
      access_token: session.accessToken,
    });

    const docs = google.docs({ version: 'v1', auth });

    // Extract feature name for doc title
    const featureMatch = prdTitle.match(/PRD[:\s-]*(.*?)(?:\s*-|$)/i);
    const featureName = featureMatch ? featureMatch[1].trim() : prdTitle.replace('PRD', '').trim();
    const docTitle = `${featureName} - Technical Documentation`;

    // Create the document
    const doc = await docs.documents.create({
      requestBody: {
        title: docTitle,
      },
    });

    const docId = doc.data.documentId!;

    // Format content for Google Docs
    const formattedContent = `${docTitle}

Generated from: ${prdTitle}
${prdUrl ? `Source PRD: ${prdUrl}` : ''}
Date: ${new Date().toLocaleDateString()}

---

${generatedContent}

---

Generated with Poppy Product OS
Based on Klaviyo documentation style guide`;

    // Insert content into the document
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: formattedContent,
            },
          },
        ],
      },
    });

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    // Save document using save-prd endpoint
    try {
      const saveResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/save-prd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('authorization') || '',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ 
          url: docUrl,
          title: docTitle,
          docType: 'tech-doc'
        })
      });

      if (!saveResponse.ok) {
        console.warn('Failed to save tech doc to database, but document was created');
      }
    } catch (error) {
      console.warn('Error saving tech doc to database:', error);
    }

    return NextResponse.json({ 
      docUrl, 
      docTitle,
      docId 
    });
  } catch (error) {
    console.error('Error generating tech doc:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate documentation' },
      { status: 500 }
    );
  }
});