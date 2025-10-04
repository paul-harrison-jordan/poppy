import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { ProposedContent, FeatureInput, PMPreferenceProfile } from '@/types/knowledge';
import { generateContent } from '@/lib/services/openaiService';
import { collectStream } from '@/lib/collectStream';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  const startTime = Date.now();

  try {
    const { features, proposedContent, pmProfile, teamTerms: localStorageTeamTerms, personalContext } = await request.json() as {
      features: FeatureInput[];
      proposedContent: ProposedContent[];
      pmProfile?: PMPreferenceProfile;
      teamTerms?: Record<string, string>;
      personalContext?: string;
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

    // Generate PRDs in parallel using the same flow as draft-prd
    const prdPromises = features.map(async (feature) => {
      const content = proposedContent.find(c => c.featureId === feature.id);
      if (!content) {
        console.error(`[generate-prds] No proposed content found for feature ${feature.id}`);
        return null;
      }

      try {
        console.log(`[generate-prds] Generating PRD for feature: ${feature.name}`);

        // Merge all vocabulary sources: localStorage + pmProfile + approved content
        const teamTerms: Record<string, string> = {
          ...localStorageTeamTerms,           // From localStorage (onboarding)
          ...pmProfile?.vocabulary_glossary,  // From PM profile
        };
        // Add newly approved terms (these take precedence)
        content.terms.filter(t => t.approved).forEach(term => {
          teamTerms[term.term] = term.definition;
        });

        const questions = content.questionAnswers
          .filter(qa => qa.approved)
          .map(qa => qa.question);

        const questionAnswers = content.questionAnswers
          .filter(qa => qa.approved)
          .map(qa => ({
            question: qa.question,
            reasoning: qa.reasoning,
            answer: qa.answer
          }));

        // Build comprehensive stored context from all sources as JSON (required by openaiService.ts line 97)
        let contextObj = {
          teamStrategy: '',
          examplesOfHowYouThink: '',
          pillarGoalsKeyTermsBackground: '',
          howYouThinkAboutProduct: ''
        };

        // Start with localStorage personal context (from onboarding)
        if (personalContext) {
          try {
            const parsedContext = JSON.parse(personalContext);
            contextObj = {
              teamStrategy: parsedContext.teamStrategy || '',
              examplesOfHowYouThink: parsedContext.examplesOfHowYouThink || '',
              pillarGoalsKeyTermsBackground: parsedContext.pillarGoalsKeyTermsBackground || '',
              howYouThinkAboutProduct: parsedContext.howYouThinkAboutProduct || ''
            };
          } catch (e) {
            console.error('[generate-prds] Failed to parse personalContext:', e);
          }
        }

        // Merge/override with PM profile context
        if (pmProfile?.personal_context?.teamStrategy) {
          contextObj.teamStrategy = pmProfile.personal_context.teamStrategy;
        }

        if (pmProfile?.product_philosophy || pmProfile?.personal_context?.examplesOfHowYouThink) {
          contextObj.examplesOfHowYouThink = [
            pmProfile?.product_philosophy,
            pmProfile?.personal_context?.examplesOfHowYouThink?.join('\n\n')
          ].filter(Boolean).join('\n\n');
        }

        if (pmProfile?.decision_frameworks?.frameworks?.length || pmProfile?.personal_context?.productVision) {
          contextObj.pillarGoalsKeyTermsBackground = [
            pmProfile?.decision_frameworks?.frameworks?.join('\n- '),
            pmProfile?.personal_context?.productVision
          ].filter(Boolean).join('\n\n');
        }

        const howYouThinkParts = [
          pmProfile?.recurring_themes?.join('\n- '),
          pmProfile?.trade_off_preferences ? `Trade-off Preferences:
- Speed vs Quality: ${pmProfile.trade_off_preferences.speedVsQuality}
- Risk Tolerance: ${pmProfile.trade_off_preferences.riskTolerance}
- User Focus: ${pmProfile.trade_off_preferences.userFocus}` : '',
          pmProfile?.personal_context?.productAreaPersonas ? (() => {
            const personas = pmProfile.personal_context.productAreaPersonas;
            const parts = [];
            if (personas.customerFacing) parts.push(`Customer-Facing: ${personas.customerFacing}`);
            if (personas.customerImpacting) parts.push(`Customer-Impacting: ${personas.customerImpacting}`);
            if (personas.infrastructure) parts.push(`Infrastructure: ${personas.infrastructure}`);
            return parts.length > 0 ? 'Product Area Personas:\n- ' + parts.join('\n- ') : '';
          })() : ''
        ].filter(Boolean).join('\n\n');

        if (howYouThinkParts) {
          contextObj.howYouThinkAboutProduct = howYouThinkParts;
        }

        const storedContext = JSON.stringify(contextObj);

        // Use the same generate-content API as draft-prd flow
        const contentResponse = await generateContent({
          type: 'prd',
          title: feature.name,
          query: feature.jtbd,
          teamTerms,
          storedContext,
          additionalContext: '',
          questions,
          questionAnswers,
          competitorUrls: []
        });

        // Collect the streamed markdown
        const markdown = await collectStream(contentResponse);

        // Extract title from markdown
        const titleMatch = markdown.match(/^# (.+)$/m);
        const finalTitle = titleMatch ? titleMatch[1] : `PRD: ${feature.name}`;

        // Save to Google Docs
        let googleDocUrl: string | undefined;
        let docId: string | undefined;

        if (session.accessToken) {
          try {
            console.log(`[generate-prds] Attempting to save PRD "${finalTitle}" to Google Docs...`);
            const docData = await saveToGoogleDocs(
              session.accessToken,
              finalTitle,
              markdown
            );
            googleDocUrl = docData.url;
            docId = docData.docId;
            console.log(`[generate-prds] ✓ Saved PRD to Google Docs: ${googleDocUrl}`);

            // Store PRD in database
            try {
              const prdRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/roadmap/prds`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': request.headers.get('cookie') || ''
                },
                body: JSON.stringify({
                  title: finalTitle,
                  driveLink: googleDocUrl,
                  description: feature.jtbd.substring(0, 200)
                })
              });

              if (prdRes.ok) {
                const prdData = await prdRes.json();
                console.log(`[generate-prds] PRD stored in database with ID: ${prdData.id}`);
              }
            } catch (dbError) {
              console.error(`[generate-prds] Failed to store PRD in database:`, dbError);
              // Non-critical, continue
            }
          } catch (docError) {
            console.error(`[generate-prds] ✗ Failed to save to Google Docs:`, docError);
            // Continue without saving to docs - not a critical error
          }
        } else {
          console.warn(`[generate-prds] ⚠ No access token available - skipping Google Docs save for "${finalTitle}". User may need to sign in with Google.`);
        }

        return {
          featureId: feature.id,
          featureName: feature.name,
          title: finalTitle,
          markdown,
          googleDocUrl,
          docId
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
 * Save markdown content to Google Docs
 */
async function saveToGoogleDocs(
  accessToken: string,
  title: string,
  content: string
): Promise<{ url: string; docId: string }> {
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

  return { url, docId };
}
