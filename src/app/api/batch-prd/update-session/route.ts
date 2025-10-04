import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { BatchPRDSession, FeatureInput } from '@/types/knowledge';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { sessionId, features, status } = await request.json() as {
      sessionId: string;
      features?: FeatureInput[];
      status?: BatchPRDSession['status'];
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would update the session in a database
    // For now, we'll just return the updated session
    const updatedSession: Partial<BatchPRDSession> = {
      id: sessionId,
      updated_at: new Date().toISOString()
    };

    if (features) {
      updatedSession.features = features;
    }

    if (status) {
      updatedSession.status = status;
    }

    console.log(`[update-session] Updated batch session ${sessionId}`);

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error('[update-session] Error updating batch session:', error);
    return NextResponse.json(
      { error: 'Failed to update batch session' },
      { status: 500 }
    );
  }
});
