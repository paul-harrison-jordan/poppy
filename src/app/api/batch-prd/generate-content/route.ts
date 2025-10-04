import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { BatchPRDSession, PMPreferenceProfile } from '@/types/knowledge';
import { BatchPRDOrchestrator } from '@/orchestrators/BatchPRDOrchestrator';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  const startTime = Date.now();

  try {
    const { batchSession, pmProfile } = await request.json() as {
      batchSession: BatchPRDSession;
      pmProfile?: PMPreferenceProfile;
    };

    if (!batchSession || !batchSession.features || batchSession.features.length === 0) {
      return NextResponse.json(
        { error: 'Valid batch session with features is required' },
        { status: 400 }
      );
    }

    console.log(`[generate-content] Starting content generation for ${batchSession.features.length} features`);

    const orchestrator = new BatchPRDOrchestrator();
    const proposedContent = await orchestrator.generateBatchContent(batchSession, pmProfile);

    const totalTime = Date.now() - startTime;
    console.log(`[generate-content] Generated content for ${proposedContent.length} features in ${totalTime}ms`);

    return NextResponse.json({
      proposedContent,
      sessionId: batchSession.id
    });
  } catch (error) {
    console.error('[generate-content] Error generating batch content:', error);
    const totalTime = Date.now() - startTime;
    console.log(`[generate-content] Failed after ${totalTime}ms`);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
});
