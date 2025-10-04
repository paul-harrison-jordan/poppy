import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { ProposedContent, FeatureInput, PMPreferenceProfile } from '@/types/knowledge';
import { PRDOrchestrator } from '@/orchestrators/PRDOrchestrator';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  const startTime = Date.now();

  try {
    const { features, proposedContent, pmProfile } = await request.json() as {
      features: FeatureInput[];
      proposedContent: ProposedContent[];
      pmProfile?: PMPreferenceProfile;
    };

    if (!features || features.length === 0) {
      return NextResponse.json(
        { error: 'Features are required' },
        { status: 400 }
      );
    }

    if (!proposedContent || proposedContent.length === 0) {
      return NextResponse.json(
        { error: 'Proposed content is required' },
        { status: 400 }
      );
    }

    console.log(`[generate-prds] Starting PRD generation for ${features.length} features`);

    // Generate PRDs in parallel
    const orchestrator = new PRDOrchestrator();
    const prdPromises = features.map(async (feature) => {
      const content = proposedContent.find(c => c.featureId === feature.id);
      if (!content) {
        console.error(`[generate-prds] No proposed content found for feature ${feature.id}`);
        return null;
      }

      try {
        // Generate analysis bundle first
        const analysisBundle = await orchestrator.generateAnalysisBundle(
          `${feature.name}\n\nJTBD: ${feature.jtbd}`,
          pmProfile
        );

        // Generate PRD sections
        const sections = await orchestrator.generateSections(analysisBundle);

        // Convert sections to markdown
        const markdown = convertSectionsToMarkdown(feature, content, sections);

        // Save to Google Docs if user is authenticated
        let googleDocUrl: string | undefined;
        if (session.accessToken) {
          try {
            googleDocUrl = await saveToGoogleDocs(
              session.accessToken,
              `PRD: ${feature.name}`,
              markdown
            );
            console.log(`[generate-prds] Saved PRD to Google Docs: ${googleDocUrl}`);
          } catch (docError) {
            console.error(`[generate-prds] Failed to save to Google Docs:`, docError);
            // Continue without saving to docs - not a critical error
          }
        }

        return {
          featureId: feature.id,
          featureName: feature.name,
          sections,
          analysisBundle,
          googleDocUrl
        };
      } catch (error) {
        console.error(`[generate-prds] Error generating PRD for feature ${feature.id}:`, error);
        return {
          featureId: feature.id,
          featureName: feature.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const prds = await Promise.all(prdPromises);
    const successfulPRDs = prds.filter(prd => prd !== null);

    const totalTime = Date.now() - startTime;
    console.log(`[generate-prds] Generated ${successfulPRDs.length} PRDs in ${totalTime}ms`);

    return NextResponse.json({
      prds: successfulPRDs,
      total: features.length,
      successful: successfulPRDs.length
    });
  } catch (error) {
    console.error('[generate-prds] Error generating PRDs:', error);
    const totalTime = Date.now() - startTime;
    console.log(`[generate-prds] Failed after ${totalTime}ms`);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PRDs' },
      { status: 500 }
    );
  }
});

/**
 * Convert PRD sections to markdown format
 */
function convertSectionsToMarkdown(
  feature: FeatureInput,
  content: ProposedContent,
  sections: unknown[]
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# PRD: ${feature.name}`);
  lines.push('');

  // JTBD
  lines.push('## Job to be Done');
  lines.push(feature.jtbd);
  lines.push('');

  // Vocabulary
  if (content.terms.length > 0) {
    lines.push('## Vocabulary');
    content.terms.forEach(term => {
      lines.push(`### ${term.term}`);
      lines.push(term.definition);
      lines.push('');
    });
  }

  // Questions & Answers
  if (content.questionAnswers.length > 0) {
    lines.push('## Key Questions & Answers');
    content.questionAnswers.forEach(qa => {
      lines.push(`### ${qa.question}`);
      lines.push(`**Answer:** ${qa.answer}`);
      if (qa.reasoning) {
        lines.push('');
        lines.push(`**Reasoning:** ${qa.reasoning}`);
      }
      if (qa.sources.length > 0) {
        lines.push('');
        lines.push('**Sources:**');
        qa.sources.forEach(source => {
          lines.push(`- ${source}`);
        });
      }
      lines.push('');
    });
  }

  // PRD Sections
  if (sections && Array.isArray(sections)) {
    sections.forEach((section: { title?: string; content?: string }) => {
      if (section.title) {
        lines.push(`## ${section.title}`);
      }
      if (section.content) {
        lines.push(section.content);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Save markdown content to Google Docs
 */
async function saveToGoogleDocs(
  accessToken: string,
  title: string,
  content: string
): Promise<string> {
  // Initialize the OAuth2 client
  const auth = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });

  auth.setCredentials({
    access_token: accessToken,
  });

  // Initialize the Drive API
  const drive = google.drive({ version: 'v3', auth });

  // Create the document
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

  return url;
}
