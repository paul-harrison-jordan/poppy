import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { title, content } = await request.json();

    // Initialize the OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    auth.setCredentials({
      access_token: authSession.accessToken,
    });

    // Initialize the Drive API
    const drive = google.drive({ version: 'v3', auth });

    const fileRes = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      },
      media: {
        mimeType: 'text/markdown',
        body: content
      },
      fields: 'id',
    });
    
    const docId = fileRes.data.id!;
    const url = `https://docs.google.com/document/d/${docId}/edit`;
    
    return NextResponse.json({ docId, title, url });
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Google Doc' },
      { status: 500 }
    );
  }
}

function formatContentToMarkdown(content: any): string {
  let markdown = `# ${content.title}\n\n`;
  
  // Executive Summary
  markdown += `## Executive Summary\n${content.executiveSummary}\n\n`;
  
  // Brand Identity
  markdown += `## Brand Identity\n`;
  markdown += `### Mission\n${content.brandIdentity.mission}\n\n`;
  markdown += `### Vision\n${content.brandIdentity.vision}\n\n`;
  markdown += `### Values\n${content.brandIdentity.values.map((v: string) => `- ${v}`).join('\n')}\n\n`;
  markdown += `### Personality\n${content.brandIdentity.personality}\n\n`;
  
  // Target Audience
  markdown += `## Target Audience\n`;
  markdown += `### Primary\n${content.targetAudience.primary}\n\n`;
  markdown += `### Secondary\n${content.targetAudience.secondary}\n\n`;
  markdown += `### Pain Points\n${content.targetAudience.painPoints.map((p: string) => `- ${p}`).join('\n')}\n\n`;
  markdown += `### Aspirations\n${content.targetAudience.aspirations.map((a: string) => `- ${a}`).join('\n')}\n\n`;
  
  // Messaging Framework
  markdown += `## Messaging Framework\n`;
  markdown += `### Value Proposition\n${content.messagingFramework.valueProposition}\n\n`;
  markdown += `### Key Messages\n${content.messagingFramework.keyMessages.map((m: string) => `- ${m}`).join('\n')}\n\n`;
  markdown += `### Tone of Voice\n${content.messagingFramework.toneOfVoice}\n\n`;
  markdown += `### Brand Story\n${content.messagingFramework.brandStory}\n\n`;
  
  // Implementation Guidelines
  markdown += `## Implementation Guidelines\n`;
  markdown += `### Do's\n${content.implementationGuidelines.dos.map((d: string) => `- ${d}`).join('\n')}\n\n`;
  markdown += `### Don'ts\n${content.implementationGuidelines.donts.map((d: string) => `- ${d}`).join('\n')}\n\n`;
  markdown += `### Examples\n${content.implementationGuidelines.examples.map((e: string) => `- ${e}`).join('\n')}\n\n`;
  
  return markdown;
} 